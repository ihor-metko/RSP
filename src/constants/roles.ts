/**
 * Centralized Roles and membership enums for the application.
 * 
 * The platform uses a context-specific role system:
 * - isRoot: Boolean on User model to identify platform root admin
 * - MembershipRole: Role within an Organization (ORGANIZATION_ADMIN, MEMBER)
 * - ClubMembershipRole: Role within a Club (CLUB_ADMIN, MEMBER)
 *
 * @example
 * import { MembershipRole, ClubMembershipRole } from "@/constants/roles";
 *
 * // Check if user is root admin
 * if (user.isRoot) { ... }
 *
 * // Check organization membership role
 * if (membership.role === MembershipRole.ORGANIZATION_ADMIN) { ... }
 *
 * // Check club membership role
 * if (clubMembership.role === ClubMembershipRole.CLUB_ADMIN) { ... }
 */

/**
 * Membership roles for Organization memberships.
 * These define the user's role within an organization context.
 */
export enum MembershipRole {
  ORGANIZATION_ADMIN = "ORGANIZATION_ADMIN",
  MEMBER = "MEMBER",
}

/**
 * Membership roles for Club memberships.
 * These define the user's role within a club context.
 */
export enum ClubMembershipRole {
  CLUB_ADMIN = "CLUB_ADMIN",
  MEMBER = "MEMBER",
}

/**
 * Array of all valid membership roles.
 */
export const VALID_MEMBERSHIP_ROLES: MembershipRole[] = Object.values(MembershipRole);

/**
 * Array of all valid club membership roles.
 */
export const VALID_CLUB_MEMBERSHIP_ROLES: ClubMembershipRole[] = Object.values(ClubMembershipRole);

/**
 * Type guard to check if a value is a valid MembershipRole.
 * @param role - The value to check
 * @returns true if the value is a valid MembershipRole
 */
export function isValidMembershipRole(role: unknown): role is MembershipRole {
  return typeof role === "string" && VALID_MEMBERSHIP_ROLES.includes(role as MembershipRole);
}

/**
 * Type guard to check if a value is a valid ClubMembershipRole.
 * @param role - The value to check
 * @returns true if the value is a valid ClubMembershipRole
 */
export function isValidClubMembershipRole(role: unknown): role is ClubMembershipRole {
  return typeof role === "string" && VALID_CLUB_MEMBERSHIP_ROLES.includes(role as ClubMembershipRole);
}

/**
 * Check if a user is an organization admin based on their membership.
 * @param role - The membership role to check
 * @returns true if the role is ORGANIZATION_ADMIN
 */
export function isOrganizationAdmin(role: MembershipRole): boolean {
  return role === MembershipRole.ORGANIZATION_ADMIN;
}

/**
 * Check if a user is a club admin based on their club membership.
 * @param role - The club membership role to check
 * @returns true if the role is CLUB_ADMIN
 */
export function isClubAdmin(role: ClubMembershipRole): boolean {
  return role === ClubMembershipRole.CLUB_ADMIN;
}
