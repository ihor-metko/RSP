"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the current viewport is mobile size
 * Mobile breakpoint: < 768px (matches Tailwind's 'md' breakpoint)
 * 
 * This hook is used for conditional rendering of mobile vs desktop views
 * in the player flow.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is defined (client-side only)
    if (typeof window === "undefined") {
      return;
    }

    // Define mobile breakpoint
    const MOBILE_BREAKPOINT = 768;

    // Function to check if viewport is mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount
    checkIsMobile();

    // Add resize listener
    window.addEventListener("resize", checkIsMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}
