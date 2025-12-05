import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * Extended Request interface with authenticated user information.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  isRoot?: boolean;
}

/**
 * Context types for role-based access control.
 */
export type ContextType = "organization" | "club";

/**
 * Allowed roles that can be checked - combines organization and club roles.
 */
export type AllowedRole = MembershipRole | ClubMembershipRole;

/**
 * Options for the universal role check function.
 */
export interface RequireRoleOptions {
  /**
   * The context type for the role check.
   * - "organization": Check Membership table for organization-specific roles
   * - "club": Check ClubMembership table for club-specific roles
   */
  contextType: ContextType;
  
  /**
   * The ID of the context (organizationId or clubId).
   */
  contextId: string;
  
  /**
   * Array of allowed roles for this action.
   * The user must have at least one of these roles.
   */
  allowedRoles: AllowedRole[];
}

/**
 * Success result type for role check.
 */
export interface RoleCheckSuccess {
  authorized: true;
  userId: string;
  isRoot: boolean;
  userRole: AllowedRole | "root_admin";
}

/**
 * Failure result type for role check.
 */
export interface RoleCheckFailure {
  authorized: false;
  response: NextResponse;
}

/**
 * Result type for role check functions.
 */
export type RoleCheckResult = RoleCheckSuccess | RoleCheckFailure;

/**
 * Universal role-based access control function.
 * 
 * This function provides centralized authorization for all admin types:
 * - Root Admin: Automatically allowed access (isRoot=true)
 * - Organization Admin: Checked via Membership table
 * - Club Admin: Checked via ClubMembership table
 * 
 * @param options - The role check options
 * @returns Promise resolving to authorized status with user info or error response
 * 
 * @example
 * // Check organization admin access
 * const authResult = await requireRole({
 *   contextType: "organization",
 *   contextId: organizationId,
 *   allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
 * });
 * if (!authResult.authorized) return authResult.response;
 * 
 * @example
 * // Check club admin access
 * const authResult = await requireRole({
 *   contextType: "club",
 *   contextId: clubId,
 *   allowedRoles: [ClubMembershipRole.CLUB_ADMIN],
 * });
 * if (!authResult.authorized) return authResult.response;
 */
export async function requireRole(
  options: RequireRoleOptions
): Promise<RoleCheckResult> {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Root admins automatically have access to everything
  if (isRoot) {
    return {
      authorized: true,
      userId,
      isRoot: true,
      userRole: "root_admin",
    };
  }

  const { contextType, contextId, allowedRoles } = options;

  // Check role based on context type
  if (contextType === "organization") {
    // Check Membership table for organization role
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: contextId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        ),
      };
    }

    // Check if user's role is in allowed roles
    const userRole = membership.role as MembershipRole;
    if (!allowedRoles.includes(userRole)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId,
      isRoot: false,
      userRole,
    };
  }

  if (contextType === "club") {
    // Check ClubMembership table for club role
    const clubMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId,
          clubId: contextId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!clubMembership) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        ),
      };
    }

    // Check if user's role is in allowed roles
    const userRole = clubMembership.role as ClubMembershipRole;
    if (!allowedRoles.includes(userRole)) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId,
      isRoot: false,
      userRole,
    };
  }

  // Unknown context type - should never happen with TypeScript
  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    ),
  };
}

/**
 * Middleware to require root admin access for API routes.
 * 
 * In the new role structure, global access is controlled by the isRoot field.
 * For organization/club-specific access, use requireRole with appropriate context.
 *
 * @example
 * const authResult = await requireRootAdmin(request);
 * if (!authResult.authorized) return authResult.response;
 */
export async function requireRootAdmin(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: Request
): Promise<{ authorized: true; userId: string } | { authorized: false; response: NextResponse }> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!session.user.isRoot) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: session.user.id,
  };
}

/**
 * Middleware to require authenticated user for API routes.
 * This only checks if the user is authenticated, not their role.
 *
 * @example
 * const authResult = await requireAuth(request);
 * if (!authResult.authorized) return authResult.response;
 */
export async function requireAuth(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: Request
): Promise<{ authorized: true; userId: string; isRoot: boolean } | { authorized: false; response: NextResponse }> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    userId: session.user.id,
    isRoot: session.user.isRoot ?? false,
  };
}

/**
 * Helper function to require organization admin access.
 * Convenience wrapper around requireRole for organization context.
 * 
 * @param organizationId - The organization ID to check access for
 * @param allowedRoles - Optional custom allowed roles (defaults to ORGANIZATION_ADMIN only)
 * @returns Promise resolving to authorized status with user info or error response
 * 
 * @example
 * const authResult = await requireOrganizationAdmin(organizationId);
 * if (!authResult.authorized) return authResult.response;
 */
export async function requireOrganizationAdmin(
  organizationId: string,
  allowedRoles: MembershipRole[] = [MembershipRole.ORGANIZATION_ADMIN]
): Promise<RoleCheckResult> {
  return requireRole({
    contextType: "organization",
    contextId: organizationId,
    allowedRoles,
  });
}

/**
 * Helper function to require club admin access.
 * Convenience wrapper around requireRole for club context.
 * 
 * @param clubId - The club ID to check access for
 * @param allowedRoles - Optional custom allowed roles (defaults to CLUB_ADMIN only)
 * @returns Promise resolving to authorized status with user info or error response
 * 
 * @example
 * const authResult = await requireClubAdmin(clubId);
 * if (!authResult.authorized) return authResult.response;
 */
