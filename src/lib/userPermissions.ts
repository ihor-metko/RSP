import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * View scope for user data projection.
 */
export type UserViewScope = "root" | "organization" | "club";

/**
 * Result of the canViewUser check.
 */
export interface UserViewPermission {
  allowed: boolean;
  scope?: UserViewScope;
  /** For org scope, the organization ID */
  organizationId?: string;
  /** For club scope, the club ID */
  clubId?: string;
  /** Caller user ID */
  callerId?: string;
  /** Whether caller is root admin */
  isRoot?: boolean;
}

/**
 * Context for user view permission check.
 * If provided, restricts check to specific org or club.
 */
export interface UserViewContext {
  organizationId?: string;
  clubId?: string;
}

/**
 * Centralized function to check if caller can view a target user.
 * Determines the projection scope based on caller's role and relationship.
 *
 * Authorization rules:
 * - RootAdmin: Can view any user with full "root" projection
 * - OrganizationAdmin: Can view users who have bookings or membership in their org
 * - ClubAdmin: Can view users who have bookings in their club
 *
 * @param targetUserId - The ID of the user to be viewed
 * @param context - Optional context to restrict the check to specific org/club
 * @returns Permission result with scope and context IDs
 */
export async function canViewUser(
  targetUserId: string,
  context?: UserViewContext
): Promise<UserViewPermission> {
  const session = await auth();

  if (!session?.user) {
    return { allowed: false };
  }

  const callerId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Root admins can view any user with full projection
  if (isRoot) {
    return {
      allowed: true,
      scope: "root",
      callerId,
      isRoot: true,
    };
  }

  // Check if caller is an organization admin
  const orgMemberships = await prisma.membership.findMany({
    where: {
      userId: callerId,
      role: "ORGANIZATION_ADMIN",
    },
    select: {
      organizationId: true,
    },
  });

  if (orgMemberships.length > 0) {
    const orgIds = orgMemberships.map((m) => m.organizationId);

    // If context specifies an organization, check only that one
    const orgsToCheck = context?.organizationId
      ? orgIds.filter((id) => id === context.organizationId)
      : orgIds;

    if (orgsToCheck.length > 0) {
      // Check if target user has membership in any of the caller's organizations
      const targetMembership = await prisma.membership.findFirst({
        where: {
          userId: targetUserId,
          organizationId: { in: orgsToCheck },
        },
        select: {
          organizationId: true,
        },
      });

      if (targetMembership) {
        return {
          allowed: true,
          scope: "organization",
          organizationId: targetMembership.organizationId,
          callerId,
          isRoot: false,
        };
      }

      // Check if target user has bookings in any club of the caller's organizations
      const targetBooking = await prisma.booking.findFirst({
        where: {
          userId: targetUserId,
          court: {
            club: {
              organizationId: { in: orgsToCheck },
            },
          },
        },
        select: {
          court: {
            select: {
              club: {
                select: {
                  organizationId: true,
                },
              },
            },
          },
        },
      });

      if (targetBooking && targetBooking.court.club.organizationId) {
        return {
          allowed: true,
          scope: "organization",
          organizationId: targetBooking.court.club.organizationId,
          callerId,
          isRoot: false,
        };
      }
    }
  }

  // Check if caller is a club admin
  const clubMemberships = await prisma.clubMembership.findMany({
    where: {
      userId: callerId,
      role: "CLUB_ADMIN",
    },
    select: {
      clubId: true,
    },
  });

  if (clubMemberships.length > 0) {
    const clubIds = clubMemberships.map((m) => m.clubId);

    // If context specifies a club, check only that one
    const clubsToCheck = context?.clubId
      ? clubIds.filter((id) => id === context.clubId)
      : clubIds;

    if (clubsToCheck.length === 0) {
      // Caller is not admin of the specified club
      return { allowed: false };
    }

    // Check if target user has bookings in any of the caller's clubs
    const targetBooking = await prisma.booking.findFirst({
      where: {
        userId: targetUserId,
        court: {
          clubId: { in: clubsToCheck },
        },
      },
      select: {
        court: {
          select: {
            clubId: true,
          },
        },
      },
    });

    if (targetBooking) {
      return {
        allowed: true,
        scope: "club",
        clubId: targetBooking.court.clubId,
        callerId,
        isRoot: false,
      };
    }
  }

  return { allowed: false };
}

