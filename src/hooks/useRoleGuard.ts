"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface UseRoleGuardResult {
  isLoading: boolean;
  isAuthorized: boolean;
}

/**
 * Hook to guard routes that require root admin access.
 * Redirects unauthenticated users to sign-in and non-root users to /clubs.
 */
export function useRootAdminGuard(): UseRoleGuardResult {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isRoot = session?.user?.isRoot;
  const isAuthorized = isAuthenticated && isRoot === true;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }

    if (!isAuthorized) {
      router.push("/clubs");
    }
  }, [isLoading, isAuthenticated, isAuthorized, router]);

  return {
    isLoading,
    isAuthorized,
  };
}

/**
 * Hook to guard routes that require authentication only.
 * Redirects unauthenticated users to sign-in.
 */
export function useAuthGuard(): UseRoleGuardResult {
  const { status } = useSession();
  const router = useRouter();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const isAuthorized = isAuthenticated;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  return {
    isLoading,
    isAuthorized,
  };
}
