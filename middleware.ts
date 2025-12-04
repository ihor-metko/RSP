import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware to redirect all admin users from the landing page to admin dashboard.
 * Uses getToken() from next-auth/jwt for Edge Runtime compatibility.
 *
 * - Unauthenticated users: See public landing page
 * - Regular users (non-admin): See public landing page
 * - Admin users (Root Admin, Organization Admin, Club Admin): Redirected to /admin/dashboard
 *
 * The isAdmin flag in the JWT token indicates if the user has any admin role.
 * This flag is set during login in the JWT callback in src/lib/auth.ts.
 */
export default async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Only apply to root path
    if (pathname !== "/") {
      return NextResponse.next();
    }

    // Get the JWT token using getToken (Edge Runtime compatible)
    const token = await getToken({ req: request });

    // If no token, allow public access
    if (!token) {
      return NextResponse.next();
    }

    // Check if user is any type of admin using the isAdmin flag from JWT
    if (token.isAdmin) {
      const redirectUrl = new URL("/admin/dashboard", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Non-admin authenticated users see the landing page
    return NextResponse.next();
  } catch (error) {
    // On error, default to allowing access (don't block public access)
    console.warn("Middleware error:", error);
    return NextResponse.next();
  }
}

/**
 * Matcher configuration - only run middleware on root path
 * This prevents unnecessary processing for other routes
 */
export const config = {
  matcher: ["/"],
};
