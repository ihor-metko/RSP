import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_HOMEPAGES } from "@/utils/roleRedirect";
import type { UserRole } from "@/lib/auth";

/**
 * Admin roles that should be redirected from the landing page
 */
const ADMIN_ROLES: UserRole[] = ["admin"];

/**
 * Middleware to redirect admin users from the landing page to admin dashboard
 * 
 * - Unauthenticated users: See public landing page
 * - Players/coaches: See player landing page  
 * - Admin users: Redirected to /admin/clubs
 */
export default auth((req) => {
  try {
    const { pathname } = req.nextUrl;

    // Only apply to root path
    if (pathname !== "/") {
      return NextResponse.next();
    }

    const session = req.auth;

    // If no session, allow public access
    if (!session?.user) {
      return NextResponse.next();
    }

    const userRole = session.user.role;

    // Check if user has admin role
    if (userRole && ADMIN_ROLES.includes(userRole)) {
      const adminHomepage = ROLE_HOMEPAGES.admin;
      const redirectUrl = new URL(adminHomepage, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Non-admin authenticated users see the landing page
    return NextResponse.next();
  } catch (error) {
    // On error, default to allowing access (don't block public access)
    console.warn("Middleware error:", error);
    return NextResponse.next();
  }
});

/**
 * Matcher configuration - only run middleware on root path
 * This prevents unnecessary processing for other routes
 */
export const config = {
  matcher: ["/"],
};
