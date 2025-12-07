import { prisma } from "@/lib/prisma";
import type { ClubWithCounts } from "@/types/home";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode, getMockClubs, getMockCourts } from "@/services/mockDb";

/**
 * Fetch popular clubs with court counts for the home page
 * This is a server-side function that can be called from Server Components
 */
export async function getPopularClubs(limit: number = 4): Promise<ClubWithCounts[]> {
  try {
    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockClubs = getMockClubs();
      const mockCourts = getMockCourts();
      
      return mockClubs
        .filter((club) => club.isPublic)
        .slice(0, limit)
        .map((club) => {
          const clubCourts = mockCourts.filter((c) => c.clubId === club.id);
          return {
            id: club.id,
            name: club.name,
            location: club.location,
            contactInfo: club.contactInfo,
            openingHours: club.openingHours,
            shortDescription: club.shortDescription,
            logo: club.logo,
            indoorCount: clubCourts.filter((c) => c.indoor).length,
            outdoorCount: clubCourts.filter((c) => !c.indoor).length,
          };
        });
    }

    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        location: true,
        contactInfo: true,
        openingHours: true,
        shortDescription: true,
        logo: true,
        courts: {
          select: {
            id: true,
            indoor: true,
          },
        },
      },
    });

    return clubs.map((club) => ({
      id: club.id,
      name: club.name,
      location: club.location,
      contactInfo: club.contactInfo,
      openingHours: club.openingHours,
      shortDescription: club.shortDescription,
      logo: club.logo,
      indoorCount: club.courts.filter((c) => c.indoor).length,
      outdoorCount: club.courts.filter((c) => !c.indoor).length,
    }));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching popular clubs:", error);
    }
    return [];
  }
}
