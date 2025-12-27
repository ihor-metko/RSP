import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { calculateAndStoreDailyStatistics } from "@/services/statisticsService";

/**
 * GET /api/admin/statistics/daily
 * Fetch daily statistics for clubs
 * Query params:
 * - clubId: Filter by club ID
 * - startDate: Filter by start date (ISO format)
 * - endDate: Filter by end date (ISO format)
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("clubId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause based on admin type and filters
    interface WhereClause {
      clubId?: string | { in: string[] };
      club?: {
        organizationId: { in: string[] };
      };
      date?: {
        gte?: Date;
        lte?: Date;
      };
    }
    const whereClause: WhereClause = {};

    // Role-based filtering
    if (authResult.adminType === "club_owner" || authResult.adminType === "club_admin") {
      // Club admins can only see stats for their clubs
      whereClause.clubId = { in: authResult.managedIds };
    } else if (authResult.adminType === "organization_admin") {
      // Organization admins can see stats for clubs in their organizations
      whereClause.club = {
        organizationId: { in: authResult.managedIds },
      };
    }
    // Root admin sees all stats (no additional filter)

    // Apply clubId filter if provided
    if (clubId) {
      whereClause.clubId = clubId;
    }

    // Apply date range filters if provided
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    const statistics = await prisma.clubDailyStatistics.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc',
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Error fetching daily statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily statistics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/statistics/daily
 * Create or update daily statistics for a club
 * Body: { clubId, date, bookedSlots?, totalSlots? }
 * 
 * If bookedSlots and totalSlots are provided, they will be used directly.
 * If not provided, they will be calculated automatically from bookings and club hours.
 */
export async function POST(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { clubId, date, bookedSlots, totalSlots } = body;

    // Validate required fields
    if (!clubId || !date) {
      return NextResponse.json(
        { error: "Missing required fields: clubId, date" },
        { status: 400 }
      );
    }

    // Check if user has permission to manage this club
    if (authResult.adminType === "club_owner" || authResult.adminType === "club_admin") {
      if (!authResult.managedIds.includes(clubId)) {
        return NextResponse.json(
          { error: "You do not have permission to manage this club" },
          { status: 403 }
        );
      }
    } else if (authResult.adminType === "organization_admin") {
      // Verify club belongs to admin's organization
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { organizationId: true },
      });

      if (!club || !club.organizationId || !authResult.managedIds.includes(club.organizationId)) {
        return NextResponse.json(
          { error: "You do not have permission to manage this club" },
          { status: 403 }
        );
      }
    }

    // If manual values provided, validate and use them
    if (bookedSlots !== undefined && totalSlots !== undefined) {
      // Validate that bookedSlots and totalSlots are non-negative numbers
      if (bookedSlots < 0 || totalSlots < 0) {
        return NextResponse.json(
          { error: "bookedSlots and totalSlots must be non-negative numbers" },
          { status: 400 }
        );
      }

      // Validate that totalSlots is not zero to avoid division by zero
      if (totalSlots === 0) {
        return NextResponse.json(
          { error: "totalSlots must be greater than zero" },
          { status: 400 }
        );
      }

      // Validate that bookedSlots does not exceed totalSlots
      if (bookedSlots > totalSlots) {
        return NextResponse.json(
          { error: "bookedSlots cannot exceed totalSlots" },
          { status: 400 }
        );
      }

      // Calculate occupancy percentage
      const occupancyPercentage = (bookedSlots / totalSlots) * 100;

      // Upsert the statistics (create or update if already exists for this club and date)
      const statistics = await prisma.clubDailyStatistics.upsert({
        where: {
          clubId_date: {
            clubId,
            date: new Date(date),
          },
        },
        update: {
          bookedSlots,
          totalSlots,
          occupancyPercentage,
        },
        create: {
          clubId,
          date: new Date(date),
          bookedSlots,
          totalSlots,
          occupancyPercentage,
        },
      });

      return NextResponse.json(statistics, { status: 201 });
    }

    // Auto-calculate mode: Use service to calculate from bookings
    const statistics = await calculateAndStoreDailyStatistics(clubId, new Date(date));

    return NextResponse.json(statistics, { status: 201 });
  } catch (error) {
    console.error("Error creating daily statistics:", error);
    return NextResponse.json(
      { error: "Failed to create daily statistics" },
      { status: 500 }
    );
  }
}
