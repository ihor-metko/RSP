import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MembershipRole } from "@/constants/roles";

/**
 * PATCH /api/admin/organizations/set-owner
 * Sets a SuperAdmin as the primary owner of an organization.
 * Only Root Admin or current Primary Owner can perform this action.
 */
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId, userId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    // If not root, check if the current user is the primary owner
    if (!isRoot) {
      const currentUserMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: session.user.id,
            organizationId,
          },
        },
      });

      if (
        !currentUserMembership ||
        currentUserMembership.role !== MembershipRole.ORGANIZATION_ADMIN ||
        !currentUserMembership.isPrimaryOwner
      ) {
        return NextResponse.json(
          { error: "Only Root Admin or Organization Owner can transfer ownership" },
          { status: 403 }
        );
      }
    }

    // Verify target user is a SuperAdmin of this organization
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!targetMembership || targetMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
      return NextResponse.json(
        { error: "Target user must be a SuperAdmin of this organization" },
        { status: 400 }
      );
    }

    // If already primary owner, nothing to do
    if (targetMembership.isPrimaryOwner) {
      return NextResponse.json(
        { error: "User is already the primary owner" },
        { status: 400 }
      );
    }

    // Use transaction to ensure consistency
    await prisma.$transaction([
      // Remove primary owner status from current owner
      prisma.membership.updateMany({
        where: {
          organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: true,
        },
        data: { isPrimaryOwner: false },
      }),
      // Set new primary owner
      prisma.membership.update({
        where: { id: targetMembership.id },
        data: { isPrimaryOwner: true },
      }),
    ]);

    // Fetch updated user info
    const newOwner = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Primary owner updated successfully",
        newOwner,
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error setting primary owner:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
