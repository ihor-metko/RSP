import { prisma } from "@/lib/prisma";
import type { PublicClubCardData } from "@/types/home";
import { parseAddress } from "@/types/address";

/**
 * Fetch popular clubs with court counts for the home page
 * This is a server-side function that can be called from Server Components
 * Returns the same data structure as /api/clubs endpoint for consistency
 */
export async function getPopularClubs(limit: number = 4): Promise<PublicClubCardData[]> {
  try {
    const clubs = await prisma.club.findMany({
      where: {
        isPublic: true,
        organization: {
          isPublic: true,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        address: true,
        contactInfo: true,
        openingHours: true,
        logoData: true,
        bannerData: true,
        tags: true,
        createdAt: true,
        courts: {
          select: {
            id: true,
            indoor: true,
          },
        },
      },
    });

    return clubs.map((club) => {
      const indoorCount = club.courts.filter((c) => c.indoor).length;
      const outdoorCount = club.courts.filter((c) => !c.indoor).length;

      // Parse address from JSON if available
      const parsedAddress = parseAddress(club.address);

      return {
        id: club.id,
        name: club.name,
        shortDescription: club.shortDescription,
        address: parsedAddress || null,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logoData: club.logoData ? JSON.parse(club.logoData) : null,
        bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
        tags: club.tags,
        createdAt: club.createdAt.toISOString(),
        indoorCount,
        outdoorCount,
      };
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching popular clubs:", error);
    }
    return [];
  }
}
