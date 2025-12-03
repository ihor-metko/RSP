import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { Roles } from "@/constants/roles";

/**
 * GET /api/admin/users/[userId]
 * 
 * Returns a single user with their club assignments.
 * Access: Root Admin only
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireRole(request, [Roles.RootAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        userClubs: {
          select: {
            id: true,
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only return users with Super Admin or Admin role
    if (![Roles.SuperAdmin, Roles.Admin].includes(user.role as typeof Roles.SuperAdmin | typeof Roles.Admin)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const transformedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      clubs: user.userClubs.map((uc) => ({
        id: uc.club.id,
        name: uc.club.name,
      })),
    };

    return NextResponse.json(transformedUser);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[userId]
 * 
 * Updates an existing user's details.
 * Access: Root Admin only
 * 
 * Body:
 * - name: User name (optional)
 * - email: User email (optional)
 * - role: User role (optional, must be super_admin or admin)
 * - clubIds: Array of club IDs to assign (optional)
 *   - super_admin: can be assigned to multiple clubs
 *   - admin: must be assigned to exactly one club
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireRole(request, [Roles.RootAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    const body = await request.json();
    const { name, email, role, clubIds } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userClubs: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow editing users with Super Admin or Admin role
    if (![Roles.SuperAdmin, Roles.Admin].includes(existingUser.role as typeof Roles.SuperAdmin | typeof Roles.Admin)) {
      return NextResponse.json(
        { error: "Can only edit Super Admin or Admin users" },
        { status: 403 }
      );
    }

    // Prevent Root Admin from downgrading themselves
    if (existingUser.role === Roles.RootAdmin) {
      return NextResponse.json(
        { error: "Cannot modify Root Admin" },
        { status: 403 }
      );
    }

    // Validate role if provided
    if (role && ![Roles.SuperAdmin, Roles.Admin].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'super_admin' or 'admin'" },
        { status: 400 }
      );
    }

    // Validate email uniqueness if changed
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Determine the effective role for club validation
    const effectiveRole = role || existingUser.role;

    // Validate club assignments if provided
    if (clubIds !== undefined) {
      if (!Array.isArray(clubIds) || clubIds.length === 0) {
        return NextResponse.json(
          { error: "At least one club must be assigned" },
          { status: 400 }
        );
      }

      // Admin can only be assigned to one club
      if (effectiveRole === Roles.Admin && clubIds.length > 1) {
        return NextResponse.json(
          { error: "Admin can only be assigned to a single club" },
          { status: 400 }
        );
      }

      // Validate that all provided clubIds exist
      const clubs = await prisma.club.findMany({
        where: { id: { in: clubIds } },
        select: { id: true },
      });

      if (clubs.length !== clubIds.length) {
        return NextResponse.json(
          { error: "One or more selected clubs do not exist" },
          { status: 400 }
        );
      }
    }

    // Update the user with club assignments in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Build update data
      const updateData: { name?: string; email?: string; role?: string } = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;

      // Update user data if there are changes
      const updated = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // Update club assignments if provided
      if (clubIds !== undefined) {
        // Delete existing assignments
        await tx.userClub.deleteMany({
          where: { userId },
        });

        // Create new assignments
        await tx.userClub.createMany({
          data: clubIds.map((clubId: string) => ({
            userId,
            clubId,
          })),
        });
      }

      // Fetch updated clubs
      const userClubs = await tx.userClub.findMany({
        where: { userId },
        include: {
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        ...updated,
        clubs: userClubs.map((uc) => ({
          id: uc.club.id,
          name: uc.club.name,
        })),
      };
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * 
 * Deletes a user.
 * Access: Root Admin only
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireRole(request, [Roles.RootAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const userId = resolvedParams.userId;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow deleting users with Super Admin or Admin role
    if (![Roles.SuperAdmin, Roles.Admin].includes(existingUser.role as typeof Roles.SuperAdmin | typeof Roles.Admin)) {
      return NextResponse.json(
        { error: "Can only delete Super Admin or Admin users" },
        { status: 403 }
      );
    }

    // Prevent deleting Root Admin
    if (existingUser.role === Roles.RootAdmin) {
      return NextResponse.json(
        { error: "Cannot delete Root Admin" },
        { status: 403 }
      );
    }

    // Delete the user (cascade will handle UserClub relations)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
