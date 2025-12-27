/**
 * POST /api/invites - Create Invite Endpoint
 * 
 * Creates a new invite to assign a role within an organization or club.
 * 
 * Request body:
 * - email: string (required) - Email of the person to invite
 * - role: InviteRole (required) - Role to assign (ORGANIZATION_OWNER | ORGANIZATION_ADMIN | CLUB_OWNER | CLUB_ADMIN)
 * - organizationId: string (required for org roles)
 * - clubId: string (required for club roles)
 * 
 * Security:
 * - Requires authentication
 * - Validates inviter permissions
 * - Enforces owner uniqueness
 * - Checks for duplicate active invites
 * - Generates secure random token
 * - Stores only hashed token
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { isValidEmail } from "@/lib/requireRole";
import {
  generateInviteToken,
  hashInviteToken,
  getInviteExpiration,
  normalizeEmail,
} from "@/lib/inviteUtils";
import {
  validateInvitePermissions,
  enforceOwnerUniqueness,
  checkExistingActiveInvite,
} from "@/lib/inviteHelpers";
import type { InviteRole } from "@prisma/client";

const VALID_INVITE_ROLES: InviteRole[] = [
  "ORGANIZATION_OWNER",
  "ORGANIZATION_ADMIN",
  "CLUB_OWNER",
  "CLUB_ADMIN",
];

export async function POST(request: Request) {
  // 1. Authenticate user
  const authResult = await requireAuth(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId, isRoot } = authResult;

  try {
    // 2. Parse and validate request body
    const body = await request.json();
    const { email, role, organizationId, clubId } = body;

    // Validate required fields
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    if (!role || !VALID_INVITE_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${VALID_INVITE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = normalizeEmail(email);

    // Validate email format
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate scope - either organization or club, never both
    const isOrgRole = role === "ORGANIZATION_OWNER" || role === "ORGANIZATION_ADMIN";
    const isClubRole = role === "CLUB_OWNER" || role === "CLUB_ADMIN";

    if (isOrgRole && !organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required for organization role invites" },
        { status: 400 }
      );
    }

    if (isClubRole && !clubId) {
      return NextResponse.json(
        { error: "Club ID is required for club role invites" },
        { status: 400 }
      );
    }

    if (organizationId && clubId) {
      return NextResponse.json(
        { error: "Invite cannot be for both organization and club" },
        { status: 400 }
      );
    }

    // 3. Validate inviter permissions
    const permissionCheck = await validateInvitePermissions(
      userId,
      isRoot,
      role,
      organizationId,
      clubId
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error || "Forbidden" },
        { status: 403 }
      );
    }

    // 4. Enforce owner uniqueness constraints
    const ownerCheck = await enforceOwnerUniqueness(role, organizationId, clubId);

    if (!ownerCheck.allowed) {
      return NextResponse.json(
        { error: ownerCheck.error || "Owner constraint violation" },
        { status: 409 }
      );
    }

    // 5. Check for existing active invite
    const existingInvite = await checkExistingActiveInvite(
      normalizedEmail,
      organizationId,
      clubId
    );

    if (existingInvite.exists) {
      return NextResponse.json(
        {
          error: "An active invite already exists for this email and scope",
          existingInviteId: existingInvite.invite?.id,
        },
        { status: 409 }
      );
    }

    // 6. Generate secure token
    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);

    // 7. Set expiration (7 days)
    const expiresAt = getInviteExpiration(7);

    // 8. Create invite
    const invite = await prisma.invite.create({
      data: {
        email: normalizedEmail,
        role,
        organizationId: organizationId || null,
        clubId: clubId || null,
        status: "PENDING",
        tokenHash,
        expiresAt,
        invitedByUserId: userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        clubId: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // 9. Return success response with token (ONLY returned once, never stored)
    return NextResponse.json(
      {
        success: true,
        invite: {
          ...invite,
          // Token is only returned on creation, never stored or retrievable again
          token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating invite:", error);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
