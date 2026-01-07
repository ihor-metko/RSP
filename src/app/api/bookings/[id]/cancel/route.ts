import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { BOOKING_STATUS, PAYMENT_STATUS, CANCEL_REASON } from "@/types/booking";

/**
 * POST /api/bookings/[id]/cancel
 * 
 * Allows a user to manually cancel their unpaid booking.
 * This endpoint validates that:
 * 1. The booking belongs to the authenticated user
 * 2. The booking is still unpaid
 * 3. The booking hasn't already been cancelled
 * 
 * Returns:
 * - Success message if cancellation succeeds
 * - Error if validation fails
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const userId = authResult.userId;
    const params = await context.params;
    const bookingId = params.id;

    // Fetch the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        bookingStatus: true,
        paymentStatus: true,
        start: true,
      },
    });

    // Check if booking exists
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if booking belongs to the user
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to cancel this booking" },
        { status: 403 }
      );
    }

    // Check if booking is already cancelled
    if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
      return NextResponse.json(
        { error: "This booking has already been cancelled" },
        { status: 400 }
      );
    }

    // Check if booking is already paid
    if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
      return NextResponse.json(
        { error: "Cannot cancel a paid booking. Please contact support for refunds." },
        { status: 400 }
      );
    }

    // Check if booking slot has already passed
    const now = new Date();
    if (booking.start <= now) {
      return NextResponse.json(
        { error: "Cannot cancel a booking that has already started or passed" },
        { status: 400 }
      );
    }

    // Cancel the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        bookingStatus: BOOKING_STATUS.CANCELLED,
        cancelReason: CANCEL_REASON.USER_CANCELLED,
        reservationExpiresAt: null, // Clear expiration time
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Booking cancelled successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
