"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";

/**
 * AdminGuard Component
 * 
 * Centralized authorization guard for admin routes.
 * 
 * Features:
 * - Waits for Zustand hydration before performing any redirects
 * - Redirects unauthenticated users to /auth/sign-in
 * - Redirects non-admin users to /auth/sign-in
 * - Returns null during hydration (no global loader or flicker)
 * - Renders children only when user has valid admin access
 * 
 * This guard should be applied at the layout level for admin routes,
 * eliminating the need for per-page authorization logic.
 * 
 * @example
 * // In admin layout
 * <AdminGuard>
 *   {children}
 * </AdminGuard>
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useUserStore((state) => state.isHydrated);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoading = useUserStore((state) => state.isLoading);

  useEffect(() => {
    // Wait for Zustand hydration to complete
    if (!isHydrated) return;

    // Wait for user loading to complete
    if (isLoading) return;

    // Redirect to sign-in if not authenticated
    if (sessionStatus !== "authenticated") {
      router.replace("/auth/sign-in");
      return;
    }

    // Redirect to sign-in if user is not an admin
    // (Non-admin users should not have access to any admin routes)
    if (!adminStatus?.isAdmin) {
      router.replace("/auth/sign-in");
      return;
    }
  }, [isHydrated, isLoading, sessionStatus, adminStatus, router]);

  // Don't render anything until hydration completes
  if (!isHydrated) {
    return null;
  }

  // Don't render anything while user is loading
  if (isLoading) {
    return null;
  }

  // Don't render anything if not authenticated
  if (sessionStatus !== "authenticated") {
    return null;
  }

  // Don't render anything if not an admin
  if (!adminStatus?.isAdmin) {
    return null;
  }

  // User is authenticated and is an admin, render children
  return <>{children}</>;
}
