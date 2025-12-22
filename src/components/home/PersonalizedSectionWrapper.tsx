"use client";

import { useSession } from "next-auth/react";
import { PersonalizedSection } from "@/components/PersonalizedSection";
import { useUserStore } from "@/stores/useUserStore";

/**
 * Client Component wrapper that conditionally renders PersonalizedSection
 * based on authentication state
 */
export function PersonalizedSectionWrapper() {
  const { status } = useSession();
  const user = useUserStore(state => state.user);

  const isAuthenticated = status === "authenticated" && user;

  if (!isAuthenticated || !user?.name) {
    return null;
  }

  return <PersonalizedSection userName={user.name} />;
}
