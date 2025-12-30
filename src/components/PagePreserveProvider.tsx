"use client";

import { useEffect, useRef, useState } from "react";
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
 * Entry point paths that trigger restoration on reload
 * These are typically root-level paths users might land on
 */
const ENTRY_PATHS = [
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
 * Check if a path is an entry point
 */
function isEntryPath(pathname: string): boolean {
  return ENTRY_PATHS.includes(pathname);
}

/**
 * Global Loading Gate Component
 * Displays a skeleton loader while authentication state is being verified
 */
function GlobalLoadingGate({ children }: { children: React.ReactNode }) {
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  
  // Show loading gate while auth is being verified
  const isAuthVerifying = !isHydrated || isLoading || sessionStatus === "loading";
  
  if (isAuthVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * PagePreserveProvider
 * 
 * Global mechanism for preserving the current page across reloads.
 * 
 * Features:
 * - Prevents flickers and unintended redirects during page reload
 * - Saves current page (pathname + query params) to sessionStorage on navigation
 * - Restores last page on app initialization (after auth check completes)
 * - Excludes auth pages and other special routes from preservation
 * - Includes timestamp-based expiration (30 minutes)
 * - Shows loading skeleton during auth verification
 * - Works globally for all routes without per-page code
 * 
 * How it works:
 * 1. Blocks rendering with loading gate until auth state is confirmed
 * 2. On initial load, checks if there's a preserved page to restore
 * 3. If user is authenticated and on an entry path, restores the preserved page
 * 4. Saves current page as user navigates (except excluded paths)
 * 5. All content renders only after auth status is verified
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
  const [isRestorationComplete, setIsRestorationComplete] = useState(false);

  // Restore page on initial mount after authentication completes
  useEffect(() => {
    // Only run on initial mount
    if (!isInitialMount.current) return;
    
    // Wait for hydration and auth to complete
    if (!isHydrated || isLoading || sessionStatus === "loading") return;
    
    isInitialMount.current = false;
    
    // Only restore if we haven't already done so
    if (hasRestoredPage.current) {
      setIsRestorationComplete(true);
      return;
    }
    hasRestoredPage.current = true;
    
    // Skip restoration if user is not authenticated
    if (sessionStatus !== "authenticated") {
      setIsRestorationComplete(true);
      return;
    }
    
    // Skip restoration if we're already on an excluded path
    if (shouldExcludePath(pathname)) {
      setIsRestorationComplete(true);
      return;
    }
    
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const timestamp = sessionStorage.getItem(STORAGE_TIMESTAMP_KEY);
      
      if (!stored || !timestamp) {
        setIsRestorationComplete(true);
        return;
      }
      
      // Check if stored page has expired
      const age = Date.now() - parseInt(timestamp, 10);
      if (age > MAX_AGE_MS) {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_TIMESTAMP_KEY);
        setIsRestorationComplete(true);
        return;
      }
      
      // Parse the stored path
      const storedUrl = new URL(stored, window.location.origin);
      
      // Build current full path
      const search = searchParams.toString();
      const currentFullPath = search ? `${pathname}?${search}` : pathname;
      
      // Don't restore if we're already on the stored page
      if (stored === currentFullPath) {
        setIsRestorationComplete(true);
        return;
      }
      
      // Don't restore if stored page is an excluded path
      if (shouldExcludePath(storedUrl.pathname)) {
        setIsRestorationComplete(true);
        return;
      }
      
      // Restore from entry paths OR if current path exactly matches the stored path
      // This allows restoration when reloading directly on a specific page
      const shouldRestore = isEntryPath(pathname) || pathname === storedUrl.pathname;
      
      if (shouldRestore) {
        router.push(stored);
      }
      
      setIsRestorationComplete(true);
    } catch (error) {
      console.warn("Failed to restore page:", error);
      setIsRestorationComplete(true);
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
    
    // Skip entry paths (we restore TO these, not FROM them)
    if (isEntryPath(pathname)) return;
    
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

  return (
    <GlobalLoadingGate>
      {children}
    </GlobalLoadingGate>
  );
}
