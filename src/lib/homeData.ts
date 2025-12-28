import { prisma } from "@/lib/prisma";
import type { ClubWithCounts } from "@/types/home";

/**
 * Fetch popular clubs with court counts for the home page
 * This is a server-side function that can be called from Server Components
 */
export async function getPopularClubs(limit: number = 4): Promise<ClubWithCounts[]> {
  try {
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
        logoData: true,
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
      logoData: club.logoData ? JSON.parse(club.logoData) : null,
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
