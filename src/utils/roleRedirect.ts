import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

/**
 * Role-based redirect utilities for the application.
 * Handles all admin types: Root Admin, Organization Admin, Club Admin.
 * 
 * This module uses centralized role definitions from @/constants/roles
 * and follows the unified authorization model.
 */

/**
 * Admin type enumeration for redirect logic.
 */
export type AdminType = "root_admin" | "organization_admin" | "club_admin" | "none";

/**
 * Admin status result type for the checkUserAdminStatus function.
 */
export interface AdminStatusResult {
  isAdmin: boolean;
  adminType: AdminType;
  managedIds: string[];
}

/**
 * Get the homepage path for a user based on their isRoot status.
 * Root admins go to the admin dashboard, regular users go to the home page.
 *
 * @param isRoot Whether the user is a root admin
 * @returns The homepage path
 * @deprecated Use getAdminHomepage(adminType) with checkUserAdminStatus() for comprehensive
 *             admin type handling. This function only handles root admin, not organization
 *             or club admins. Migrate by replacing:
 *             - getRoleHomepage(isRoot) 
 *             with:
 *             - const { adminType } = await checkUserAdminStatus(userId, isRoot);
 *             - getAdminHomepage(adminType);
 */
export function getRoleHomepage(isRoot: boolean | undefined): string {
  if (isRoot) {
    return "/admin/dashboard";
  }
  return "/";
}

/**
 * Get the appropriate admin dashboard URL based on admin type.
 * All admin types are redirected to the unified admin dashboard.
 *
 * @param adminType The type of admin role
 * @returns The admin dashboard path
 */
export function getAdminHomepage(adminType: AdminType): string {
  // All admin types use the same unified dashboard
  if (adminType !== "none") {
    return "/admin/dashboard";
  }
  return "/";
}

/**
 * Check if a user has any admin role by querying the database.
 * This function checks for:
 * - Root Admin: user.isRoot = true
 * - Organization Admin: Has ORGANIZATION_ADMIN role in any Membership
 * - Club Admin: Has CLUB_ADMIN role in any ClubMembership
 *
 * @param userId The user ID to check
 * @param isRoot Whether the user is a root admin (from session)
 * @returns Promise resolving to admin status with type and managed resource IDs
 */
export async function checkUserAdminStatus(
  userId: string,
  isRoot: boolean
): Promise<AdminStatusResult> {
  // Root admins have full access - no database query needed
  if (isRoot) {
    return {
      isAdmin: true,
      adminType: "root_admin",
      managedIds: [],
    };
  }

  // Run both membership queries concurrently for better performance
  const [organizationMemberships, clubMemberships] = await Promise.all([
    prisma.membership.findMany({
      where: {
        userId,
        role: MembershipRole.ORGANIZATION_ADMIN,
      },
      select: {
        organizationId: true,
      },
    }),
    prisma.clubMembership.findMany({
      where: {
        userId,
        role: ClubMembershipRole.CLUB_ADMIN,
      },
      select: {
        clubId: true,
      },
    }),
  ]);

  // Check organization admin first (higher priority)
  if (organizationMemberships.length > 0) {
    return {
      isAdmin: true,
      adminType: "organization_admin",
      managedIds: organizationMemberships.map((m) => m.organizationId),
    };
  }

  // Check club admin
  if (clubMemberships.length > 0) {
    return {
      isAdmin: true,
      adminType: "club_admin",
      managedIds: clubMemberships.map((m) => m.clubId),
    };
  }

  // User is not an admin
  return {
    isAdmin: false,
    adminType: "none",
    managedIds: [],
  };
}
