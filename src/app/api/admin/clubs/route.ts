import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import type { Prisma, SportType } from "@prisma/client";

export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const city = searchParams.get("city") || "";
    const status = searchParams.get("status") || "";
    const organizationId = searchParams.get("organizationId") || "";
    const sportType = searchParams.get("sportType") || "";
    const courtCountMin = searchParams.get("courtCountMin") || "";
    const courtCountMax = searchParams.get("courtCountMax") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Build the where clause based on admin type
    let whereClause: Prisma.ClubWhereInput = {};

    if (authResult.adminType === "organization_admin") {
      // Organization admin sees clubs in their managed organizations
      whereClause = {
        organizationId: {
          in: authResult.managedIds,
        },
      };
    } else if (authResult.adminType === "club_owner" || authResult.adminType === "club_admin") {
      // Club owner and club admin see only their managed clubs
      whereClause = {
        id: {
          in: authResult.managedIds,
        },
      };
    }
    // Root admin sees all clubs (no where clause by default)

    // Apply search filter
    if (search) {
      whereClause = {
        ...whereClause,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    // Apply city filter
    if (city) {
      whereClause = { ...whereClause, city };
    }

    // Apply status filter
    if (status) {
      whereClause = { ...whereClause, status };
    }

    // Apply organization filter (only for root admin)
    if (organizationId && authResult.adminType === "root_admin") {
      whereClause = { ...whereClause, organizationId };
    }

    // Apply sport type filter
    if (sportType) {
      whereClause = {
        ...whereClause,
        supportedSports: {
          has: sportType as SportType,
        },
      };
    }

    // Determine sort order
    const orderBy: Prisma.ClubOrderByWithRelationInput = {};
    if (sortBy === "name") {
      orderBy.name = sortOrder as "asc" | "desc";
    } else if (sortBy === "city") {
      orderBy.city = sortOrder as "asc" | "desc";
    } else {
      orderBy.createdAt = sortOrder as "asc" | "desc";
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Get total count for pagination (before court count filter)
    const totalCountBeforeCourtFilter = await prisma.club.count({ where: whereClause });

    // If court count filter is specified, we need to fetch all clubs first then filter
    // Otherwise use standard pagination
    const needsPostFilterPagination = courtCountMin || courtCountMax;

    // For post-filtering, limit to a reasonable maximum to prevent memory issues
    const MAX_CLUBS_FOR_POST_FILTER = 1000;

    const clubs = await prisma.club.findMany({
      where: whereClause,
      orderBy,
      skip: needsPostFilterPagination ? undefined : skip,
      take: needsPostFilterPagination ? MAX_CLUBS_FOR_POST_FILTER : take,
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
        metadata: true,
        tags: true,
        isPublic: true,
        status: true,
        supportedSports: true,
        createdAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
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

    // Process clubs to add counts and transform data
    let clubsWithCounts = clubs.map((club) => {
      const { indoorCount, outdoorCount } = club.courts.reduce(
        (acc, court) => {
          if (court.indoor) {
            acc.indoorCount++;
          } else {
            acc.outdoorCount++;
          }
          return acc;
        },
        { indoorCount: 0, outdoorCount: 0 }
      );

      return {
        id: club.id,
        name: club.name,
        organizationId: club.organizationId,
        shortDescription: club.shortDescription,
        location: club.location,
        city: club.city,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logoData: club.logoData ? JSON.parse(club.logoData) : null,
        bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
        metadata: club.metadata,
        tags: club.tags,
        isPublic: club.isPublic,
        status: club.status,
        supportedSports: club.supportedSports,
        createdAt: club.createdAt,
        indoorCount,
        outdoorCount,
        courtCount: club.courts.length,
        organization: club.organization,
      };
    });

    // Apply court count filter if specified
    if (courtCountMin || courtCountMax) {
      const minCount = courtCountMin ? parseInt(courtCountMin, 10) : 0;
      const maxCount = courtCountMax ? parseInt(courtCountMax, 10) : Infinity;

      // Validate parsed values
      if ((courtCountMin && isNaN(minCount)) || (courtCountMax && isNaN(maxCount))) {
        return NextResponse.json(
          { error: "Invalid court count filter values" },
          { status: 400 }
        );
      }

      clubsWithCounts = clubsWithCounts.filter((club) => {
        return club.courtCount >= minCount && club.courtCount <= maxCount;
      });
    }

    // Calculate total count before pagination
    const totalCount = needsPostFilterPagination ? clubsWithCounts.length : totalCountBeforeCourtFilter;

    // Apply pagination if we did post-filtering
    if (needsPostFilterPagination) {
      const startIndex = skip;
      const endIndex = skip + take;
      clubsWithCounts = clubsWithCounts.slice(startIndex, endIndex);
    }

    console.log(`Fetched ${clubsWithCounts.length} clubs (page ${page})`, clubsWithCounts);
    return NextResponse.json({
      clubs: clubsWithCounts,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: Request) {
  // This endpoint is deprecated - use /api/admin/clubs/new instead
  // which enforces proper organization selection
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use /api/admin/clubs/new to create clubs with proper organization selection." },
    { status: 410 }
  );
}
