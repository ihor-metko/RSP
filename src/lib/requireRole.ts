import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Extended Request interface with authenticated user information.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  isRoot?: boolean;
}

/**
 * Middleware to require root admin access for API routes.
 * 
 * In the new role structure, global access is controlled by the isRoot field.
 * For organization/club-specific access, use requireOrganizationAdmin or requireClubAdmin.
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
 * @deprecated This function is deprecated. Use requireRootAdmin or requireAuth instead.
 * Kept for backward compatibility with archived features.
 * 
 * In the new role structure:
 * - Root admins are identified by isRoot=true
 * - Organization/club roles are context-specific via Membership/ClubMembership
 */
export async function requireRole(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: Request,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _allowedRoles: string[]
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

  // In the new system, root admins have access to everything
  // For backward compatibility, we treat isRoot as having all roles
  const userRole = session.user.isRoot ? "root_admin" : "player";

  return {
    authorized: true,
    userId: session.user.id,
    userRole,
  };
}
