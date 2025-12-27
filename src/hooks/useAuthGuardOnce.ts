import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/useUserStore";

/**
 * Hook to guard routes with authentication check that only runs once on mount.
 * This prevents unwanted redirects on page reload.
 * 
 * @param options - Configuration options for the auth guard
 * @param options.requireAuth - If true, redirects unauthenticated users to sign-in (default: true)
 * @param options.requireAdmin - If true, redirects non-admin users to sign-in (default: false)
 * @param options.requireRoot - If true, redirects non-root users to sign-in (default: false)
 * @param options.redirectTo - Custom redirect path (default: "/auth/sign-in")
 * 
 * @example
 * // Require authentication only
 * useAuthGuardOnce({ requireAuth: true });
 * 
 * @example
 * // Require admin role
 * useAuthGuardOnce({ requireAuth: true, requireAdmin: true });
 * 
 * @example
 * // Require root admin role
 * useAuthGuardOnce({ requireAuth: true, requireRoot: true });
 */
export function useAuthGuardOnce(options: {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireRoot?: boolean;
  redirectTo?: string;
} = {}) {
  const {
    requireAuth = true,
    requireAdmin = false,
    requireRoot = false,
    redirectTo = "/auth/sign-in",
  } = options;

  const router = useRouter();
  const isHydrated = useUserStore((state) => state.isHydrated);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  const isUserLoading = useUserStore((state) => state.isLoading);
  const user = useUserStore((state) => state.user);
  const adminStatus = useUserStore((state) => state.adminStatus);

  // Derive loading and authentication state from sessionStatus for consistency
  const isLoading = sessionStatus === "loading" || isUserLoading;
  const isAuthenticated = sessionStatus === "authenticated";
  const isLoggedIn = isAuthenticated;

  // Track if we've performed the initial auth check to prevent redirects on page reload
  const hasPerformedAuthCheck = useRef(false);

  useEffect(() => {
    // Wait for hydration and loading to complete
    if (!isHydrated || isLoading) return;

    // Only perform auth redirect on the first check, not on page reloads
    if (hasPerformedAuthCheck.current) return;
    hasPerformedAuthCheck.current = true;

    // Check authentication requirement
    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    // Check root admin requirement
    if (requireRoot && (!user || !user.isRoot)) {
      router.push(redirectTo);
      return;
    }

    // Check admin requirement (any admin type)
    if (requireAdmin && !adminStatus?.isAdmin) {
      router.push(redirectTo);
      return;
    }
  }, [
    isHydrated,
    isLoading,
    sessionStatus, // Include sessionStatus for clarity
    isAuthenticated,
    user,
    adminStatus,
    router,
    redirectTo,
    requireAuth,
    requireAdmin,
    requireRoot,
  ]);

  return {
    isHydrated,
    isLoading,
    isLoggedIn,
    isAuthenticated,
    sessionStatus,
    user,
    adminStatus,
  };
}
