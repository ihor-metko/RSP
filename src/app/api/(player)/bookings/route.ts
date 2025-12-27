import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { getResolvedPriceForSlot } from "@/lib/priceRules";
import { emitBookingCreated } from "@/lib/socketEmitters";
import type { OperationsBooking } from "@/types/booking";
import { migrateLegacyStatus } from "@/utils/bookingStatus";
import { updateStatisticsForBooking } from "@/services/statisticsService";

interface BookingRequest {
  courtId: string;
  startTime: string;
  endTime: string;
  userId: string;
  coachId: string | null;
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

      // Check for overlapping bookings for the selected courtId
      const overlappingBookings = await tx.booking.findFirst({
        where: {
          courtId: body.courtId,
          start: { lt: endTime },
          end: { gt: startTime },
          status: { in: ["reserved", "paid"] },
        },
      });

      // If overlap exists, throw error to trigger 409 Conflict
      if (overlappingBookings) {
        throw new Error("CONFLICT");
      }

      // Create new booking with status = 'reserved' and resolved price
      const newBooking = await tx.booking.create({
        data: {
          courtId: body.courtId,
          userId: body.userId,
          coachId: body.coachId || null,
          start: startTime,
          end: endTime,
          price: resolvedPrice,
          sportType: court.sportType || "PADEL",
          status: "reserved",
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
