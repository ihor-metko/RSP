"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";

const STORAGE_KEY = "arenaone_last_page";
const STORAGE_TIMESTAMP_KEY = "arenaone_last_page_timestamp";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Pages that should NOT be preserved (auth pages, redirects, etc.)
 */
const EXCLUDED_PATHS = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/verify-email",
  "/auth/reset-password",
  "/invites/accept",
];

/**
 * Paths from which we restore preserved pages
 * These are typically entry points where users land after reload
 */
const RESTORE_FROM_PATHS = [
  "/",
  "/admin/dashboard",
];

/**
 * Check if a path should be excluded from preservation
 */
function shouldExcludePath(pathname: string): boolean {
  return EXCLUDED_PATHS.some((excluded) => pathname.startsWith(excluded));
}

/**
 * PagePreserveProvider
 * 
 * Universal solution for preserving the current page across reloads.
 * 
 * Features:
 * - Saves current page (pathname + query params) to sessionStorage on navigation
 * - Restores last page on app initialization (after auth check completes)
 * - Excludes auth pages and other special routes
 * - Includes timestamp-based expiration (30 minutes)
 * - Works globally without per-page code
 * 
 * Integration:
 * - Add to root layout after AuthProvider
 * - No additional code needed on individual pages
 */
export function PagePreserveProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  
  const hasRestoredPage = useRef(false);
  const isInitialMount = useRef(true);

  // Restore page on initial mount after authentication completes
  useEffect(() => {
    // Only run on initial mount
    if (!isInitialMount.current) return;
    
    // Wait for hydration and auth to complete
    if (!isHydrated || isLoading || sessionStatus === "loading") return;
    
    isInitialMount.current = false;
    
    // Only restore if we haven't already done so
    if (hasRestoredPage.current) return;
    hasRestoredPage.current = true;
    
    // Skip restoration if user is not authenticated
    if (sessionStatus !== "authenticated") return;
    
    // Skip restoration if we're already on an excluded path
    if (shouldExcludePath(pathname)) return;
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const timestamp = sessionStorage.getItem(STORAGE_TIMESTAMP_KEY);
      
      if (!stored || !timestamp) return;
      
      // Check if stored page has expired
      const age = Date.now() - parseInt(timestamp, 10);
      if (age > MAX_AGE_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
        return;
      }
      
      // Parse the stored path
      const storedUrl = new URL(stored, window.location.origin);
      
      // Build current full path
      const search = searchParams.toString();
      const currentFullPath = search ? `${pathname}?${search}` : pathname;
      
      // Don't restore if we're already on the stored page
      if (stored === currentFullPath) {
        return;
      }
      
      // Don't restore if stored page is an excluded path
      if (shouldExcludePath(storedUrl.pathname)) return;
      
      // Only restore if current page is in the restore-from list
      // This prevents interrupting intentional navigation
      if (RESTORE_FROM_PATHS.includes(pathname)) {
        router.push(stored);
      }
    } catch (error) {
      console.warn("Failed to restore page:", error);
    }
  }, [isHydrated, isLoading, sessionStatus, pathname, searchParams, router]);

  // Save current page on navigation (excluding auth pages)
  useEffect(() => {
    // Don't save on initial mount (wait for restore to complete first)
    if (isInitialMount.current) return;
    
    // Skip if not hydrated or still loading
    if (!isHydrated) return;
    
    // Skip excluded paths
    if (shouldExcludePath(pathname)) return;
    
    // Skip paths that we restore from
    if (RESTORE_FROM_PATHS.includes(pathname)) return;
    
    // Build full URL with query params
    const search = searchParams.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;
    
    try {
      sessionStorage.setItem(STORAGE_KEY, fullPath);
      sessionStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn("Failed to save page:", error);
    }
  }, [pathname, searchParams, isHydrated]);

  return <>{children}</>;
}