export async function requireClubAdmin(
  clubId: string,
  allowedRoles: ClubMembershipRole[] = [ClubMembershipRole.CLUB_ADMIN]
): Promise<RoleCheckResult> {
  return requireRole({
    contextType: "club",
    contextId: clubId,
    allowedRoles,
  });
}

/**
 * @deprecated Legacy function for backward compatibility with archived features.
 * Use the new requireRole(options) function instead for new code.
 * 
 * This function provides the old API signature:
 * - If isRoot=true → user has "root_admin" role (allowed for super_admin/root_admin routes)
 * - If isRoot=false → user has "player" role (check against allowedRoles)
 * 
 * For proper context-based authorization, use:
 * - requireRole({ contextType, contextId, allowedRoles }) for context-specific checks
 * - requireRootAdmin() for root admin access
 * - requireAuth() for authenticated-only access
 */
export async function requireRoleLegacy(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: Request,
  allowedRoles: string[]
): Promise<{ authorized: true; userId: string; userRole: string } | { authorized: false; response: NextResponse }> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // In legacy mode, root admins have access to everything
  // Root admins can access routes requiring "super_admin", "root_admin", etc.
  if (session.user.isRoot) {
    return {
      authorized: true,
      userId: session.user.id,
      userRole: "root_admin",
    };
  }

  // For non-root users, check if "player" is in allowed roles
  const userRole = "player";
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: session.user.id,
    userRole,
  };
}

/**
 * Admin type enumeration for the unified admin check.
 */
export type AdminType = "root_admin" | "organization_admin" | "club_admin";

/**
 * Success result type for any admin check.
 */
export interface AnyAdminCheckSuccess {
  authorized: true;
  userId: string;
  isRoot: boolean;
  adminType: AdminType;
  /**
   * For organization admins, the organization IDs they manage.
   * For club admins, the club IDs they manage.
   * For root admins, this is empty (they have access to all).
   */
  managedIds: string[];
}

/**
 * Failure result type for any admin check.
 */
export interface AnyAdminCheckFailure {
  authorized: false;
  response: NextResponse;
}

/**
 * Result type for any admin check.
 */
export type AnyAdminCheckResult = AnyAdminCheckSuccess | AnyAdminCheckFailure;

/**
 * Check if the current user has any admin role.
 * 
 * This function checks for:
 * - Root Admin: user.isRoot = true
 * - Organization Admin: Has ORGANIZATION_ADMIN role in any Membership
 * - Club Admin: Has CLUB_ADMIN role in any ClubMembership
 * 
 * Use this function when you need to allow access to any type of admin
 * without requiring a specific context (e.g., for the admin dashboard).
 * 
 * @returns Promise resolving to authorized status with admin info or error response
 * 
 * @example
 * const authResult = await requireAnyAdmin(request);
 * if (!authResult.authorized) return authResult.response;
 * // User is some type of admin
 */
export async function requireAnyAdmin(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: Request
): Promise<AnyAdminCheckResult> {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Root admins automatically have access
  if (isRoot) {
    return {
      authorized: true,
      userId,
      isRoot: true,
      adminType: "root_admin",
      managedIds: [],
    };
  }

  // Check if user is an organization admin
  const organizationMemberships = await prisma.membership.findMany({
    where: {
      userId,
      role: MembershipRole.ORGANIZATION_ADMIN,
    },
    select: {
      organizationId: true,
    },
  });

  if (organizationMemberships.length > 0) {
    return {
      authorized: true,
      userId,
      isRoot: false,
      adminType: "organization_admin",
      managedIds: organizationMemberships.map((m) => m.organizationId),
    };
  }

  // Check if user is a club admin
  const clubMemberships = await prisma.clubMembership.findMany({
    where: {
      userId,
      role: ClubMembershipRole.CLUB_ADMIN,
    },
    select: {
      clubId: true,
    },
  });

  if (clubMemberships.length > 0) {
    return {
      authorized: true,
      userId,
      isRoot: false,
      adminType: "club_admin",
      managedIds: clubMemberships.map((m) => m.clubId),
    };
  }

  // User is not an admin of any type
  return {
    authorized: false,
    response: NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    ),
  };
}

/**
 * Success result type for club admin management permission check.
 */
export interface ClubAdminManagementSuccess {
  authorized: true;
  userId: string;
  isRoot: boolean;
}

/**
 * Failure result type for club admin management permission check.
 */
export interface ClubAdminManagementFailure {
  authorized: false;
  response: NextResponse;
}

/**
 * Result type for club admin management permission check.
 */
export type ClubAdminManagementResult = ClubAdminManagementSuccess | ClubAdminManagementFailure;

/**
 * Check if the current user has permission to manage club admins for an organization.
 * 
 * This function allows:
 * - Root Admin: Can manage club admins for any organization
 * - Organization Admin: Can manage club admins only within their organization
 * 
 * @param organizationId - The organization ID to check access for
 * @returns Promise resolving to authorized status with user info or error response
 * 
 * @example
 * const authResult = await requireClubAdminManagement(organizationId);
 * if (!authResult.authorized) return authResult.response;
 */
export async function requireClubAdminManagement(
  organizationId: string
): Promise<ClubAdminManagementResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Root admins can manage club admins for any organization
  if (isRoot) {
    return { authorized: true, userId, isRoot: true };
  }

  // Check if user is an Organization Admin for this organization
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership || membership.role !== MembershipRole.ORGANIZATION_ADMIN) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authorized: true, userId, isRoot: false };
}

/**
 * Validate email format.
 * @param email - The email to validate
 * @returns true if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
