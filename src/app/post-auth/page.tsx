import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserAdminStatus } from "@/utils/roleRedirect";
import { prisma } from "@/lib/prisma";

/**
 * Post-authentication routing page.
 * 
 * This page acts as a centralized post-login gate that redirects users
 * based on their roles and memberships:
 * 
 * - Root Admin → /dashboard (admin dashboard)
 * - Users with organization membership → /dashboard
 * - Users with club membership → /dashboard
 * - Regular players (no org/club roles) → / (landing page)
 * 
 * This route should never be accessed directly by users - it's only used
 * as a callback URL after authentication.
 */
export default async function PostAuthPage() {
  const session = await auth();

  // If no session, redirect to sign-in
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Check if user is root admin
  if (isRoot) {
    redirect("/dashboard");
  }

  // Check for admin status (organization or club admin)
  const adminStatus = await checkUserAdminStatus(userId, isRoot);
  
  if (adminStatus.isAdmin) {
    redirect("/dashboard");
  }

  // Check for any organization or club membership (non-admin) concurrently
  const [orgMembership, clubMembership] = await Promise.all([
    prisma.membership.findFirst({
      where: { userId },
      select: { id: true },
    }),
    prisma.clubMembership.findFirst({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (orgMembership || clubMembership) {
    redirect("/dashboard");
  }

  // Regular player with no memberships - redirect to landing page
  redirect("/");
}
