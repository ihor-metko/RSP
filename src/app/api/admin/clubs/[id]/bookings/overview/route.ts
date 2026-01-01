import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { toNewBookingStatus } from "@/utils/bookingStatus";
import type { BookingStatus } from "@/types/booking";
import { DEFAULT_SPORT_TYPE } from "@/constants/sports";

/**
 * Booking preview item for overview
 */
export interface BookingPreviewItem {
  id: string;
  courtName: string;
  clubName: string;
  userName: string | null;
  userEmail: string;
  start: string;
  end: string;
  status: BookingStatus;
  sportType: string;
}

/**
 * Bookings overview response
 */
export interface BookingsOverviewResponse {
  todayCount: number;
  weekCount: number;
  upcomingCount: number;
  upcomingBookings: BookingPreviewItem[];
}

/**
 * GET /api/admin/clubs/:clubId/bookings/overview
 *
 * Returns aggregated booking counts and a preview of upcoming bookings for a club.
 * This endpoint optimizes performance by using aggregation instead of fetching full lists.
 *
 * Response includes:
 * - todayCount: Number of bookings today
 * - weekCount: Number of bookings this week
 * - upcomingCount: Total number of upcoming bookings
 * - upcomingBookings: Array of up to 10 nearest upcoming bookings
 *
 * Access control:
 * - Root Admin: Can access any club
 * - Organization Admin: Can access clubs in their organization
 * - Club Owner: Can access their owned clubs
 * - Club Admin: Can access their managed clubs
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BookingsOverviewResponse | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;
  const { id: clubId } = await params;

  try {
    // Verify club exists and user has access
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    // Check access based on admin type
    if (adminType === "organization_admin") {
      // Organization admin must manage the club's organization
      if (!club.organizationId || !managedIds.includes(club.organizationId)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    } else if (adminType === "club_owner" || adminType === "club_admin") {
      // Club owner/admin must manage this specific club
      if (!managedIds.includes(clubId)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }
    // Root admin has access to all clubs (no additional check needed)

    // Get date ranges for queries
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Build base where clause for this club's bookings
    const baseWhere = {
      court: {
        clubId: clubId,
      },
    };

    // Execute aggregation queries in parallel
    const [todayCount, weekCount, upcomingCount, upcomingBookings] = await Promise.all([
      // Count bookings today
      prisma.booking.count({
        where: {
          ...baseWhere,
          start: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Count bookings this week
      prisma.booking.count({
        where: {
          ...baseWhere,
          start: {
            gte: today,
            lt: weekFromNow,
          },
        },
      }),

      // Count all upcoming bookings
      prisma.booking.count({
        where: {
          ...baseWhere,
          start: {
            gte: now,
          },
        },
      }),

      // Fetch preview of upcoming bookings (limited to 10)
      prisma.booking.findMany({
        where: {
          ...baseWhere,
          start: {
            gte: now,
          },
        },
        orderBy: {
          start: "asc",
        },
        take: 10,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          court: {
            select: {
              name: true,
              club: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Transform upcoming bookings to preview format
    const bookingPreviews: BookingPreviewItem[] = upcomingBookings.map((booking) => ({
      id: booking.id,
      courtName: booking.court.name,
      clubName: booking.court.club.name,
      userName: booking.user.name,
      userEmail: booking.user.email,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      status: toNewBookingStatus(booking.bookingStatus),
      sportType: booking.sportType || DEFAULT_SPORT_TYPE,
    }));

    const response: BookingsOverviewResponse = {
      todayCount,
      weekCount,
      upcomingCount,
      upcomingBookings: bookingPreviews,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching bookings overview:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
