import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserAdminStatus, getAdminHomepage } from "@/utils/roleRedirect";

interface AuthRequest extends NextRequest {
  auth: {
    user?: {
      id: string;
      email?: string | null;
      name?: string | null;
      isRoot?: boolean;
    };
  } | null;
}

/**
 * Middleware to redirect admin users from public-facing pages.
 * 
 * Uses centralized role-checking utilities from @/utils/roleRedirect which follow
 * the unified authorization model.
 *
 * Protected routes:
 * - "/" (landing page): Admins redirected to their dashboard
 * - "/docs/for-clubs/**" (public documentation): Admins redirected to their dashboard
 *
 * - Unauthenticated users: See public content
 * - Regular users (non-admin): See public content
 * - Root admin users (isRoot=true): Redirected to /admin/dashboard
 * - Organization admins: Redirected to /admin/dashboard
 * - Club admins: Redirected to /admin/dashboard
 */
export default auth(async (req: AuthRequest) => {
  try {
    const { pathname } = req.nextUrl;

    // Apply to root path and public documentation
    const isRootPath = pathname === "/";
    const isDocsPath = pathname.startsWith("/docs/for-clubs");
    
    if (!isRootPath && !isDocsPath) {
      return NextResponse.next();
    }

    const session = req.auth;

    // If no session, allow public access
    if (!session?.user) {
      return NextResponse.next();
    }

    const userId = session.user.id;
    const isRoot = session.user.isRoot ?? false;

    // Check if user has any admin role (root, organization, or club)
    const adminStatus = await checkUserAdminStatus(userId, isRoot);

    // If user is any type of admin, redirect to admin dashboard
    if (adminStatus.isAdmin) {
      const adminHomepage = getAdminHomepage(adminStatus.adminType);
      const redirectUrl = new URL(adminHomepage, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Non-admin authenticated users see the public content
    return NextResponse.next();
  } catch (error) {
    // On error, default to allowing access (don't block public access)
    console.warn("Middleware error:", error);
    return NextResponse.next();
  }
});

/**
 * Matcher configuration - run middleware on:
 * - Root path "/"
 * - Public documentation "/docs/for-clubs/:path*"
 * This prevents unnecessary processing for other routes
 */
export const config = {
  matcher: ["/", "/docs/for-clubs/:path*"],
};