/**
 * Middleware helper to require user view permission.
 * Returns a NextResponse if not authorized, or the permission result if allowed.
 *
 * @param targetUserId - The ID of the user to be viewed
 * @param context - Optional context to restrict the check to specific org/club
 * @returns Either a NextResponse (unauthorized) or UserViewPermission (authorized)
 */
export async function requireUserViewPermission(
  targetUserId: string,
  context?: UserViewContext
): Promise<UserViewPermission | NextResponse> {
  const permission = await canViewUser(targetUserId, context);

  if (!permission.allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return permission;
}

/**
 * Get allowed actions for caller based on their scope.
 *
 * @param scope - The viewer's scope
 * @param isRoot - Whether the caller is a root admin
 */
export function getAllowedActions(
  scope: UserViewScope,
  isRoot: boolean
): {
  canBlock: boolean;
  canUnblock: boolean;
  canDelete: boolean;
  canEditRole: boolean;
  canImpersonate: boolean;
} {
  if (isRoot) {
    return {
      canBlock: true,
      canUnblock: true,
      canDelete: true,
      canEditRole: true,
      canImpersonate: true, // Root-only action
    };
  }

  if (scope === "organization") {
    return {
      canBlock: true, // Org-scoped block only
      canUnblock: true, // Org-scoped unblock only
      canDelete: false,
      canEditRole: false,
      canImpersonate: false,
    };
  }

  // Club admins have very limited actions
  return {
    canBlock: false,
    canUnblock: false,
    canDelete: false,
    canEditRole: false,
    canImpersonate: false,
  };
}

/**
 * Check if caller can block/unblock a user.
 * RootAdmin: Can block globally
 * OrganizationAdmin: Can block for their organization scope only
 * ClubAdmin: Cannot block
 */
export async function canBlockUser(
  targetUserId: string
): Promise<{
  allowed: boolean;
  scope?: "global" | "organization";
  organizationId?: string;
  callerId?: string;
}> {
  const session = await auth();

  if (!session?.user) {
    return { allowed: false };
  }

  const callerId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Root admins can block globally
  if (isRoot) {
    return {
      allowed: true,
      scope: "global",
      callerId,
    };
  }

  // Check if caller is an organization admin
  const orgMemberships = await prisma.membership.findMany({
    where: {
      userId: callerId,
      role: "ORGANIZATION_ADMIN",
    },
    select: {
      organizationId: true,
    },
  });

  if (orgMemberships.length > 0) {
    const orgIds = orgMemberships.map((m) => m.organizationId);

    // Check if target user has relationship with any of the caller's organizations
    const targetMembership = await prisma.membership.findFirst({
      where: {
        userId: targetUserId,
        organizationId: { in: orgIds },
      },
      select: {
        organizationId: true,
      },
    });

    if (targetMembership) {
      return {
        allowed: true,
        scope: "organization",
        organizationId: targetMembership.organizationId,
        callerId,
      };
    }

    // Check if target has bookings in caller's org's clubs
    const targetBooking = await prisma.booking.findFirst({
      where: {
        userId: targetUserId,
        court: {
          club: {
            organizationId: { in: orgIds },
          },
        },
      },
      select: {
        court: {
          select: {
            club: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });

    if (targetBooking && targetBooking.court.club.organizationId) {
      return {
        allowed: true,
        scope: "organization",
        organizationId: targetBooking.court.club.organizationId,
        callerId,
      };
    }
  }

  return { allowed: false };
}
