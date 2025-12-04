import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * PATCH /api/admin/users/[userId]/role
 * Update user role (Root Admin only)
 * 
 * Supports:
 * - Promoting to organization admin (assign ORGANIZATION_ADMIN membership)
 * - Promoting to club admin (assign CLUB_ADMIN membership)
 * - Demoting to regular user (remove admin memberships)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { userId } = await params;
    const body = await request.json();
    const { role, organizationId, clubId } = body;

    // Validate role
    const validRoles = ["organization_admin", "club_admin", "user"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be one of: organization_admin, club_admin, user" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isRoot: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent modifying root admin roles
    if (existingUser.isRoot) {
      return NextResponse.json(
        { error: "Cannot modify root admin role" },
        { status: 403 }
      );
    }

    // Handle role change
    if (role === "organization_admin") {
      if (!organizationId) {
        return NextResponse.json(
          { error: "Organization ID is required for organization admin role" },
          { status: 400 }
        );
      }

      // Verify organization exists
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Create or update membership
      await prisma.membership.upsert({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
        update: {
          role: "ORGANIZATION_ADMIN",
        },
        create: {
          userId,
          organizationId,
          role: "ORGANIZATION_ADMIN",
        },
      });
    } else if (role === "club_admin") {
      if (!clubId) {
        return NextResponse.json(
          { error: "Club ID is required for club admin role" },
          { status: 400 }
        );
      }

      // Verify club exists
      const club = await prisma.club.findUnique({
        where: { id: clubId },
      });

      if (!club) {
        return NextResponse.json(
          { error: "Club not found" },
          { status: 404 }
        );
      }

      // Create or update club membership
      await prisma.clubMembership.upsert({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
        update: {
          role: "CLUB_ADMIN",
        },
        create: {
          userId,
          clubId,
          role: "CLUB_ADMIN",
        },
      });
    } else if (role === "user") {
      // Remove all admin memberships
      await prisma.$transaction([
        prisma.membership.deleteMany({
          where: {
            userId,
            role: "ORGANIZATION_ADMIN",
          },
        }),
        prisma.clubMembership.deleteMany({
          where: {
            userId,
            role: "CLUB_ADMIN",
          },
        }),
      ]);
    }

    // Fetch updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isRoot: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        clubMemberships: {
          select: {
            role: true,
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Determine new role
    let newRole = "user";
    if (updatedUser?.isRoot) {
      newRole = "root_admin";
    } else if (updatedUser?.memberships.some((m) => m.role === "ORGANIZATION_ADMIN")) {
      newRole = "organization_admin";
    } else if (updatedUser?.clubMemberships.some((m) => m.role === "CLUB_ADMIN")) {
      newRole = "club_admin";
    }

    return NextResponse.json({
      ...updatedUser,
      role: newRole,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating user role:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
