import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/constants/roles";

/**
 * Extended Request interface with authenticated user information.
 * Use Roles enum values when checking userRole.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

/**
 * Middleware to require specific roles for API routes.
 * Always use Roles enum values in the allowedRoles array.
 *
 * @example
 * import { Roles } from "@/constants/roles";
 * const authResult = await requireRole(request, [Roles.SuperAdmin, Roles.Admin]);
 */
export async function requireRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<{ authorized: true; userId: string; userRole: UserRole } | { authorized: false; response: NextResponse }> {
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
  };
}
