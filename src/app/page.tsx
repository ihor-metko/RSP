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
import { ADMIN_ROLES } from "@/constants/roles";
import { ROLE_HOMEPAGES } from "@/utils/roleRedirect";

/**
 * Home page - Server Component with client islands for interactivity
 *
 * Server Components: HomeHero, PopularClubsSection,
 *                    LandingHowItWorks, LandingClubsCoaches, LandingTestimonials
 * Client Components: Header, PersonalizedSectionWrapper, PublicFooter
 *
 * Admin users are redirected to admin dashboard (server-side fallback for middleware)
 */
export default async function Home() {
  // Server-side fallback: redirect admin users to admin dashboard
  const session = await auth();
  const userRole = session?.user?.role;
  if (userRole && ADMIN_ROLES.includes(userRole)) {
    redirect(ROLE_HOMEPAGES[userRole]);
  }
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
