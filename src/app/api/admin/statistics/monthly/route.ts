import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * GET /api/admin/statistics/monthly
 * Fetch monthly statistics for clubs
 * Query params:
 * - clubId: Filter by club ID
 * - year: Filter by year
 * - month: Filter by month (1-12)
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get("clubId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // Build where clause based on admin type and filters
    interface WhereClause {
      clubId?: string | { in: string[] };
      club?: {
        organizationId: { in: string[] };
      };
      year?: number;
      month?: number;
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

    // Apply year filter if provided
    if (year) {
      whereClause.year = parseInt(year, 10);
    }

    // Apply month filter if provided
    if (month) {
      whereClause.month = parseInt(month, 10);
    }

    const statistics = await prisma.clubMonthlyStatistics.findMany({
      where: whereClause,
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
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
    console.error("Error fetching monthly statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly statistics" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/statistics/monthly
 * Create or update monthly statistics for a club
 * Body: { clubId, month, year, averageOccupancy, previousMonthOccupancy? }
 */
export async function POST(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { clubId, month, year, averageOccupancy, previousMonthOccupancy } = body;

    // Validate required fields
    if (!clubId || month === undefined || year === undefined || averageOccupancy === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: clubId, month, year, averageOccupancy" },
        { status: 400 }
      );
    }

    // Validate month is between 1 and 12
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Month must be between 1 and 12" },
        { status: 400 }
      );
    }

    // Validate year is reasonable (between 2000 and 2100)
    if (year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Year must be between 2000 and 2100" },
        { status: 400 }
      );
    }

    // Validate that averageOccupancy is between 0 and 100
    if (averageOccupancy < 0 || averageOccupancy > 100) {
      return NextResponse.json(
        { error: "averageOccupancy must be between 0 and 100" },
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

    // Calculate occupancy change percentage if previous month data is provided
    let occupancyChangePercent: number | null = null;
    if (previousMonthOccupancy !== undefined && previousMonthOccupancy !== null) {
      if (previousMonthOccupancy > 0) {
        occupancyChangePercent = ((averageOccupancy - previousMonthOccupancy) / previousMonthOccupancy) * 100;
      } else if (averageOccupancy > 0) {
        // If previous month had 0% occupancy but current month has occupancy
        occupancyChangePercent = 100;
      } else {
        // Both are 0
        occupancyChangePercent = 0;
      }
    }

    // Upsert the statistics (create or update if already exists for this club, month, and year)
    const statistics = await prisma.clubMonthlyStatistics.upsert({
      where: {
        clubId_month_year: {
          clubId,
          month,
          year,
        },
      },
      update: {
        averageOccupancy,
        previousMonthOccupancy: previousMonthOccupancy ?? null,
        occupancyChangePercent,
      },
      create: {
        clubId,
        month,
        year,
        averageOccupancy,
        previousMonthOccupancy: previousMonthOccupancy ?? null,
        occupancyChangePercent,
      },
    });

    return NextResponse.json(statistics, { status: 201 });
  } catch (error) {
    console.error("Error creating monthly statistics:", error);
    return NextResponse.json(
      { error: "Failed to create monthly statistics" },
      { status: 500 }
    );
  }
}
