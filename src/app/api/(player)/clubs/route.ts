import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

    // q -> search name and address (case-insensitive)
    if (q) {
      conditions.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    // city -> match city or part of address
    if (city) {
      conditions.push({
        location: { contains: city, mode: "insensitive" },
      });
    }

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
        location: true,
        city: true,
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
          },
        },
      },
    });

    // Process clubs to add indoor/outdoor counts
    const clubsWithCounts = clubs.map((club) => {
      const indoorCount = club.courts.filter((c) => c.indoor).length;
      const outdoorCount = club.courts.filter((c) => !c.indoor).length;

      // Filter by indoor param if provided
      if (indoor === "true" && indoorCount === 0) {
        return null;
      }

      return {
        id: club.id,
        name: club.name,
        shortDescription: club.shortDescription,
        location: club.location,
        city: club.city,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logoData: club.logoData ? JSON.parse(club.logoData) : null,
        bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
        tags: club.tags,
        createdAt: club.createdAt,
        indoorCount,
        outdoorCount,
      };
    }).filter((club): club is NonNullable<typeof club> => club !== null);

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
