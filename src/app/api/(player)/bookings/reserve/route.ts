import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { getResolvedPriceForSlot } from "@/lib/priceRules";
import { RESERVATION_EXPIRATION_MS, LEGACY_STATUS, BOOKING_STATUS, PAYMENT_STATUS } from "@/types/booking";
import { isValidUTCString, getUTCDateString, getUTCTimeString } from "@/utils/utcDateTime";

interface ReservationRequest {
  courtId: string;
  startTime: string;
  endTime: string;
}

/**
 * Reserve a booking slot temporarily (5 minutes)
 * Desktop MVP only - creates a temporary reservation before payment
 *
 * IMPORTANT TIMEZONE RULE:
 * This endpoint expects startTime and endTime in UTC ISO 8601 format (e.g., "2026-01-06T10:00:00.000Z")
 * Frontend MUST convert club local time to UTC before calling this endpoint
 */
export async function POST(request: Request) {
  try {
    // Any authenticated user can create reservations
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body: ReservationRequest = await request.json();

    // Validate input
    if (!body.courtId || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { error: "Missing required fields: courtId, startTime, endTime are required" },
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

    // Set reservation expiry time (5 minutes from now)
    const reservationExpiresAt = new Date(Date.now() + RESERVATION_EXPIRATION_MS);

    // Create reservation in transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Get court to retrieve sportType
      const court = await tx.court.findUnique({
        where: { id: body.courtId },
        select: {
          sportType: true,
          name: true,
          clubId: true,
        },
      });

      if (!court) {
        throw new Error("COURT_NOT_FOUND");
      }

      // Don't delete expired reservations - keep them for payment recovery
      // Users can resume payment for their unpaid bookings

      // Check for overlapping bookings or active reservations
      const overlapping = await tx.booking.findFirst({
        where: {
          courtId: body.courtId,
          start: { lt: endTime },
          end: { gt: startTime },
          OR: [
            { status: LEGACY_STATUS.PAID },
            {
              status: LEGACY_STATUS.RESERVED,
              reservationExpiresAt: { gt: new Date() },
            },
          ],
        },
      });

      // If overlap exists, throw error
      if (overlapping) {
        throw new Error("CONFLICT");
      }

      // Create temporary reservation
      const newReservation = await tx.booking.create({
        data: {
          courtId: body.courtId,
          userId: authResult.userId,
          coachId: null,
          start: startTime,
          end: endTime,
          price: resolvedPrice,
          sportType: court.sportType || "PADEL",
          status: LEGACY_STATUS.RESERVED,
          bookingStatus: BOOKING_STATUS.PENDING,
          paymentStatus: PAYMENT_STATUS.UNPAID,
          reservedAt: new Date(),
          reservationExpiresAt: reservationExpiresAt,
        },
      });

      return { ...newReservation, court };
    });

    // Return successful response
    return NextResponse.json(
      {
        reservationId: reservation.id,
        courtId: reservation.courtId,
        startTime: reservation.start.toISOString(),
        endTime: reservation.end.toISOString(),
        priceCents: reservation.price,
        expiresAt: reservation.reservationExpiresAt?.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating reservation:", error);
    if (error instanceof Error) {
      if (error.message === "CONFLICT") {
        return NextResponse.json(
          { error: "Selected time slot is already booked or reserved" },
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
      console.error("Reservation error:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
