import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

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
