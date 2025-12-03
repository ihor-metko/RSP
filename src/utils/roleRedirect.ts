/**
 * Role-based redirect utilities for the application.
 * Uses the centralized Roles enum for type safety and consistency.
 */

import { Roles, type UserRole } from "@/constants/roles";

/**
 * Role-specific homepage paths.
 * Always use Roles enum values as keys.
 */
export const ROLE_HOMEPAGES: Record<UserRole, string> = {
  [Roles.RootAdmin]: "/admin/clubs",
  [Roles.SuperAdmin]: "/admin/clubs",
  [Roles.Admin]: "/admin/clubs",
  [Roles.Coach]: "/coach/dashboard",
  [Roles.Player]: "/",
};

/**
 * Get the homepage path for a given user role
 * Priority: super_admin > admin > coach > player (for users with multiple roles, if applicable)
 *
 * @param role User's role (should be a Roles enum value)
 * @returns The homepage path for the role
 */
export function getRoleHomepage(role: UserRole | undefined): string {
  if (!role) {
    return ROLE_HOMEPAGES[Roles.Player];
  }

  return ROLE_HOMEPAGES[role] ?? ROLE_HOMEPAGES[Roles.Player];
}
