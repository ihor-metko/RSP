import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * Admin type enumeration.
 */
export type AdminType = "root_admin" | "organization_admin" | "club_admin" | "none";

/**
 * Assigned club info for ClubAdmin navigation.
 */
export interface AssignedClub {
  id: string;
  name: string;
}

/**
 * Membership info for organization memberships.
 */
export interface MembershipInfo {
  organizationId: string;
  role: string;
  isPrimaryOwner: boolean;
}

/**
 * Club membership info.
 */
export interface ClubMembershipInfo {
  clubId: string;
  role: string;
}

/**
 * Admin status information.
 */
export interface AdminStatus {
  isAdmin: boolean;
  adminType: AdminType;
  /**
   * For organization admins, the organization IDs they manage.
   * For club admins, the club IDs they manage.
   * For root admins, this is empty (they have access to all).
   */
  managedIds: string[];
  /**
   * For club admins, includes the assigned club info for direct navigation.
   */
  assignedClub?: AssignedClub;
  /**
   * For organization admins, indicates if they are the primary owner
   * of at least one organization they manage.
   */
  isPrimaryOwner?: boolean;
}

/**
 * User information response type - consolidated with admin status.
 */
export interface MeResponse {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
  isRoot: boolean;
  adminStatus: AdminStatus;
  memberships: MembershipInfo[];
  clubMemberships: ClubMembershipInfo[];
}

/**
 * GET /api/me
 * 
 * Returns the current user's information and admin status for client-side awareness.
 * This endpoint consolidates user profile and admin status into a single canonical endpoint.
 * 
 * This endpoint is used by the UI to determine what elements to show/hide.
 * 
 * Note: Client-side should never enforce authorization, only use this
 * to render appropriate UI elements. All authorization checks must
 * happen on the server.
 * 
 * @returns User information including userId, isRoot flag, admin status, and memberships
 */
export async function GET(): Promise<NextResponse<MeResponse | { error: string }>> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Initialize admin status
  let adminStatus: AdminStatus;
  let memberships: MembershipInfo[] = [];
  let clubMemberships: ClubMembershipInfo[] = [];

  // Root admins have full access
  if (isRoot) {
    adminStatus = {
      isAdmin: true,
      adminType: "root_admin",
      managedIds: [],
    };
  } else {
    // Fetch organization memberships
    const orgMemberships = await prisma.membership.findMany({
      where: {
        userId,
      },
      select: {
        organizationId: true,
        role: true,
        isPrimaryOwner: true,
      },
    });

    memberships = orgMemberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      isPrimaryOwner: m.isPrimaryOwner,
    }));

    // Fetch club memberships
    const clubMembershipRecords = await prisma.clubMembership.findMany({
      where: {
        userId,
      },
      select: {
        clubId: true,
        role: true,
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    clubMemberships = clubMembershipRecords.map((m) => ({
      clubId: m.clubId,
      role: m.role,
    }));

    // Determine admin status based on memberships
    const orgAdminMemberships = orgMemberships.filter(
      (m) => m.role === MembershipRole.ORGANIZATION_ADMIN
    );

    if (orgAdminMemberships.length > 0) {
      // User is an organization admin
      const isPrimaryOwner = orgAdminMemberships.some((m) => m.isPrimaryOwner);
      adminStatus = {
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: orgAdminMemberships.map((m) => m.organizationId),
        isPrimaryOwner,
      };
    } else {
      // Check if user is a club admin
      const clubAdminMemberships = clubMembershipRecords.filter(
        (m) => m.role === ClubMembershipRole.CLUB_ADMIN
      );

      if (clubAdminMemberships.length > 0) {
        // Use the first club as the assigned club for navigation
        const firstClub = clubAdminMemberships[0].club;
        adminStatus = {
          isAdmin: true,
          adminType: "club_admin",
          managedIds: clubAdminMemberships.map((m) => m.clubId),
          assignedClub: firstClub
            ? {
                id: firstClub.id,
                name: firstClub.name,
              }
            : undefined,
        };
      } else {
        // User is not an admin
        adminStatus = {
          isAdmin: false,
          adminType: "none",
          managedIds: [],
        };
      }
    }
  }

  const response: MeResponse = {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isRoot,
    adminStatus,
    memberships,
    clubMemberships,
  };

  return NextResponse.json(response);
}
