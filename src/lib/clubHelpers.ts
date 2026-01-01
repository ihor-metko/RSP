import { prisma } from "@/lib/prisma";

/**
 * Helper function to fetch and format a club with all related data
 * Used to ensure consistent club object structure across all API endpoints
 * 
 * @param clubId - The ID of the club to fetch
 * @returns Formatted club object with parsed JSON fields, or null if not found
 */
export async function fetchFormattedClub(clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      courts: {
        orderBy: { name: "asc" },
      },
      coaches: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
      gallery: {
        orderBy: { sortOrder: "asc" },
      },
      businessHours: {
        orderBy: { dayOfWeek: "asc" },
      },
    },
  });

  if (!club) {
    return null;
  }

  // Parse JSON fields
  return {
    ...club,
    logoData: club.logoData ? JSON.parse(club.logoData) : null,
    bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
  };
}
