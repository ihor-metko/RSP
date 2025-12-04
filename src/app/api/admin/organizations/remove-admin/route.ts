import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MembershipRole } from "@/constants/roles";

/**
 * POST /api/admin/organizations/remove-admin
 * Removes a SuperAdmin from an organization.
 * Only Root Admin or current Primary Owner can perform this action.
 * Cannot remove the primary owner unless they are the last admin.
 */
export async function POST(request: Request) {
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
          { error: "Only Root Admin or Organization Owner can remove SuperAdmins" },
          { status: 403 }
        );
      }

      // Prevent owner from removing themselves
      if (userId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot remove yourself as owner. Transfer ownership first." },
          { status: 400 }
        );
      }
    }

    // Find the membership to remove
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
        { error: "User is not a SuperAdmin of this organization" },
        { status: 400 }
      );
    }

    // Check if this is the primary owner
    if (targetMembership.isPrimaryOwner) {
      // Count remaining admins
      const adminCount = await prisma.membership.count({
        where: {
          organizationId,
          role: MembershipRole.ORGANIZATION_ADMIN,
        },
      });

      // Cannot remove primary owner if there are other admins - must transfer ownership first
      if (adminCount > 1) {
        return NextResponse.json(
          { error: "Cannot remove the primary owner. Transfer ownership first." },
          { status: 400 }
        );
      }
      // If only one admin remains (the owner), they can be removed
    }

    // Delete the membership
    await prisma.membership.delete({
      where: { id: targetMembership.id },
    });

    return NextResponse.json(
      {
        success: true,
        message: "SuperAdmin removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error removing SuperAdmin:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
