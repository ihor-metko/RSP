"use client";

import { useIsMobile } from "@/hooks";
import { LandingMobileView } from "@/components/mobile-views";
import { PlayerBottomNav } from "@/components/layout/PlayerBottomNav";
import { useEffect, useState } from "react";

/**
 * MobileLandingWrapper - Client component for mobile detection
 * 
 * This component handles mobile detection using the useIsMobile hook.
 * It conditionally renders LandingMobileView only on mobile devices.
 * Returns null on desktop to allow server components to render normally.
 * 
 * Provides CSS class to parent to control desktop content visibility.
 * Includes PlayerBottomNav for mobile navigation.
 */
export function MobileLandingWrapper() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial mount, don't render anything to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  // Only render on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <>
      <LandingMobileView />
      <PlayerBottomNav />
    </>
  );
}
