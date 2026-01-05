import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";

/**
 * POST /api/bookings/[id]/resume-payment
 * 
 * Allows a user to resume payment for their unpaid booking.
 * This endpoint validates that:
 * 1. The booking belongs to the authenticated user
 * 2. The booking is still unpaid
 * 3. The slot is still reserved for this user
 * 4. The booking hasn't been cancelled
 * 
 * Returns:
 * - Booking details if validation passes
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

    // Fetch the booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
        { error: "You do not have permission to access this booking" },
        { status: 403 }
      );
    }

    // Check if booking is cancelled
    if (booking.bookingStatus === "Cancelled") {
      return NextResponse.json(
        { error: "This booking has been cancelled" },
        { status: 400 }
      );
    }

    // Check if booking is already paid
    if (booking.paymentStatus === "Paid") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    // Check if booking slot has already passed
    const now = new Date();
    if (booking.start <= now) {
      return NextResponse.json(
        { error: "This booking slot has already passed" },
        { status: 400 }
      );
    }

    // Check if there are any conflicting paid bookings for this slot
    // (excluding the current reservation)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId: booking.courtId,
        start: { lt: booking.end },
        end: { gt: booking.start },
        id: { not: bookingId },
        OR: [
          { paymentStatus: "Paid" },
          {
            AND: [
              { status: "reserved" },
              { reservationExpiresAt: { gt: now } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 409 }
      );
    }

    // Extend the reservation expiration time (5 more minutes from now)
    const newExpirationTime = new Date(Date.now() + 5 * 60 * 1000);
    
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        reservationExpiresAt: newExpirationTime,
      },
    });

    // Return booking details for payment flow
    return NextResponse.json(
      {
        bookingId: booking.id,
        courtId: booking.courtId,
        courtName: booking.court.name,
        clubId: booking.court.clubId,
        clubName: booking.court.club.name,
        startTime: booking.start.toISOString(),
        endTime: booking.end.toISOString(),
        price: booking.price,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        reservationExpiresAt: newExpirationTime.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error resuming payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
