/**
 * Unified Authorization Layer - Centralized Permission System
 * 
 * This module provides the single source of truth for all authorization checks.
 * It implements role-based access control with the following hierarchy:
 * 
 * ROOT_ADMIN → ORGANIZATION_OWNER → ORGANIZATION_ADMIN → CLUB_OWNER → CLUB_ADMIN → PLAYER
 * 
 * Core Principles:
 * - Root Admin has global access to everything
 * - Organization Owner outranks Organization Admin
 * - Club Owner outranks Club Admin
 * - Roles are scope-bound (except Root Admin which is global)
 * - Admins cannot escalate their own roles
 * - Admins cannot assign roles higher than their own
 * - Owner roles are unique per scope
 */

import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";
import type { InviteRole } from "@prisma/client";

/**
 * Valid organization invite roles.
 */
const ORGANIZATION_INVITE_ROLES: InviteRole[] = ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"];

/**
 * Valid club invite roles.
 */
const CLUB_INVITE_ROLES: InviteRole[] = ["CLUB_OWNER", "CLUB_ADMIN"];

/**
 * User interface for permission checks.
 * Can be a session user or a minimal user object.
 */
export interface PermissionUser {
  id: string;
  isRoot?: boolean;
}

/**
 * Organization role result type.
 */
export interface OrganizationRole {
  role: MembershipRole;
  isPrimaryOwner: boolean;
}

/**
 * Club role result type.
 */
export interface ClubRole {
  role: ClubMembershipRole;
}

/**
 * Check if user is a root admin.
 * Root admins have global access to all resources.
 * 
 * @param user - User object with isRoot flag
 * @returns true if user is root admin
 */
export function isRootAdmin(user: PermissionUser): boolean {
  return user.isRoot === true;
}

/**
 * Get the user's role within an organization.
 * Returns null if user has no membership in the organization.
 * 
 * @param userId - User ID to check
 * @param organizationId - Organization ID to check
 * @returns Organization role with isPrimaryOwner flag, or null
 */
export async function getOrganizationRole(
  userId: string,
  organizationId: string
): Promise<OrganizationRole | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    select: {
      role: true,
      isPrimaryOwner: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    role: membership.role as MembershipRole,
    isPrimaryOwner: membership.isPrimaryOwner,
  };
}

/**
 * Get the user's role within a club.
 * Returns null if user has no membership in the club.
 * 
 * @param userId - User ID to check
 * @param clubId - Club ID to check
 * @returns Club role, or null
 */
