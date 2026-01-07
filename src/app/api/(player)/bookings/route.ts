import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { getResolvedPriceForSlot } from "@/lib/priceRules";
import { emitBookingCreated } from "@/lib/socketEmitters";
import type { OperationsBooking } from "@/types/booking";
import { migrateLegacyStatus } from "@/utils/bookingStatus";
import { updateStatisticsForBooking } from "@/services/statisticsService";
import { LEGACY_STATUS, BOOKING_STATUS, PAYMENT_STATUS } from "@/types/booking";
import { isValidUTCString, getUTCDateString, getUTCTimeString } from "@/utils/utcDateTime";

interface BookingRequest {
  courtId: string;
  startTime: string;
  endTime: string;
  userId: string;
  coachId: string | null;
}

/**
 * POST /api/bookings
 * Create a booking for a player
 *
 * IMPORTANT TIMEZONE RULE:
 * This endpoint expects startTime and endTime in UTC ISO 8601 format (e.g., "2026-01-06T10:00:00.000Z")
 * Frontend MUST convert club local time to UTC before calling this endpoint
 */

export async function POST(request: Request) {
  try {
    // Any authenticated user can create bookings
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body: BookingRequest = await request.json();

    // Validate input: ensure all required fields exist
    if (
      !body.courtId ||
      !body.startTime ||
      !body.endTime ||
      !body.userId
    ) {
      return NextResponse.json(
        { error: "Missing required fields: courtId, startTime, endTime, and userId are required" },
        { status: 400 }
      );
    }

    // Validate UTC format - CRITICAL for timezone safety
    if (!isValidUTCString(body.startTime)) {
      return NextResponse.json(
        { error: "Invalid startTime format. Must be UTC ISO 8601 format (e.g., '2026-01-06T10:00:00.000Z')" },
        { status: 400 }
      );
    }

    if (!isValidUTCString(body.endTime)) {
      return NextResponse.json(
        { error: "Invalid endTime format. Must be UTC ISO 8601 format (e.g., '2026-01-06T10:00:00.000Z')" },
        { status: 400 }
      );
    }

    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    // Validate startTime < endTime
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 }
      );
    }

    // Validate ISO datetime format
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid datetime format. Use ISO 8601 format" },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Get date and time strings for price calculation (UTC)
    const dateStr = getUTCDateString(startTime);
    const startTimeStr = getUTCTimeString(startTime);

    // Calculate resolved price using price rules
    let resolvedPrice: number;
    try {
      resolvedPrice = await getResolvedPriceForSlot(
        body.courtId,
        dateStr,
        startTimeStr,
        durationMinutes
      );
    } catch (priceError) {
      if (priceError instanceof Error && priceError.message === "Court not found") {
        return NextResponse.json(
          { error: "Court not found" },
          { status: 400 }
        );
      }
      throw priceError;
    }

    // Implement atomic booking logic inside a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Get court to retrieve sportType and club info
      const court = await tx.court.findUnique({
        where: { id: body.courtId },
        select: {
          sportType: true,
          name: true,
          clubId: true,
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!court) {
        throw new Error("COURT_NOT_FOUND");
      }

      // Don't delete expired reservations - keep them for payment recovery
      // Users can resume payment for their unpaid bookings

      // Check if there's an existing reservation for this exact slot and user (even if expired)
      const existingReservation = await tx.booking.findFirst({
        where: {
          courtId: body.courtId,
          userId: body.userId,
          start: startTime,
          end: endTime,
          status: LEGACY_STATUS.RESERVED,
        },
      });

      // Check for overlapping bookings or active reservations (excluding the user's own reservation)
      const overlappingBookings = await tx.booking.findFirst({
        where: {
          courtId: body.courtId,
          start: { lt: endTime },
          end: { gt: startTime },
          OR: [
            { status: LEGACY_STATUS.PAID },
            {
              AND: [
                { status: LEGACY_STATUS.RESERVED },
                { reservationExpiresAt: { gt: new Date() } },
                // Exclude the current user's own reservation
                existingReservation ? { id: { not: existingReservation.id } } : {},
              ],
            },
          ],
        },
      });

      // If overlap exists, throw error to trigger 409 Conflict
      if (overlappingBookings) {
        throw new Error("CONFLICT");
      }

      let newBooking;

      if (existingReservation) {
        // Update existing reservation to paid status
        newBooking = await tx.booking.update({
          where: { id: existingReservation.id },
          data: {
            status: LEGACY_STATUS.PAID,
            bookingStatus: BOOKING_STATUS.UPCOMING,
            paymentStatus: PAYMENT_STATUS.PAID,
            reservationExpiresAt: null, // Clear expiry since it's now paid
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
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
        });
      } else {
        // No reservation exists - this shouldn't happen in the normal flow
        // but we allow it for backward compatibility
        // Create new booking with status = 'paid' and resolved price
        newBooking = await tx.booking.create({
          data: {
            courtId: body.courtId,
            userId: body.userId,
            coachId: body.coachId || null,
            start: startTime,
            end: endTime,
            price: resolvedPrice,
            sportType: court.sportType || "PADEL",
            status: LEGACY_STATUS.PAID,
            bookingStatus: BOOKING_STATUS.UPCOMING,
            paymentStatus: PAYMENT_STATUS.PAID,
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
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
        });
      }

      // Update daily statistics reactively within the transaction
      await updateStatisticsForBooking(court.clubId, startTime, endTime);

      return { ...newBooking, court };
    });

    // Emit Socket.IO event for real-time updates (after transaction commit)
    const { bookingStatus, paymentStatus } = migrateLegacyStatus(booking.status);
    const operationsBooking: OperationsBooking = {
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      courtName: booking.court.name,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      bookingStatus,
      paymentStatus,
      price: booking.price,
      sportType: (booking.sportType as OperationsBooking['sportType']) || "PADEL",
      coachId: booking.coachId,
      coachName: booking.coach?.user.name ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.createdAt.toISOString(), // Use createdAt as version timestamp
    };

    emitBookingCreated({
      booking: operationsBooking,
      clubId: booking.court.clubId,
      courtId: booking.courtId,
    });

    // Return successful response with price
    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        courtId: booking.courtId,
        startTime: booking.start.toISOString(),
        endTime: booking.end.toISOString(),
        coachId: booking.coachId,
        priceCents: booking.price,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CONFLICT") {
        return NextResponse.json(
          { error: "Selected time slot is already booked" },
          { status: 409 }
        );
      }
      if (error.message === "COURT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Court not found" },
          { status: 400 }
        );
      }
    }

    // Log error in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.error("Booking error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
