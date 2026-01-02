import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";

/**
 * GET /api/admin/organizations/[id]/clubs
 * Returns clubs for a given organization with minimal statistics.
 *
 * Statistics per club:
 * - Number of courts
 * - Number of active upcoming bookings (pending, paid, reserved, confirmed, start >= now)
 * - Number of past bookings (start < now)
 *
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await requireOrganizationAdmin(id);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch clubs for the organization
    const [clubs, totalCount] = await Promise.all([
      prisma.club.findMany({
        where: { organizationId: id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              courts: true,
            },
          },
        },
      }),
      prisma.club.count({
        where: { organizationId: id },
      }),
    ]);

    // Get all club IDs for batch fetching booking statistics
    const clubIds = clubs.map((club) => club.id);
    const now = new Date();

    // Batch fetch booking statistics for all clubs to avoid N+1 queries
    const [activeUpcomingBookings, pastBookings] = await Promise.all([
      // Active upcoming bookings grouped by club
      prisma.booking.groupBy({
        by: ['courtId'],
        where: {
          court: {
            clubId: { in: clubIds },
          },
          status: { in: ["pending", "paid", "reserved", "confirmed"] },
          start: { gte: now },
        },
        _count: {
          id: true,
        },
      }),
      // Past bookings grouped by club
      prisma.booking.groupBy({
        by: ['courtId'],
        where: {
          court: {
            clubId: { in: clubIds },
          },
          start: { lt: now },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    // Fetch court to club mapping for aggregation
    const courts = await prisma.court.findMany({
      where: {
        clubId: { in: clubIds },
      },
      select: {
        id: true,
        clubId: true,
      },
    });

    // Create a map of courtId to clubId
    const courtToClubMap = new Map<string, string>();
    courts.forEach((court) => {
      courtToClubMap.set(court.id, court.clubId);
    });

    // Aggregate booking counts by club
    const activeBookingsByClub = new Map<string, number>();
    const pastBookingsByClub = new Map<string, number>();

    activeUpcomingBookings.forEach((booking) => {
      const clubId = courtToClubMap.get(booking.courtId);
      if (clubId) {
        activeBookingsByClub.set(clubId, (activeBookingsByClub.get(clubId) || 0) + booking._count.id);
      }
    });

    pastBookings.forEach((booking) => {
      const clubId = courtToClubMap.get(booking.courtId);
      if (clubId) {
        pastBookingsByClub.set(clubId, (pastBookingsByClub.get(clubId) || 0) + booking._count.id);
      }
    });

    // Map clubs with statistics
    const clubsWithStats = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      location: club.location,
      city: club.city,
      country: club.country,
      isPublic: club.isPublic,
      createdAt: club.createdAt,
      statistics: {
        courtCount: club._count.courts,
        activeUpcomingBookings: activeBookingsByClub.get(club.id) || 0,
        pastBookings: pastBookingsByClub.get(club.id) || 0,
      },
    }));

    return NextResponse.json({
      clubs: clubsWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization clubs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
