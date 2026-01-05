import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { getResolvedPriceForSlot } from "@/lib/priceRules";

interface ReservationRequest {
  courtId: string;
  startTime: string;
  endTime: string;
  userId: string;
}

/**
 * Format a date to "HH:MM" time string.
 */
function formatTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Format a date to "YYYY-MM-DD" date string.
 */
function formatDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Reserve a booking slot temporarily (5 minutes)
 * Desktop MVP only - creates a temporary reservation before payment
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
    if (!body.courtId || !body.startTime || !body.endTime || !body.userId) {
      return NextResponse.json(
        { error: "Missing required fields: courtId, startTime, endTime, and userId are required" },
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

    // Get date and time strings for price calculation
    const dateStr = formatDateString(startTime);
    const startTimeStr = formatTimeString(startTime);

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
    const reservationExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

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

      // First, clean up expired reservations for this court
      await tx.booking.deleteMany({
        where: {
          courtId: body.courtId,
          status: "reserved",
          reservationExpiresAt: {
            lt: new Date(),
          },
        },
      });

      // Check for overlapping bookings or active reservations
      const overlapping = await tx.booking.findFirst({
        where: {
          courtId: body.courtId,
          start: { lt: endTime },
          end: { gt: startTime },
          OR: [
            { status: "paid" },
            {
              status: "reserved",
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
          userId: body.userId,
          coachId: null,
          start: startTime,
          end: endTime,
          price: resolvedPrice,
          sportType: court.sportType || "PADEL",
          status: "reserved",
          bookingStatus: "Pending",
          paymentStatus: "Unpaid",
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