export async function getClubRole(
  userId: string,
  clubId: string
): Promise<ClubRole | null> {
  const membership = await prisma.clubMembership.findUnique({
    where: {
      userId_clubId: {
        userId,
        clubId,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    role: membership.role as ClubMembershipRole,
  };
}

/**
 * Check if user can access (read) an organization.
 * 
 * Access rules:
 * - Root admin: Can access any organization
 * - Organization member (any role): Can access their organization
 * 
 * @param user - User to check
 * @param organizationId - Organization ID to check
 * @returns true if user can access the organization
 */
export async function canAccessOrganization(
  user: PermissionUser,
  organizationId: string
): Promise<boolean> {
  // Root admins can access everything
  if (isRootAdmin(user)) {
    return true;
  }

  // Check if user has any membership in the organization
  const role = await getOrganizationRole(user.id, organizationId);
  return role !== null;
}

/**
 * Check if user can manage (update/delete) an organization.
 * 
 * Management rules:
 * - Root admin: Can manage any organization
 * - Organization admin (including owner): Can manage their organization
 * 
 * @param user - User to check
 * @param organizationId - Organization ID to check
 * @returns true if user can manage the organization
 */
export async function canManageOrganization(
  user: PermissionUser,
  organizationId: string
): Promise<boolean> {
  // Root admins can manage everything
  if (isRootAdmin(user)) {
    return true;
  }

  // Check if user is an organization admin
  const role = await getOrganizationRole(user.id, organizationId);
  return role !== null && role.role === MembershipRole.ORGANIZATION_ADMIN;
}

/**
 * Check if user can invite someone to an organization with a specific role.
 * 
 * Invite rules:
 * - Root admin: Can invite anyone to any organization
 * - Organization owner (isPrimaryOwner=true): Can invite organization owners and admins
 * - Organization admin: Can invite organization admins only
 * 
 * @param user - User to check
 * @param organizationId - Organization ID to check
 * @param inviteRole - Role to be assigned via invite
 * @returns true if user can create the invite
 */
export async function canInviteToOrganization(
  user: PermissionUser,
  organizationId: string,
  inviteRole: InviteRole
): Promise<boolean> {
  // Root admins can invite anyone
  if (isRootAdmin(user)) {
    return true;
  }

  // Only organization roles are valid for organization invites
  if (!ORGANIZATION_INVITE_ROLES.includes(inviteRole)) {
    return false;
  }

  // Get user's organization role
  const userRole = await getOrganizationRole(user.id, organizationId);
  
  // User must be an organization admin to invite
  if (!userRole || userRole.role !== MembershipRole.ORGANIZATION_ADMIN) {
    return false;
  }

  // Only primary owners can invite new owners
  if (inviteRole === "ORGANIZATION_OWNER") {
    return userRole.isPrimaryOwner;
  }

  // Organization admins can invite other admins
  return true;
}

/**
 * Check if user can manage (update/delete) a club.
 * 
 * Management rules:
 * - Root admin: Can manage any club
 * - Organization admin: Can manage clubs in their organization
 * - Club owner: Can manage their club
 * - Club admin: Can manage their club
 * 
 * @param user - User to check
 * @param clubId - Club ID to check
 * @returns true if user can manage the club
 */
export async function canManageClub(
  user: PermissionUser,
  clubId: string
): Promise<boolean> {
  // Root admins can manage everything
  if (isRootAdmin(user)) {
    return true;
  }

  // Get club to check organization relationship
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { organizationId: true },
  });

  if (!club) {
    return false;
  }

  // Check if user is an organization admin for the club's organization
  if (club.organizationId) {
    const orgRole = await getOrganizationRole(user.id, club.organizationId);
    if (orgRole && orgRole.role === MembershipRole.ORGANIZATION_ADMIN) {
      return true;
    }
  }

  // Check if user is a club admin or owner
  const clubRole = await getClubRole(user.id, clubId);
  return clubRole !== null && 
    (clubRole.role === ClubMembershipRole.CLUB_OWNER || 
     clubRole.role === ClubMembershipRole.CLUB_ADMIN);
}

/**
 * Check if user can invite someone to a club with a specific role.
 * 
 * Invite rules:
 * - Root admin: Can invite anyone to any club
 * - Organization admin: Can invite club owners and admins to clubs in their organization
 * - Club owner: Can invite club admins to their club
 * - Club admin: Cannot invite anyone
 * 
 * @param user - User to check
 * @param clubId - Club ID to check
 * @param inviteRole - Role to be assigned via invite
 * @returns true if user can create the invite
 */
export async function canInviteToClub(
  user: PermissionUser,
  clubId: string,
  inviteRole: InviteRole
): Promise<boolean> {
  // Root admins can invite anyone
  if (isRootAdmin(user)) {
    return true;
  }

  // Only club roles are valid for club invites
  if (!CLUB_INVITE_ROLES.includes(inviteRole)) {
    return false;
  }

  // Get club to check organization relationship
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { organizationId: true },
  });

  if (!club) {
    return false;
  }

  // Check if user is an organization admin for the club's organization
  if (club.organizationId) {
    const orgRole = await getOrganizationRole(user.id, club.organizationId);
    if (orgRole && orgRole.role === MembershipRole.ORGANIZATION_ADMIN) {
      // Organization admins can invite anyone to their clubs
      return true;
    }
  }

  // Check if user is a club owner
  const clubRole = await getClubRole(user.id, clubId);
  
  // Club owners can only invite admins, not other owners
  if (clubRole && clubRole.role === ClubMembershipRole.CLUB_OWNER) {
    return inviteRole === "CLUB_ADMIN";
  }

  // Club admins cannot invite anyone
  return false;
}

/**
 * Check if user can access (read) a club.
 * 
 * Access rules:
 * - Root admin: Can access any club
 * - Organization admin: Can access clubs in their organization
 * - Club member (any role): Can access their club
 * 
 * @param user - User to check
 * @param clubId - Club ID to check
 * @returns true if user can access the club
 */
export async function canAccessClub(
  user: PermissionUser,
  clubId: string
): Promise<boolean> {
  // Root admins can access everything
  if (isRootAdmin(user)) {
    return true;
  }

  // Get club to check organization relationship
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { organizationId: true },
  });

  if (!club) {
    return false;
  }

  // Check if user is an organization admin for the club's organization
  if (club.organizationId) {
    const orgRole = await getOrganizationRole(user.id, club.organizationId);
    if (orgRole && orgRole.role === MembershipRole.ORGANIZATION_ADMIN) {
      return true;
    }
  }

  // Check if user has any membership in the club
  const clubRole = await getClubRole(user.id, clubId);
  return clubRole !== null;
}
