import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import {
  requireUserViewPermission,
  getAllowedActions,
  UserViewPermission,
} from "@/lib/userPermissions";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetUserById } from "@/services/mockApiHandlers";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Get user details with role-scoped field projection.
 *
 * Authorization:
 * - RootAdmin: Full admin view (all non-sensitive metadata)
 * - OrganizationAdmin: View if user has membership or bookings in their org
 * - ClubAdmin: View if user has bookings in their club
 * - Other: 403 Forbidden
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockUser = await mockGetUserById(userId);
      if (!mockUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(mockUser);
    }

    // Check permission with role-scoped access
    const permissionResult = await requireUserViewPermission(userId);

    // If result is a NextResponse, authorization failed
    if (permissionResult instanceof NextResponse) {
      return permissionResult;
    }

    const permission = permissionResult as UserViewPermission;
    const { scope, organizationId, clubId } = permission;

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch data based on scope
    if (scope === "root") {
      return getRootProjection(userId);
    } else if (scope === "organization" && organizationId) {
      return getOrganizationProjection(userId, organizationId);
    } else if (scope === "club" && clubId) {
      return getClubProjection(userId, clubId);
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
 * Root admin projection - full access to non-sensitive metadata
 */
async function getRootProjection(userId: string) {
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
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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

  // Get audit summary
  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      targetType: "user",
      targetId: userId,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      actorId: true,
      action: true,
      detail: true,
      createdAt: true,
    },
  });

  const actions = getAllowedActions("root", true);

  return NextResponse.json({
    ...user,
    role,
    totalBookings: user._count.bookings,
    emailVerified: !!user.emailVerified,
    mfaEnabled: false, // Placeholder - MFA not implemented
    auditSummary: recentAuditLogs,
    viewScope: "root",
    allowedActions: actions,
  });
}

/**
 * Organization admin projection - scoped to organization context
 */
async function getOrganizationProjection(userId: string, organizationId: string) {
  // Get organization info for context label
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      blocked: true,
      memberships: {
        where: { organizationId },
        select: {
          id: true,
          role: true,
          isPrimaryOwner: true,
          organization: {
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

  // Get bookings in organization's clubs
  const bookingsInOrg = await prisma.booking.findMany({
    where: {
      userId,
      court: {
        club: {
          organizationId,
        },
      },
    },
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
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Get booking counts and last booking in org
  const bookingsCount = await prisma.booking.count({
    where: {
      userId,
      court: {
        club: {
          organizationId,
        },
      },
    },
  });

  const lastBooking = bookingsInOrg[0];

  const actions = getAllowedActions("organization", false);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.blocked ? "blocked" : "active",
    lastBookingAt_in_org: lastBooking?.start || null,
    bookingsCount_in_org: bookingsCount,
    roles_in_org: user.memberships.map((m) => m.role),
    recentBookings_in_org: bookingsInOrg,
    viewScope: "organization",
    viewContext: {
      type: "organization",
      id: organizationId,
      name: organization?.name,
    },
    allowedActions: actions,
  });
}

/**
 * Club admin projection - scoped to club context
 */
async function getClubProjection(userId: string, clubId: string) {
  // Get club info for context label
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      blocked: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get bookings in this club
  const bookingsInClub = await prisma.booking.findMany({
    where: {
      userId,
      court: {
        clubId,
      },
    },
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
        },
      },
    },
  });

  const lastBooking = bookingsInClub[0];

  const actions = getAllowedActions("club", false);

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.blocked ? "blocked" : "active",
    lastBookingAt_in_club: lastBooking?.start || null,
    bookings_in_club: bookingsInClub,
    viewScope: "club",
    viewContext: {
      type: "club",
      id: clubId,
      name: club?.name,
    },
    allowedActions: actions,
  });
}

/**
 * PATCH /api/admin/users/[userId]
 * Update user (block/unblock) - Root Admin only for now
 * For org-scoped blocking, use the /block and /unblock endpoints
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
      select: { id: true, isRoot: true, blocked: true },
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

    // Create audit log entry
    const action = blocked ? AuditAction.USER_BLOCK : AuditAction.USER_UNBLOCK;
    await auditLog(authResult.userId, action, TargetType.USER, userId, {
      previousBlocked: existingUser.blocked,
      newBlocked: blocked,
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
      select: { id: true, isRoot: true, email: true, name: true },
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

    // Create audit log entry
    await auditLog(authResult.userId, AuditAction.USER_DELETE, TargetType.USER, userId, {
      deletedUserEmail: existingUser.email,
      deletedUserName: existingUser.name,
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
