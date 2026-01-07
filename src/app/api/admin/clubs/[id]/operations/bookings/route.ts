import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubManagement } from "@/lib/requireRole";
import type { OperationsBooking } from "@/types/booking";
import { migrateLegacyStatus } from "@/utils/bookingStatus";
import { SportType } from "@/constants/sports";
import { createDayRange } from "@/utils/dateTime";

/**
 * GET /api/clubs/[clubId]/operations/bookings
 *
 * Returns all bookings for a specific club on a given date.
 * Used by the club operations calendar view.
 *
 * Access: Club Owners, Club Admins for this club, Organization Admins for the parent org, Root Admins
 *
 * Query parameters:
 * - date: ISO date string (YYYY-MM-DD) - required
 *
 * @example
 * GET /api/clubs/123/operations/bookings?date=2024-01-15
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse<OperationsBooking[] | { error: string }>> {
  const { id: clubId } = await context.params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date");

  // Validate required query parameter
  if (!date) {
    return NextResponse.json(
      { error: "Missing required parameter: date (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Check club management authorization
  // This allows: Root Admin, Organization Admin (for clubs in their org), Club Owner, Club Admin
  const authResult = await requireClubManagement(clubId);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  try {
    // Parse date and create start/end of day timestamps in platform timezone
    const { startOfDay, endOfDay } = createDayRange(date);

    // Fetch all bookings for this club on this date
    const bookings = await prisma.booking.findMany({
      where: {
        court: {
          clubId: clubId,
        },
        start: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
          },
        },
        coach: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        start: "asc",
      },
    });

    // Transform to response format with dual-status system
    const operationsBookings: OperationsBooking[] = bookings.map((booking) => {
      const startISO = booking.start.toISOString();
      const endISO = booking.end.toISOString();

      // Migrate legacy status to new dual-status system
      const { bookingStatus, paymentStatus } = migrateLegacyStatus(booking.status);

      return {
        id: booking.id,
        userId: booking.userId,
        userName: booking.user.name,
        userEmail: booking.user.email ?? "",
        courtId: booking.courtId,
        courtName: booking.court.name,
        start: startISO,
        end: endISO,
        bookingStatus,
        paymentStatus,
        price: booking.price,
        sportType: booking.sportType as SportType,
        coachId: booking.coachId,
        coachName: booking.coach?.user.name ?? null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.createdAt.toISOString(), // Use createdAt as version timestamp
      };
    });

    return NextResponse.json(operationsBookings);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club operations bookings:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
