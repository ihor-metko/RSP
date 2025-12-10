import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin, isValidEmail } from "@/lib/requireRole";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";
import { MembershipRole } from "@/constants/roles";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";

/**
 * POST /api/orgs/[orgId]/reassign-superadmin
 * Reassign the primary owner (SuperAdmin) of an organization.
 * Root only OR existing owner with proper confirmation.
 * 
 * Payload: { userId?: string; email?: string; name?: string }
 * - userId: Existing user ID to make the new owner
 * - email/name: Create a new user and make them the owner (invite flow)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    // This operation requires Root admin
    const authResult = await requireRootAdmin(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { userId, email, name } = body;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const { mockReassignOwnerHandler } = await import("@/services/mockApiHandlers");
      try {
        const result = await mockReassignOwnerHandler({
          orgId,
          userId,
          email,
          name,
          actorId: authResult.userId,
        });
        return NextResponse.json(result);
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        return NextResponse.json(
          { error: err.message || "Internal server error" },
          { status: err.status || 500 }
        );
      }
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: {
            role: MembershipRole.ORGANIZATION_ADMIN,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if archived
    if (organization.archivedAt) {
      return NextResponse.json(
        { error: "Cannot modify archived organization" },
        { status: 400 }
      );
    }

    let targetUserId: string;
    let isNewUser = false;

    if (userId) {
      // Use existing user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      targetUserId = userId;
    } else if (email) {
      // Create new user or find existing by email
      const emailLower = email.toLowerCase().trim();

      if (!isValidEmail(emailLower)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: emailLower },
      });

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Create new user (invite flow)
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return NextResponse.json(
            { error: "Name is required for new user" },
            { status: 400 }
          );
        }

        const newUser = await prisma.user.create({
          data: {
            name: name.trim(),
            email: emailLower,
            // No password - user will receive invite
          },
        });

        targetUserId = newUser.id;
        isNewUser = true;
      }
    } else {
      return NextResponse.json(
        { error: "Either userId or email is required" },
        { status: 400 }
      );
    }

    // Find current primary owner
    const currentOwner = organization.memberships.find((m) => m.isPrimaryOwner);

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Remove isPrimaryOwner from current owner if exists
      if (currentOwner) {
        await tx.membership.update({
          where: { id: currentOwner.id },
          data: { isPrimaryOwner: false },
        });
      }

      // 2. Check if target user already has a membership
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId: orgId,
          },
        },
      });

      if (existingMembership) {
        // Update existing membership to be primary owner
        await tx.membership.update({
          where: { id: existingMembership.id },
          data: {
            role: MembershipRole.ORGANIZATION_ADMIN,
            isPrimaryOwner: true,
          },
        });
      } else {
        // Create new membership as primary owner
        await tx.membership.create({
          data: {
            userId: targetUserId,
            organizationId: orgId,
            role: MembershipRole.ORGANIZATION_ADMIN,
            isPrimaryOwner: true,
          },
        });
      }
    });

    // Fetch the new owner details
    const newOwner = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Create audit log
    await auditLog(
      authResult.userId,
      AuditAction.ORG_REASSIGN_OWNER,
      TargetType.ORGANIZATION,
      orgId,
      {
        previousOwnerId: currentOwner?.user.id,
        previousOwnerEmail: currentOwner?.user.email,
        newOwnerId: targetUserId,
        newOwnerEmail: newOwner?.email,
        isNewUser,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Primary owner reassigned successfully",
      previousOwner: currentOwner
        ? {
            id: currentOwner.user.id,
            name: currentOwner.user.name,
            email: currentOwner.user.email,
          }
        : null,
      newOwner,
      isNewUser,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error reassigning superadmin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
