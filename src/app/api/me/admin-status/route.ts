import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * Admin type enumeration.
 */
export type AdminType = "root_admin" | "organization_admin" | "club_admin" | "none";

/**
 * Assigned club info for ClubAdmin sidebar navigation.
 */
export interface AssignedClub {
  id: string;
  name: string;
}

/**
 * Admin status response type.
 * 
 * @deprecated This endpoint is deprecated. Use GET /api/me instead which returns
 * the same information plus additional user data in a single request.
 */
export interface AdminStatusResponse {
  isAdmin: boolean;
  adminType: AdminType;
  isRoot: boolean;
  /**
   * For organization admins, the organization IDs they manage.
   * For club admins, the club IDs they manage.
   * For root admins, this is empty (they have access to all).
   */
  managedIds: string[];
  /**
   * For club admins, includes the assigned club info for direct navigation.
   * Uses the first club if multiple are assigned (for future use).
   */
  assignedClub?: AssignedClub;
  /**
   * For organization admins, indicates if they are the primary owner
   * of at least one organization they manage.
   */
  isPrimaryOwner?: boolean;
}

/**
 * GET /api/me/admin-status
 * 
 * @deprecated This endpoint is deprecated and maintained only for backwards compatibility.
 * Use GET /api/me instead which returns the same information plus additional user data
 * in a single request.
 * 
 * Returns the admin status of the current user for client-side awareness.
 * This endpoint is used by the UI to determine what admin elements to show/hide.
 * 
 * Note: Client-side should never enforce authorization, only use this
 * to render appropriate UI elements. All authorization checks must
 * happen on the server.
 * 
 * @returns Admin status including type and managed resource IDs
 */
export async function GET(): Promise<NextResponse<AdminStatusResponse | { error: string }>> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const isRoot = session.user.isRoot ?? false;

  // Root admins have full access
  if (isRoot) {
    const response: AdminStatusResponse = {
      isAdmin: true,
      adminType: "root_admin",
      isRoot: true,
      managedIds: [],
    };
    return NextResponse.json(response);
  }

  // Check if user is an organization admin
  const organizationMemberships = await prisma.membership.findMany({
    where: {
      userId,
      role: MembershipRole.ORGANIZATION_ADMIN,
    },
    select: {
      organizationId: true,
      isPrimaryOwner: true,
    },
  });

  if (organizationMemberships.length > 0) {
    // Check if user is a primary owner of any organization
    const isPrimaryOwner = organizationMemberships.some((m) => m.isPrimaryOwner);
    const response: AdminStatusResponse = {
      isAdmin: true,
      adminType: "organization_admin",
      isRoot: false,
      managedIds: organizationMemberships.map((m) => m.organizationId),
      isPrimaryOwner,
    };
    return NextResponse.json(response);
  }

  // Check if user is a club admin
  const clubMemberships = await prisma.clubMembership.findMany({
    where: {
      userId,
      role: ClubMembershipRole.CLUB_ADMIN,
    },
    select: {
      clubId: true,
      club: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (clubMemberships.length > 0) {
    // Use the first club as the assigned club for navigation
    const firstClub = clubMemberships[0].club;
    const response: AdminStatusResponse = {
      isAdmin: true,
      adminType: "club_admin",
      isRoot: false,
      managedIds: clubMemberships.map((m) => m.clubId),
      assignedClub: firstClub ? {
        id: firstClub.id,
        name: firstClub.name,
      } : undefined,
    };
    return NextResponse.json(response);
  }

  // User is not an admin
  const response: AdminStatusResponse = {
    isAdmin: false,
    adminType: "none",
    isRoot: false,
    managedIds: [],
  };
  return NextResponse.json(response);
}
