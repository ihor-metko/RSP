"use client";

import { useIsMobile } from "@/hooks";
import { useEffect, useState } from "react";

/**
 * DesktopContentWrapper - Client component that conditionally renders children on desktop
 * 
 * This component hides its children on mobile devices to prevent rendering
 * both mobile and desktop views simultaneously.
 */
export function DesktopContentWrapper({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, always render to ensure server-side rendering works
  // After mount, only render on desktop
  if (mounted && isMobile) {
    return null;
  }

  return <>{children}</>;
}
