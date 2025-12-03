/**
 * Centralized Roles enum for the application.
 * All role checks, assignments, and comparisons should use these enum values
 * to ensure type safety and consistency across the platform.
 *
 * @example
 * import { Roles } from "@/constants/roles";
 *
 * // Role checks
 * if (user.role === Roles.SuperAdmin) { ... }
 *
 * // Role assignments
 * const newUser = { role: Roles.Player };
 *
 * // API route authorization
 * await requireRole(request, [Roles.SuperAdmin, Roles.Admin]);
 */
export enum Roles {
  RootAdmin = "root_admin",
  SuperAdmin = "super_admin",
  Admin = "admin",
  Coach = "coach",
  Player = "player",
}

/**
 * Type representing valid user roles in the system.
 * Derived from the Roles enum values.
 */
export type UserRole = `${Roles}`;

/**
 * Array of all valid user roles.
 * Useful for validation and iteration.
 */
export const VALID_ROLES: UserRole[] = Object.values(Roles);

/**
 * The default role assigned to new users.
 */
export const DEFAULT_ROLE: UserRole = Roles.Player;

/**
 * Array of admin roles that have access to admin functionality.
 * Includes root_admin, super_admin, and admin roles.
 */
export const ADMIN_ROLES: UserRole[] = [Roles.RootAdmin, Roles.SuperAdmin, Roles.Admin];

/**
 * Type guard to check if a role is an admin role.
 * @param role - The role to check
 * @returns true if the role is an admin role
 */
export function isAdminRole(role: unknown): boolean {
  return typeof role === "string" && ADMIN_ROLES.includes(role as UserRole);
}

/**
 * Type guard to check if a value is a valid user role.
 * @param role - The value to check
 * @returns true if the value is a valid UserRole
 */
export function isValidRole(role: unknown): role is UserRole {
  return typeof role === "string" && VALID_ROLES.includes(role as UserRole);
}

/**
 * Validates and returns a role, defaulting to Player if invalid.
 * @param role - The role to validate
 * @returns A valid UserRole
 */
export function validateRole(role: unknown): UserRole {
  return isValidRole(role) ? role : DEFAULT_ROLE;
}
