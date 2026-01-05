"use client";

import { Suspense } from "react";
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
import { LandingMobileView } from "@/components/mobile-views";
import { useIsMobile } from "@/hooks";

/**
 * LandingPageContent - Client component wrapper for conditional mobile/desktop rendering
 * 
 * This component handles the conditional rendering based on viewport size.
 * Mobile view: Shows LandingMobileView skeleton
 * Desktop view: Shows full landing page with sections
 */
export function LandingPageContent() {
  const isMobile = useIsMobile();

  // Mobile view
  if (isMobile) {
    return <LandingMobileView />;
  }

  // Desktop view
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
