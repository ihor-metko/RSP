/**
 * Role-based redirect utilities for the application
 */

import type { UserRole } from "@/lib/auth";

/**
 * Role-specific homepage paths
 */
export const ROLE_HOMEPAGES: Record<UserRole, string> = {
  admin: "/admin/clubs",
  coach: "/coach/dashboard",
  player: "/",
};

/**
 * Get the homepage path for a given user role
 * Priority: admin > coach > player (for users with multiple roles, if applicable)
 *
 * @param role User's role
 * @returns The homepage path for the role
 */
export function getRoleHomepage(role: UserRole | undefined): string {
  if (!role) {
    return ROLE_HOMEPAGES.player;
  }

  return ROLE_HOMEPAGES[role] ?? ROLE_HOMEPAGES.player;
}
