"use client";

import { useState, useEffect } from "react";
import PlayerMobileHeader from "@/components/layout/PlayerMobileHeader";
import { PlayerMobileFooter } from "@/components/layout/PlayerMobileFooter";
import { PlayerBottomNav } from "@/components/layout/PlayerBottomNav";
import Header from "@/components/layout/Header";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { useIsMobile } from "@/hooks";

export default function PlayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial mount, render desktop version to prevent hydration mismatch
  // The desktop version is the default/fallback
  const showMobile = mounted && isMobile;

  return (
    <div className="flex flex-col min-h-screen overflow-auto">
      {showMobile ? <PlayerMobileHeader /> : <Header />}

      {/* Add bottom padding on mobile to prevent content from being hidden by bottom nav */}
      <div className="flex-1 w-7xl mx-auto w-full pb-14 md:pb-0">
        {children}
      </div>

      {showMobile ? <PlayerMobileFooter /> : <PublicFooter />}

      {/* Mobile-only sticky bottom navigation */}
      <PlayerBottomNav />
    </div>
  );
}
