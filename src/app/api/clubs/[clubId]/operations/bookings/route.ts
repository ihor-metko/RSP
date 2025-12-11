import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubAdmin, requireOrganizationAdmin } from "@/lib/requireRole";
import type { OperationsBooking } from "@/types/booking";

/**
 * GET /api/clubs/[clubId]/operations/bookings
 * 
 * Returns all bookings for a specific club on a given date.
 * Used by the club operations calendar view.
 * 
 * Access: Club Admins for this club, Organization Admins for the parent org, Root Admins
 * 
 * Query parameters:
 * - date: ISO date string (YYYY-MM-DD) - required
 * 
 * @example
 * GET /api/clubs/123/operations/bookings?date=2024-01-15
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ clubId: string }> }
): Promise<NextResponse<OperationsBooking[] | { error: string }>> {
  const { clubId } = await context.params;
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

  // First, try club admin authorization
  const clubAuthResult = await requireClubAdmin(clubId);
  
  if (!clubAuthResult.authorized) {
    // If not club admin, check if organization admin
    // Need to get the club's organization first
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { organizationId: true },
    });

    if (!club || !club.organizationId) {
      return clubAuthResult.response;
    }

    const orgAuthResult = await requireOrganizationAdmin(club.organizationId);
    
    if (!orgAuthResult.authorized) {
      return orgAuthResult.response;
    }
  }

  try {
    // Parse date and create start/end of day timestamps
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

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

    // Transform to response format
    const operationsBookings: OperationsBooking[] = bookings.map((booking) => ({
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      courtName: booking.court.name,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      status: booking.status as OperationsBooking["status"],
      price: booking.price,
      sportType: booking.sportType,
      coachId: booking.coachId,
      coachName: booking.coach?.user.name ?? null,
      createdAt: booking.createdAt.toISOString(),
    }));

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
