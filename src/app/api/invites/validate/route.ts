/**
 * GET /api/invites/validate - Validate Invite Token Endpoint
 * 
 * Validates an invite token without accepting it.
 * Returns invite metadata (role, scope) if valid.
 * 
 * Query parameters:
 * - token: string (required) - The invite token to validate
 * 
 * Security:
 * - No authentication required (public endpoint)
 * - Validates token using constant-time comparison
 * - Checks expiration
 * - Checks status
 * - Does NOT accept or modify the invite
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashInviteToken, isInviteExpired, verifyInviteToken } from "@/lib/inviteUtils";

export async function GET(request: Request) {
  try {
    // 1. Extract token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // 2. Hash the token to look up in database
    const tokenHash = hashInviteToken(token);

    // 3. Find invite by token hash
    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        clubId: true,
        status: true,
        expiresAt: true,
        tokenHash: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    // 4. Verify token using constant-time comparison
    if (!verifyInviteToken(token, invite.tokenHash)) {
      return NextResponse.json(
        { error: "Invalid invite token" },
        { status: 404 }
      );
    }

    // 5. Check if already accepted
    if (invite.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "This invite has already been accepted" },
        { status: 410 }
      );
    }

    // 6. Check if revoked
    if (invite.status === "REVOKED") {
      return NextResponse.json(
        { error: "This invite has been revoked" },
        { status: 410 }
      );
    }

    // 7. Check if expired (status or timestamp)
    if (invite.status === "EXPIRED" || isInviteExpired(invite.expiresAt)) {
      // Auto-update status to EXPIRED if not already
      if (invite.status !== "EXPIRED") {
        await prisma.invite.update({
          where: { id: invite.id },
          data: { status: "EXPIRED" },
        });
      }

      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 }
      );
    }

    // 8. Return invite metadata (without tokenHash)
    return NextResponse.json({
      valid: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        organizationId: invite.organizationId,
        organization: invite.organization,
        clubId: invite.clubId,
        club: invite.club,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error validating invite:", error);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
