/**
 * Centralized Roles definitions
 *
 * This module contains all role-related types and constants.
 * Import from this module to ensure consistent role handling across the codebase.
 */

export type UserRole = "player" | "coach" | "super_admin" | "root_admin";

/**
 * Centralized Roles object containing all valid role constants.
 * Use these constants instead of string literals for type safety.
 */
export const Roles = {
  PLAYER: "player" as const,
  COACH: "coach" as const,
  SUPER_ADMIN: "super_admin" as const,
  ROOT_ADMIN: "root_admin" as const,
} as const;

export const VALID_ROLES: UserRole[] = [
  Roles.PLAYER,
  Roles.COACH,
  Roles.SUPER_ADMIN,
  Roles.ROOT_ADMIN,
];

export const DEFAULT_ROLE: UserRole = Roles.PLAYER;

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === "string" && VALID_ROLES.includes(role as UserRole);
}

export function validateRole(role: unknown): UserRole {
  return isValidRole(role) ? role : DEFAULT_ROLE;
}
