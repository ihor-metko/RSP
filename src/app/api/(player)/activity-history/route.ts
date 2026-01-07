import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { BOOKING_STATUS } from "@/types/booking";

/**
 * GET /api/(player)/activity-history
 *
 * Fetch activity history (cancelled unpaid bookings) for the authenticated user
 *
 * Query parameters:
 * - skip: number (optional) - Number of items to skip for pagination (default: 0)
 * - take: number (optional) - Number of items to return (default: all items)
 *
 * Returns:
 * - Array of cancelled unpaid bookings with court and club information
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
    const skipParam = searchParams.get("skip");
    const takeParam = searchParams.get("take");

    // Parse pagination parameters with validation
    const skipParsed = skipParam ? parseInt(skipParam, 10) : 0;
    const skip = isNaN(skipParsed) ? 0 : Math.max(0, skipParsed);
    
    const takeParsed = takeParam ? parseInt(takeParam, 10) : undefined;
    const take = takeParsed !== undefined 
      ? (isNaN(takeParsed) ? undefined : Math.max(1, Math.min(100, takeParsed)))
      : undefined;

    // Fetch cancelled unpaid bookings with cancelReason = PAYMENT_TIMEOUT
    const cancelledBookings = await prisma.booking.findMany({
      where: {
        userId,
        bookingStatus: BOOKING_STATUS.CANCELLED,
        // cancelReason: CANCEL_REASON.PAYMENT_TIMEOUT,
      },
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
      orderBy: {
        start: "desc", // Most recent first
      },
      skip: skip,
      take: take,
    });

    // Format response
    const formattedHistory = cancelledBookings.map((booking) => ({
      id: booking.id,
      courtId: booking.courtId,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      price: booking.price,
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      cancelReason: booking.cancelReason,
      createdAt: booking.createdAt.toISOString(),
      court: {
        id: booking.court.id,
        name: booking.court.name,
        club: {
          id: booking.court.club.id,
          name: booking.court.club.name,
        },
      },
    }));

    return NextResponse.json(formattedHistory, { status: 200 });
  } catch (error) {
    console.error("Error fetching activity history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
