/**
 * Invite Business Logic Helpers
 * 
 * Contains reusable business logic for the invite system including:
 * - Permission validation
 * - Owner uniqueness enforcement
 * - Duplicate invite checks
 * - User resolution
 */

import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";
import type { InviteRole, InviteStatus } from "@prisma/client";

/**
 * Check if a user has permission to invite someone with a specific role.
 * 
 * Business rules:
 * - Root admins can invite anyone to anything
 * - Organization admins can invite organization admins and club admins within their organization
 * - Club owners can invite club admins to their club
 * - Club admins cannot invite anyone
 * 
 * @param inviterUserId - ID of the user creating the invite
 * @param isRoot - Whether the inviter is a root admin
 * @param role - The role being invited
 * @param organizationId - Organization ID (for org-level invites)
 * @param clubId - Club ID (for club-level invites)
 * @returns Object with allowed boolean and optional error message
 */
export async function validateInvitePermissions(
  inviterUserId: string,
  isRoot: boolean,
  role: InviteRole,
  organizationId?: string | null,
  clubId?: string | null
): Promise<{ allowed: boolean; error?: string }> {
  // Root admins can invite anyone
  if (isRoot) {
    return { allowed: true };
  }

  // Organization-level invites (ORGANIZATION_OWNER, ORGANIZATION_ADMIN)
  if (role === "ORGANIZATION_OWNER" || role === "ORGANIZATION_ADMIN") {
    if (!organizationId) {
      return { allowed: false, error: "Organization ID is required for organization role invites" };
    }

    // Check if inviter is an organization admin for this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: inviterUserId,
          organizationId,
        },
      },
    });

    if (!membership || membership.role !== MembershipRole.ORGANIZATION_ADMIN) {
      return { allowed: false, error: "Only organization admins can invite organization members" };
    }

    // Organization admins cannot invite organization owners unless they are the primary owner
    if (role === "ORGANIZATION_OWNER" && !membership.isPrimaryOwner) {
      return { allowed: false, error: "Only organization owners can invite new organization owners" };
    }

    return { allowed: true };
  }

  // Club-level invites (CLUB_OWNER, CLUB_ADMIN)
  if (role === "CLUB_OWNER" || role === "CLUB_ADMIN") {
    if (!clubId) {
      return { allowed: false, error: "Club ID is required for club role invites" };
    }

    // Get the club to check organization membership
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { organizationId: true },
    });

    if (!club) {
      return { allowed: false, error: "Club not found" };
    }

    // Check if inviter is an organization admin for the club's organization
    if (club.organizationId) {
      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: inviterUserId,
            organizationId: club.organizationId,
          },
        },
      });

      if (orgMembership && orgMembership.role === MembershipRole.ORGANIZATION_ADMIN) {
        return { allowed: true };
      }
    }

    // Check if inviter is a club owner for this club
    const clubMembership = await prisma.clubMembership.findUnique({
      where: {
        userId_clubId: {
          userId: inviterUserId,
          clubId,
        },
      },
    });

    if (!clubMembership || clubMembership.role !== ClubMembershipRole.CLUB_OWNER) {
      return { allowed: false, error: "Only club owners or organization admins can invite club members" };
    }

    // Club owners cannot invite new club owners
    if (role === "CLUB_OWNER") {
      return { allowed: false, error: "Club owners cannot invite new club owners" };
    }

    return { allowed: true };
  }

  return { allowed: false, error: "Invalid invite role" };
}

/**
 * Enforce owner uniqueness constraints.
 * 
 * Business rules:
 * - Only one organization owner (isPrimaryOwner=true) per organization
 * - Only one club owner per club
 * 
 * @param role - The role being invited
 * @param organizationId - Organization ID (for org-level invites)
 * @param clubId - Club ID (for club-level invites)
 * @returns Object with allowed boolean and optional error message
 */
export async function enforceOwnerUniqueness(
  role: InviteRole,
  organizationId?: string | null,
  clubId?: string | null
): Promise<{ allowed: boolean; error?: string }> {
  // Check for existing organization owner
  if (role === "ORGANIZATION_OWNER") {
    if (!organizationId) {
      return { allowed: false, error: "Organization ID is required" };
    }

    // Check for existing primary owner
    const existingOwner = await prisma.membership.findFirst({
      where: {
        organizationId,
        isPrimaryOwner: true,
      },
    });

    if (existingOwner) {
      return { allowed: false, error: "Organization already has an owner" };
    }

    // Check for pending owner invites
    const pendingOwnerInvite = await prisma.invite.findFirst({
      where: {
        organizationId,
        role: "ORGANIZATION_OWNER",
        status: "PENDING",
      },
    });

    if (pendingOwnerInvite) {
      return { allowed: false, error: "There is already a pending owner invite for this organization" };
    }

    return { allowed: true };
  }

  // Check for existing club owner
  if (role === "CLUB_OWNER") {
    if (!clubId) {
      return { allowed: false, error: "Club ID is required" };
    }

    // Check for existing club owner
    const existingOwner = await prisma.clubMembership.findFirst({
      where: {
        clubId,
        role: ClubMembershipRole.CLUB_OWNER,
      },
    });

    if (existingOwner) {
      return { allowed: false, error: "Club already has an owner" };
    }

    // Check for pending owner invites
    const pendingOwnerInvite = await prisma.invite.findFirst({
      where: {
        clubId,
        role: "CLUB_OWNER",
        status: "PENDING",
      },
    });

    if (pendingOwnerInvite) {
      return { allowed: false, error: "There is already a pending owner invite for this club" };
    }

    return { allowed: true };
  }

  // Non-owner roles don't have uniqueness constraints
  return { allowed: true };
}

/**
 * Check for existing active (pending) invite with the same email and scope.
 * Only one active invite per (email + scope) is allowed.
 * 
 * @param email - Email address (normalized)
 * @param organizationId - Organization ID (for org-level invites)
 * @param clubId - Club ID (for club-level invites)
 * @returns Object with exists boolean and optional existing invite
 */
export async function checkExistingActiveInvite(
  email: string,
  organizationId?: string | null,
  clubId?: string | null
): Promise<{ exists: boolean; invite?: { id: string; role: InviteRole; status: InviteStatus } }> {
  const existingInvite = await prisma.invite.findFirst({
    where: {
      email,
      organizationId: organizationId || null,
      clubId: clubId || null,
      status: "PENDING",
    },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (existingInvite) {
    return { exists: true, invite: existingInvite };
  }

  return { exists: false };
}

/**
 * Resolve or create a user by email.
 * If the user exists, returns their ID.
 * If not, returns null (user will be created on signup).
 * 
 * @param email - Email address (normalized)
 * @returns User ID if exists, null otherwise
 */
export async function resolveUserByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id || null;
}

/**
 * Map invite role to membership role and determine isPrimaryOwner flag.
 * 
 * @param inviteRole - The invite role
 * @returns Object with membershipRole and isPrimaryOwner flag
 */
export function mapInviteRoleToMembershipRole(inviteRole: InviteRole): {
  type: "organization" | "club";
  role: MembershipRole | ClubMembershipRole;
  isPrimaryOwner?: boolean;
} {
  switch (inviteRole) {
    case "ORGANIZATION_OWNER":
      return {
        type: "organization",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: true,
      };
    case "ORGANIZATION_ADMIN":
      return {
        type: "organization",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: false,
      };
    case "CLUB_OWNER":
      return {
        type: "club",
        role: ClubMembershipRole.CLUB_OWNER,
      };
    case "CLUB_ADMIN":
      return {
        type: "club",
        role: ClubMembershipRole.CLUB_ADMIN,
      };
  }
}
