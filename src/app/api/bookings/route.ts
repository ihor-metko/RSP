import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";

/**
 * GET /api/bookings
 * 
 * Fetch bookings for the authenticated user with optional filters
 * 
 * Query parameters:
 * - upcoming: boolean (optional) - Filter for upcoming bookings only
 * 
 * Returns:
 * - Array of bookings with court and club information
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Get userId from authenticated session
    const userId = authResult.userId;

    const { searchParams } = new URL(request.url);
    const upcomingParam = searchParams.get("upcoming");

    const now = new Date();
    const isUpcoming = upcomingParam === "true";

    // Build where clause based on filters
    const whereClause: {
      userId: string;
      end?: { gte: Date } | { lt: Date };
      status?: { in: string[] };
    } = {
      userId,
    };

    if (isUpcoming) {
      // Upcoming bookings: end time is in the future and has an active status
      whereClause.end = { gte: now };
      whereClause.status = { in: ["reserved", "paid", "confirmed"] };
    } else {
      // Past bookings: end time is in the past
      whereClause.end = { lt: now };
    }

    // Fetch bookings with related data
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        court: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: isUpcoming 
        ? { start: "asc" } 
        : { start: "desc" },
    });

    // Format response
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      courtId: booking.courtId,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      price: booking.price,
      status: booking.status,
      court: {
        id: booking.court.id,
        name: booking.court.name,
        club: {
          id: booking.court.club.id,
          name: booking.court.club.name,
        },
      },
    }));

    return NextResponse.json(formattedBookings, { status: 200 });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
