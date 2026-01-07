import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parseAddress } from "@/types/address";

/**
 * Helper function to safely parse JSON data
 * Returns null if parsing fails instead of throwing
 */
function safeJsonParse<T = unknown>(jsonString: string | null | undefined): T | null {
  if (!jsonString) {
    return null;
  }
  
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

// Public endpoint - no authentication required
export async function GET(request: Request) {
  try {
    // Parse query parameters for search
    const url = new URL(request.url);
    // Support both 'q' (new) and 'search' (legacy) params
    const q = url.searchParams.get("q")?.trim() || url.searchParams.get("search")?.trim() || "";
    const city = url.searchParams.get("city")?.trim() || "";
    const indoor = url.searchParams.get("indoor");
    const popular = url.searchParams.get("popular");
    const limit = url.searchParams.get("limit");

    // Build where clause for filtering
    const whereClause: Prisma.ClubWhereInput = {};
    const conditions: Prisma.ClubWhereInput[] = [];

    // q -> search name only (address search removed as it's now in JSON field)
    if (q) {
      conditions.push({
        name: { contains: q, mode: "insensitive" },
      });
    }

    // Note: city filtering is done post-fetch for case-insensitive matching
    // because Prisma's JSON field string_contains is case-sensitive

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    // Only show published clubs from published organizations
    whereClause.isPublic = true;
    whereClause.organization = {
      isPublic: true,
    };

    // Fetch clubs with optional filtering
    const clubs = await prisma.club.findMany({
      where: whereClause,
      orderBy: popular === "true" ? { createdAt: "desc" } : { createdAt: "desc" },
      take: limit ? parseInt(limit, 10) : undefined,
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
        isPublic: true,
        organization: {
          select: {
            isPublic: true,
          },
        },
        courts: {
          select: {
            id: true,
            indoor: true,
            isPublished: true,
          },
        },
      },
    });

    // Process clubs to add indoor/outdoor counts and apply city filter
    // Only show clubs with published courts (isPublished = true)
    const clubsWithCounts = clubs
      .map((club) => {
        // Count only published courts
        const publishedCourts = club.courts.filter((c) => c.isPublished);
        const publishedCourtsCount = publishedCourts.length;
        
        // Early exit: Filter out clubs with no published courts
        if (publishedCourtsCount === 0) {
          return null;
        }
        
        const indoorCount = publishedCourts.filter((c) => c.indoor).length;
        const outdoorCount = publishedCourts.filter((c) => !c.indoor).length;

        // Early exit: Filter by indoor param if provided
        if (indoor === "true" && indoorCount === 0) {
          return null;
        }

        // Parse address from JSON if available
        const parsedAddress = parseAddress(club.address);

        // Early exit: Apply case-insensitive city filter (post-fetch)
        if (city && parsedAddress?.city) {
          const cityLower = city.toLowerCase();
          const clubCityLower = parsedAddress.city.toLowerCase();
          if (!clubCityLower.includes(cityLower)) {
            return null;
          }
        } else if (city && !parsedAddress?.city) {
          // If city filter is provided but club has no city, exclude it
          return null;
        }

        return {
          id: club.id,
          name: club.name,
          shortDescription: club.shortDescription,
          address: parsedAddress || null,
          contactInfo: club.contactInfo,
          openingHours: club.openingHours,
          logoData: safeJsonParse(club.logoData),
          bannerData: safeJsonParse(club.bannerData),
          tags: club.tags,
          createdAt: club.createdAt,
          indoorCount,
          outdoorCount,
          publishedCourtsCount,
        };
      })
      .filter((club): club is NonNullable<typeof club> => club !== null);

    return NextResponse.json(clubsWithCounts);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching clubs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
