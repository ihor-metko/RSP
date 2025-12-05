import { Suspense } from "react";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout";
import { ClubCardsGridSkeleton, PersonalizedSectionSkeleton } from "@/components/ui";
import {
  HomeHero,
  PopularClubsSection,
  PersonalizedSectionWrapper,
  LandingHowItWorks,
  LandingClubsCoaches,
  LandingTestimonials,
} from "@/components/home";
import { auth } from "@/lib/auth";
import { checkUserAdminStatus, getAdminHomepage } from "@/utils/roleRedirect";

/**
 * Home page - Server Component with client islands for interactivity
 *
 * Server Components: HomeHero, PopularClubsSection,
 *                    LandingHowItWorks, LandingClubsCoaches, LandingTestimonials
 * Client Components: Header, PersonalizedSectionWrapper, PublicFooter
 *
 * ADMIN REDIRECT LOGIC (server-side guard):
 * All admin users (Root, Organization, Club) are redirected to admin dashboard
 * before any HTML is rendered. This is a server-side fallback for middleware
 * that ensures no admin can view the public landing page.
 *
 * Flow:
 * 1. Extract session/userId and isRoot from JWT (fast path for root admin)
 * 2. If isRoot === true → redirect to /admin/dashboard immediately
 * 3. If not root: query Membership table for ORGANIZATION_ADMIN role
 * 4. If not org admin: query ClubMembership table for CLUB_ADMIN role
 * 5. If any admin role found → redirect to /admin/dashboard
 * 6. If unauthenticated or not an admin → render landing page
 *
 * Security: Redirect occurs server-side before rendering any HTML
 */
export default async function Home() {
  /**
   * SERVER-SIDE ADMIN GUARD
   * Block ALL admin types from viewing the public landing page:
   * - Root Admin (isRoot === true in session)
   * - Organization Admin (ORGANIZATION_ADMIN role in Membership table)
   * - Club Admin (CLUB_ADMIN role in ClubMembership table)
   *
   * Redirect must occur BEFORE rendering any HTML for security.
   */
  const session = await auth();
  
  if (session?.user) {
    const userId = session.user.id;
    // Use nullish coalescing to handle undefined isRoot (treat as false)
    const isRoot = session.user.isRoot ?? false;
    
    /**
     * Check if user has any admin role using centralized helper.
     * - Fast path: isRoot === true skips database queries
     * - Otherwise: queries Membership and ClubMembership tables
     * - Uses LIMIT 1 style queries for performance (findFirst/findMany with select)
     */
    const adminStatus = await checkUserAdminStatus(userId, isRoot);
    
    /**
     * If user is ANY type of admin, redirect to admin dashboard.
     * All admin types use the unified /admin/dashboard entry point.
     */
    if (adminStatus.isAdmin) {
      redirect(getAdminHomepage(adminStatus.adminType));
    }
  }
  
  // User is unauthenticated or not an admin - render landing page
  return (
    <main className="flex flex-col min-h-screen overflow-auto">
      <Header />

      {/* Hero section - Server Component with client search bar */}
      <HomeHero />

      {/* Personalized section for authenticated users - Client Component */}
      <Suspense fallback={<PersonalizedSectionSkeleton />}>
        <PersonalizedSectionWrapper />
      </Suspense>

      {/* Popular clubs section - Server Component */}
      <Suspense fallback={
        <section className="rsp-popular-clubs-section">
          <div className="rsp-popular-clubs-container">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-sm animate-pulse mb-6" />
            <ClubCardsGridSkeleton count={4} />
          </div>
        </section>
      }>
        <PopularClubsSection />
      </Suspense>

      {/* Section 4: How It Works - Server Component */}
      <LandingHowItWorks />

      {/* Section 5: Featured Clubs & Coaches - Server Component */}
      <LandingClubsCoaches />

      {/* Section 6: Testimonials - Server Component */}
      <LandingTestimonials />

      <PublicFooter />
    </main>
  );
}
