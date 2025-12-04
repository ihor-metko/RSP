import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/constants/roles";

/**
 * Extended Request interface with authenticated user information.
 * 
 * @deprecated For new code, use isRoot check for root admin access,
 * or check Membership/ClubMembership for context-specific permissions.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
  isRoot?: boolean;
}

/**
 * Middleware to require specific roles for API routes.
 * 
 * @deprecated This uses the legacy role system. For new code, prefer:
 * - Use session.user.isRoot for root admin checks
 * - Query Membership table for organization-level permissions
 * - Query ClubMembership table for club-level permissions
 *
 * @example
 * import { Roles } from "@/constants/roles";
 * const authResult = await requireRole(request, [Roles.SuperAdmin, Roles.Admin]);
 */
export async function requireRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<{ authorized: true; userId: string; userRole: UserRole; isRoot: boolean } | { authorized: false; response: NextResponse }> {
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

  const userRole = session.user.role;
  const isRoot = session.user.isRoot ?? false;

  // Root admins always have access (they have global permissions)
  // We return "root_admin" as the role for backward compatibility
  if (isRoot) {
    return {
      authorized: true,
      userId: session.user.id,
      userRole: "root_admin" as UserRole,
      isRoot: true,
    };
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
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
    isRoot: false,
  };
}

/**
 * Check if the current user is a root admin.
 * Root admins have global access to all platform features.
 */
export async function requireRootAdmin(): Promise<{ authorized: true; userId: string } | { authorized: false; response: NextResponse }> {
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
        { error: "Forbidden - Root admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: session.user.id,
  };
}
