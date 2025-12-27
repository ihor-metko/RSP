/**
 * Centralized Roles and membership enums for the application.
 * 
 * ROLE HIERARCHY (highest to lowest):
 * ====================================
 * ROOT_ADMIN → ORGANIZATION_OWNER → ORGANIZATION_ADMIN → CLUB_OWNER → CLUB_ADMIN → MEMBER/PLAYER
 * 
 * The platform uses a context-specific role system:
 * - isRoot: Boolean on User model to identify platform root admin (GLOBAL scope)
 * - MembershipRole: Role within an Organization (ORGANIZATION_ADMIN with isPrimaryOwner flag, MEMBER)
 * - ClubMembershipRole: Role within a Club (CLUB_OWNER, CLUB_ADMIN, MEMBER)
 *
 * ROLE DEFINITIONS:
 * =================
 * - ROOT_ADMIN: Platform-wide super admin (user.isRoot = true). Can access and manage everything.
 * - ORGANIZATION_OWNER: Organization admin with isPrimaryOwner=true. Can invite org owners/admins.
 * - ORGANIZATION_ADMIN: Organization admin with isPrimaryOwner=false. Can invite org admins.
 * - CLUB_OWNER: Highest role in a club. Can manage club and invite club admins.
 * - CLUB_ADMIN: Club administrator. Can manage club but cannot invite.
 * - MEMBER/PLAYER: Regular member in organization or club.
 *
 * BUSINESS RULES:
 * ===============
 * - Root Admin can access and manage everything
 * - Organization Owner outranks Organization Admin
 * - Club Owner outranks Club Admin
 * - Admins cannot escalate their own roles
 * - Admins cannot assign roles higher than their own
 * - Owner roles are unique per scope (only one org owner, only one club owner)
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
  CLUB_OWNER = "CLUB_OWNER",
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
 * Check if a user is a club owner based on their club membership.
 * @param role - The club membership role to check
 * @returns true if the role is CLUB_OWNER
 */
export function isClubOwner(role: ClubMembershipRole): boolean {
  return role === ClubMembershipRole.CLUB_OWNER;
}

/**
 * Check if a user is a club admin based on their club membership.
 * @param role - The club membership role to check
 * @returns true if the role is CLUB_ADMIN
 */
export function isClubAdmin(role: ClubMembershipRole): boolean {
  return role === ClubMembershipRole.CLUB_ADMIN;
}

/**
 * Role hierarchy levels for comparison.
 * Higher number = higher privilege level.
 */
export const ROLE_HIERARCHY = {
  ROOT_ADMIN: 100,
  ORGANIZATION_OWNER: 50,
  ORGANIZATION_ADMIN: 40,
  CLUB_OWNER: 30,
  CLUB_ADMIN: 20,
  MEMBER: 10,
} as const;

/**
 * Check if a role can assign another role.
 * Admins cannot assign roles higher than or equal to their own.
 * 
 * @param assignerRole - The role of the user assigning
 * @param targetRole - The role to be assigned
 * @returns true if the assigner can assign the target role
 * 
 * @example
 * canAssignRole('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN') // true
 * canAssignRole('ORGANIZATION_ADMIN', 'ORGANIZATION_OWNER') // false
 * canAssignRole('CLUB_OWNER', 'CLUB_ADMIN') // true
 */
export function canAssignRole(
  assignerRole: keyof typeof ROLE_HIERARCHY,
  targetRole: keyof typeof ROLE_HIERARCHY
): boolean {
  return ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Compare two roles to determine hierarchy.
 * 
 * @param role1 - First role to compare
 * @param role2 - Second role to compare
 * @returns Positive if role1 > role2, negative if role1 < role2, 0 if equal
 * 
 * @example
 * compareRoles('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN') // > 0 (owner is higher)
 * compareRoles('CLUB_ADMIN', 'CLUB_OWNER') // < 0 (admin is lower)
 */
export function compareRoles(
  role1: keyof typeof ROLE_HIERARCHY,
  role2: keyof typeof ROLE_HIERARCHY
): number {
  return ROLE_HIERARCHY[role1] - ROLE_HIERARCHY[role2];
}
