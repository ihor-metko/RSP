import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";
import type { ChangeAdminRolePayload } from "@/types/unifiedAdmin";

/**
 * PATCH /api/admin/admins/role
 * Unified endpoint to change an admin's role in any container (organization or club)
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

    const body: ChangeAdminRolePayload = await request.json();
    const { containerType, containerId, userId, newRole } = body;

    // Validate input
    if (!containerType || !containerId || !userId || !newRole) {
      return NextResponse.json(
        { error: "containerType, containerId, userId, and newRole are required" },
        { status: 400 }
      );
    }

    if (containerType !== "organization" && containerType !== "club") {
      return NextResponse.json(
        { error: "Invalid containerType. Must be 'organization' or 'club'" },
        { status: 400 }
      );
    }

    const isRoot = session.user.isRoot ?? false;

    if (containerType === "organization") {
      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: containerId },
      });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Primary Owner
      if (!isRoot) {
        const currentUserMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: containerId,
            },
          },
        });

        if (
          !currentUserMembership ||
          currentUserMembership.role !== MembershipRole.ORGANIZATION_ADMIN ||
          !currentUserMembership.isPrimaryOwner
        ) {
          return NextResponse.json(
            { error: "Only Root Admin or Organization Owner can change admin roles" },
            { status: 403 }
          );
        }
      }

      // Find the membership to update
      const targetMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: containerId,
          },
        },
      });

      if (!targetMembership || targetMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
        return NextResponse.json(
          { error: "User is not an admin of this organization" },
          { status: 400 }
        );
      }

      const shouldBePrimaryOwner = newRole === "ORGANIZATION_OWNER";

      // If promoting to primary owner, demote all others
      if (shouldBePrimaryOwner) {
        await prisma.membership.updateMany({
          where: {
            organizationId: containerId,
            role: MembershipRole.ORGANIZATION_ADMIN,
            isPrimaryOwner: true,
          },
          data: { isPrimaryOwner: false },
        });
      }

      // Update the membership
      await prisma.membership.update({
        where: { id: targetMembership.id },
        data: {
          isPrimaryOwner: shouldBePrimaryOwner,
        },
      });
    } else {
      // containerType === "club"
      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { id: containerId },
        select: { id: true, organizationId: true },
      });

      if (!club) {
        return NextResponse.json(
          { error: "Club not found" },
          { status: 404 }
        );
      }

      // Check permissions: Root or Organization Admin
      if (!isRoot && club.organizationId) {
        const orgMembership = await prisma.membership.findUnique({
          where: {
            userId_organizationId: {
              userId: session.user.id,
              organizationId: club.organizationId,
            },
          },
        });

        if (!orgMembership || orgMembership.role !== MembershipRole.ORGANIZATION_ADMIN) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }
      }

      // Find the membership to update
      const targetMembership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId: containerId,
          },
        },
      });

      if (
        !targetMembership ||
        (targetMembership.role !== ClubMembershipRole.CLUB_OWNER &&
          targetMembership.role !== ClubMembershipRole.CLUB_ADMIN)
      ) {
        return NextResponse.json(
          { error: "User is not an admin of this club" },
          { status: 400 }
        );
      }

      const clubRole = newRole === "CLUB_OWNER" ? ClubMembershipRole.CLUB_OWNER : ClubMembershipRole.CLUB_ADMIN;

      // Update the club membership
      await prisma.clubMembership.update({
        where: { id: targetMembership.id },
        data: { role: clubRole },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Admin role changed successfully",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error changing admin role:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
