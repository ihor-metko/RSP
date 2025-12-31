import { useUserStore } from "@/stores/useUserStore";
import { ClubMembershipRole } from "@/constants/roles";

/**
 * Hook to determine if the current user can edit a specific club.
 * 
 * Users who can edit:
 * - ROOT_ADMIN (platform-wide super admin)
 * - CLUB_OWNER (club owner)
 * - CLUB_ADMIN (club administrator)
 * 
 * Users who CANNOT edit:
 * - ORGANIZATION_ADMIN (organization administrators)
 * - Regular members
 * 
 * @param clubId - The ID of the club to check edit permissions for
 * @returns true if the user can edit the club, false otherwise
 */
export function useCanEditClub(clubId: string | null | undefined): boolean {
  const user = useUserStore((state) => state.user);
  const clubMemberships = useUserStore((state) => state.clubMemberships);

  // If no club ID provided, return false
  if (!clubId) {
    return false;
  }

  // Root admins can edit any club
  if (user?.isRoot) {
    return true;
  }

  // Check if user has a club membership for this club
  const clubMembership = clubMemberships.find((m) => m.clubId === clubId);

  // User must have CLUB_OWNER or CLUB_ADMIN role to edit
  if (clubMembership) {
    return (
      clubMembership.role === ClubMembershipRole.CLUB_OWNER ||
      clubMembership.role === ClubMembershipRole.CLUB_ADMIN
    );
  }

  // User has no club membership or insufficient role
  return false;
}
