import { prisma } from "@/lib/prisma";

/**
 * Check if an admin has access to a specific club
 * 
 * @param adminType - Type of admin (root_admin, organization_admin, club_owner, club_admin)
 * @param managedIds - Array of IDs the admin manages (org IDs or club IDs)
 * @param clubId - The club ID to check access for
 * @returns Promise<boolean> - Whether the admin has access
 */
export async function canAccessClub(
  adminType: "root_admin" | "organization_admin" | "club_owner" | "club_admin",
  managedIds: string[],
  clubId: string
): Promise<boolean> {
  // Root admins have access to all clubs
  if (adminType === "root_admin") {
    return true;
  }

  // Club owners have access to their own clubs
  if (adminType === "club_owner") {
    return managedIds.includes(clubId);
  }

  // Club admins have access to their own clubs
  if (adminType === "club_admin") {
    return managedIds.includes(clubId);
  }

  // Organization admins have access to clubs in their organizations
  if (adminType === "organization_admin") {
    // Check if club belongs to one of the managed organizations
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { organizationId: true },
    });
    return club?.organizationId ? managedIds.includes(club.organizationId) : false;
  }

  return false;
}
