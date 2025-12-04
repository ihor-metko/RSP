import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Get detailed user information for Root Admin
 */
export async function GET(request: Request, { params }: RouteParams) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isRoot: true,
        blocked: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
        image: true,
        memberships: {
          select: {
            id: true,
            role: true,
            isPrimaryOwner: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        clubMemberships: {
          select: {
            id: true,
            role: true,
            club: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        bookings: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            start: true,
            end: true,
            status: true,
            createdAt: true,
            court: {
              select: {
                name: true,
                club: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        coaches: {
          select: {
            id: true,
            bio: true,
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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Determine primary role
    let role = "user";
    if (user.isRoot) {
      role = "root_admin";
    } else if (user.memberships.some((m) => m.role === "ORGANIZATION_ADMIN")) {
      role = "organization_admin";
    } else if (user.clubMemberships.some((m) => m.role === "CLUB_ADMIN")) {
      role = "club_admin";
    }

    return NextResponse.json({
      ...user,
      role,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching user details:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update user (block/unblock)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { userId } = await params;
    const body = await request.json();
    const { blocked } = body;

    // Validate request
    if (typeof blocked !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
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

    // Prevent blocking root admins
    if (existingUser.isRoot && blocked) {
      return NextResponse.json(
        { error: "Cannot block root admin" },
        { status: 403 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { blocked },
      select: {
        id: true,
        name: true,
        email: true,
        blocked: true,
      },
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
 * Delete a user (Root Admin only)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { userId } = await params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isRoot: true, email: true },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting root admins
    if (existingUser.isRoot) {
      return NextResponse.json(
        { error: "Cannot delete root admin" },
        { status: 403 }
      );
    }

    // Delete user (cascade will handle related records)
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
