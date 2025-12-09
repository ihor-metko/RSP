import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";
import type { Prisma } from "@prisma/client";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetClubs } from "@/services/mockApiHandlers";

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
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const clubs = await mockGetClubs({
        adminType: authResult.adminType,
        managedIds: authResult.managedIds,
        search,
        city,
        status,
        organizationId,
        sportType,
        sortBy,
        sortOrder,
      });
      return NextResponse.json(clubs);
    }

    // Build the where clause based on admin type
    let whereClause: Prisma.ClubWhereInput = {};

    if (authResult.adminType === "organization_admin") {
      // Organization admin sees clubs in their managed organizations
      whereClause = {
        organizationId: {
          in: authResult.managedIds,
        },
      };
    } else if (authResult.adminType === "club_admin") {
      // Club admin sees only their managed clubs
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
          has: sportType,
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

    // Get total count for pagination
    const totalCount = await prisma.club.count({ where: whereClause });

    const clubs = await prisma.club.findMany({
      where: whereClause,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        shortDescription: true,
        location: true,
        city: true,
        contactInfo: true,
        openingHours: true,
        logo: true,
        heroImage: true,
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
            bookings: {
              select: {
                id: true,
              },
            },
          },
        },
        clubMemberships: {
          where: {
            role: ClubMembershipRole.CLUB_ADMIN,
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Process clubs to add counts and transform data
    const clubsWithCounts = clubs.map((club) => {
      const { indoorCount, outdoorCount, bookingCount } = club.courts.reduce(
        (acc, court) => {
          if (court.indoor) {
            acc.indoorCount++;
          } else {
            acc.outdoorCount++;
          }
          acc.bookingCount += court.bookings.length;
          return acc;
        },
        { indoorCount: 0, outdoorCount: 0, bookingCount: 0 }
      );

      return {
        id: club.id,
        name: club.name,
        shortDescription: club.shortDescription,
        location: club.location,
        city: club.city,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logo: club.logo,
        heroImage: club.heroImage,
        tags: club.tags,
        isPublic: club.isPublic,
        status: club.status,
        supportedSports: club.supportedSports,
        createdAt: club.createdAt,
        indoorCount,
        outdoorCount,
        courtCount: club.courts.length,
        bookingCount,
        organization: club.organization,
        admins: club.clubMemberships.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        })),
      };
    });

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
