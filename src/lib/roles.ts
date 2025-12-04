/**
 * Centralized Roles definitions
 *
 * This module re-exports role-related types and constants from constants/roles.
 * The platform uses context-specific roles:
 * - isRoot: Boolean field on User to identify platform root admin
 * - MembershipRole: Role within an Organization
 * - ClubMembershipRole: Role within a Club
 */

export {
  MembershipRole,
  ClubMembershipRole,
  VALID_MEMBERSHIP_ROLES,
  VALID_CLUB_MEMBERSHIP_ROLES,
  isValidMembershipRole,
  isValidClubMembershipRole,
  isOrganizationAdmin,
  isClubAdmin,
} from "@/constants/roles";
