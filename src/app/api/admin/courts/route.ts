import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import type { Prisma } from "@prisma/client";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetCourts } from "@/services/mockApiHandlers";

/**
 * GET /api/admin/courts
 * 
 * Returns courts based on admin role with filtering, sorting, and pagination:
 * - Root Admin: sees all courts across all clubs and organizations
 * - Organization Admin: sees only courts within their organization's clubs
 * - Club Admin: sees only courts within their assigned club(s)
 * 
 * Query parameters:
 * - search: Search by court name
 * - clubId: Filter by club ID
 * - status: Filter by status (active/inactive/all)
 * - sortBy: Sort field (name/bookings)
 * - sortOrder: Sort order (asc/desc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const clubId = searchParams.get("clubId") || "";
    const status = searchParams.get("status") || "all";
    const sportType = searchParams.get("sportType") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      return NextResponse.json(
        await mockGetCourts({
          adminType: authResult.adminType,
          managedIds: authResult.managedIds,
          filters: {
            search,
            clubId,
            status,
            sportType,
            sortBy,
            sortOrder,
            page,
            limit,
          },
        })
      );
    }

    // Build the where clause based on admin type
    let whereClause: Prisma.CourtWhereInput = {};

    if (authResult.adminType === "organization_admin") {
      // Organization admin sees courts in clubs belonging to their organizations
      whereClause = {
        club: {
          organizationId: {
            in: authResult.managedIds,
          },
        },
      };
    } else if (authResult.adminType === "club_admin") {
      // Club admin sees only courts in their managed clubs
      whereClause = {
        clubId: {
          in: authResult.managedIds,
        },
      };
    }
    // Root admin sees all courts (no additional where clause)

    // Add search filter
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // Add club filter
    if (clubId) {
      whereClause.clubId = clubId;
    }

    // Add status filter
    if (status === "active") {
      whereClause.isActive = true;
    } else if (status === "inactive") {
      whereClause.isActive = false;
    }
    // "all" status shows both active and inactive

    // Add sport type filter
    if (sportType) {
      whereClause.sportType = sportType;
    }

    // Build orderBy clause
    let orderBy: Prisma.CourtOrderByWithRelationInput | Prisma.CourtOrderByWithRelationInput[] = { createdAt: "desc" };
    
    if (sortBy === "name") {
      orderBy = { name: sortOrder as "asc" | "desc" };
    } else if (sortBy === "bookings") {
      // For sorting by bookings count, we need to use a different approach
      // We'll fetch all matching courts and sort in-memory
      orderBy = { createdAt: "desc" };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await prisma.court.count({
      where: whereClause,
    });

    // Fetch courts
    const courts = await prisma.court.findMany({
      where: whereClause,
      orderBy,
      skip: sortBy === "bookings" ? 0 : skip,
      take: sortBy === "bookings" ? undefined : limit,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        surface: true,
        indoor: true,
        sportType: true,
        isActive: true,
        defaultPriceCents: true,
        createdAt: true,
        updatedAt: true,
        club: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Transform the response for easier frontend consumption
    let courtsWithDetails = courts.map((court) => ({
      id: court.id,
      name: court.name,
      slug: court.slug,
      type: court.type,
      surface: court.surface,
      indoor: court.indoor,
      sportType: court.sportType,
      isActive: court.isActive,
      defaultPriceCents: court.defaultPriceCents,
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
      club: {
        id: court.club.id,
        name: court.club.name,
      },
      organization: court.club.organization
        ? {
            id: court.club.organization.id,
            name: court.club.organization.name,
          }
        : null,
      bookingCount: court._count.bookings,
    }));

    // Sort by bookings if requested (in-memory sorting)
    if (sortBy === "bookings") {
      courtsWithDetails.sort((a, b) => {
        const comparison = a.bookingCount - b.bookingCount;
        return sortOrder === "asc" ? comparison : -comparison;
      });
      // Apply pagination after sorting
      courtsWithDetails = courtsWithDetails.slice(skip, skip + limit);
    }

    return NextResponse.json({
      courts: courtsWithDetails,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: page * limit < totalCount,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching courts:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
