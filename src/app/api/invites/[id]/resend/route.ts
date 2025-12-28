/**
 * POST /api/invites/[id]/resend - Resend Invite Email Endpoint
 * 
 * Resends an invite email for an existing, valid invite.
 * 
 * Security:
 * - Requires authentication
 * - Validates invite exists and is still valid (PENDING status, not expired)
 * - Only the original inviter, root admin, or org/club admin can resend
 * - Does not create duplicate invites
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { isInviteExpired } from "@/lib/inviteUtils";
import { sendInviteEmail } from "@/services/emailService";
import { canInviteToOrganization, canInviteToClub } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  // 1. Authenticate user
  const authResult = await requireAuth(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId, isRoot } = authResult;
  const { id: inviteId } = await params;

  try {
    // 2. Find the invite
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        clubId: true,
        status: true,
        expiresAt: true,
        tokenHash: true,
        invitedByUserId: true,
        organization: {
          select: {
            name: true,
          },
        },
        club: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // 3. Check if invite is still valid
    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cannot resend invite with status: ${invite.status}` },
        { status: 400 }
      );
    }

    if (isInviteExpired(invite.expiresAt)) {
      return NextResponse.json(
        { error: "This invite has expired and cannot be resent" },
        { status: 400 }
      );
    }

    // 4. Check permissions
    const user = { id: userId, isRoot };
    let hasPermission = false;

    // Original inviter can always resend
    if (userId === invite.invitedByUserId) {
      hasPermission = true;
    }

    // Root admin can always resend
    if (isRoot) {
      hasPermission = true;
    }

    // Check organization/club admin permissions
    if (!hasPermission) {
      if (invite.organizationId) {
        hasPermission = await canInviteToOrganization(
          user,
          invite.organizationId,
          invite.role
        );
      } else if (invite.clubId) {
        hasPermission = await canInviteToClub(
          user,
          invite.clubId,
          invite.role
        );
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You do not have permission to resend this invite" },
        { status: 403 }
      );
    }

    // 5. Build invite link (need to recreate from tokenHash)
    // Note: We can't retrieve the original token, so we need to generate a new one
    // and update the invite with the new tokenHash
    const newToken = crypto.randomBytes(32)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    
    const newTokenHash = crypto
      .createHash("sha256")
      .update(newToken)
      .digest("hex");

    // Update invite with new token
    await prisma.invite.update({
      where: { id: inviteId },
      data: { tokenHash: newTokenHash },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}/invites/accept?token=${newToken}`;

    // 6. Send invite email
    const emailResult = await sendInviteEmail({
      to: invite.email,
      inviteLink,
      role: invite.role,
      organizationName: invite.organization?.name,
      clubName: invite.club?.name,
      inviterName: invite.invitedBy?.name || undefined,
    });

    if (!emailResult.success) {
      console.error("Failed to resend invite email:", emailResult.error);
      return NextResponse.json(
        { error: "Failed to send invite email" },
        { status: 500 }
      );
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      message: "Invite email has been resent successfully",
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        // Return the new token so it can be used for testing
        token: newToken,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error resending invite:", error);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
