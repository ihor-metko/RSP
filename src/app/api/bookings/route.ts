import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

interface BookingRequest {
  courtId: string;
  startTime: string;
  endTime: string;
  userId: string;
  coachId: string | null;
}

export async function POST(request: Request) {
  try {
    // Role check: Only player, admin, coach can create bookings
    const authResult = await requireRole(request, ["player", "admin", "coach"]);
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

    // Implement atomic booking logic inside a transaction
    const booking = await prisma.$transaction(async (tx) => {
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

      // Get court to retrieve default price
      const court = await tx.court.findUnique({
        where: { id: body.courtId },
      });

      if (!court) {
        throw new Error("COURT_NOT_FOUND");
      }

      // Create new booking with status = 'reserved'
      const newBooking = await tx.booking.create({
        data: {
          courtId: body.courtId,
          userId: body.userId,
          coachId: body.coachId || null,
          start: startTime,
          end: endTime,
          price: court.defaultPrice,
          status: "reserved",
        },
      });

      return newBooking;
    });

    // Return successful response
    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        courtId: booking.courtId,
        startTime: booking.start.toISOString(),
        endTime: booking.end.toISOString(),
        coachId: booking.coachId,
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
