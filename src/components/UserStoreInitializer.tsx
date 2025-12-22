"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useUserStore } from "@/stores/useUserStore";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Time to wait for Zustand persist to restore from localStorage
 */
const HYDRATION_TIMEOUT_MS = 100;

/**
 * Client component to initialize the user store on app start.
 * This component loads user data when the session becomes available.
 * It waits for hydration to complete before loading fresh data.
 */
export function UserStoreInitializer() {
  const { status } = useSession();
  const loadUser = useUserStore(state => state.loadUser);
  const clearUser = useUserStore(state => state.clearUser);
  const clearSocketToken = useAuthStore(state => state.clearSocketToken);
  const isHydrated = useUserStore(state => state.isHydrated);
  const setHydrated = useUserStore(state => state.setHydrated);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Wait for hydration to complete
  useEffect(() => {
    // If not hydrated yet, mark as hydrated after a brief delay
    // This allows Zustand persist to restore from localStorage
    if (!isHydrated) {
      const timer = setTimeout(() => {
        setHydrated(true);
      }, HYDRATION_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [isHydrated, setHydrated]);

  useEffect(() => {
    // Only proceed after hydration is complete
    if (!isHydrated) return;

    // Prevent multiple initializations
    if (hasInitialized) return;

    if (status === "loading") return;

    if (status === "authenticated") {
      // Load user data into the store when authenticated
      loadUser().finally(() => setHasInitialized(true));
    } else if (status === "unauthenticated") {
      // Clear user data and socket token when unauthenticated
      clearUser();
      clearSocketToken();
      setHasInitialized(true);
    }
  }, [status, loadUser, clearUser, clearSocketToken, isHydrated, hasInitialized]);

  // This component doesn't render anything
  return null;
}
