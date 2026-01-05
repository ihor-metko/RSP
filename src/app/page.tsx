import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserAdminStatus, getAdminHomepage } from "@/utils/roleRedirect";
import { LandingPageContent } from "@/components/LandingPageContent";

/**
 * Home page - Server Component with mobile/desktop conditional rendering
 *
 * All admin users (Root, Organization, Club) are redirected to admin dashboard
 * (server-side fallback for middleware)
 * 
 * Mobile view: Shows mobile-first landing skeleton
 * Desktop view: Shows full landing page with sections
 */
export default async function Home() {
  // Server-side fallback: redirect ALL admin users to admin dashboard
  const session = await auth();
  
  if (session?.user) {
    const userId = session.user.id;
    const isRoot = session.user.isRoot ?? false;
    
    // Check if user has any admin role
    const adminStatus = await checkUserAdminStatus(userId, isRoot);
    
    if (adminStatus.isAdmin) {
      redirect(getAdminHomepage(adminStatus.adminType));
    }
  }
  
  return <LandingPageContent />;
}
