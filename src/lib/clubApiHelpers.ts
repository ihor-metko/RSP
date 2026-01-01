/**
 * Shared utilities for club API endpoints
 */

/**
 * Standard include clause for fetching club data with all relations
 * Use this when returning club data from API endpoints to ensure consistency
 */
export const CLUB_DETAIL_INCLUDE = {
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  courts: {
    orderBy: { name: "asc" as const },
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
    orderBy: { sortOrder: "asc" as const },
  },
  businessHours: {
    orderBy: { dayOfWeek: "asc" as const },
  },
};

/**
 * Format club data by parsing JSON fields
 * Converts JSON strings for logoData and bannerData to objects
 * 
 * @param club - Raw club data from database
 * @returns Formatted club data with parsed JSON fields
 */
export function formatClubResponse(club: {
  logoData: string | null;
  bannerData: string | null;
  [key: string]: unknown;
}) {
  return {
    ...club,
    logoData: club.logoData ? JSON.parse(club.logoData) : null,
    bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
  };
}
