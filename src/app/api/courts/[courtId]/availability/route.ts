import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Business hours configuration
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 22;
const SLOT_DURATION_HOURS = 1;

interface AvailabilitySlot {
  start: string;
  end: string;
  status: "available" | "booked" | "partial";
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  try {
    const resolvedParams = await params;
    const courtId = resolvedParams.courtId;

    // Get date from query params, default to today
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");

    // Validate and parse date
    let targetDate: Date;
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    } else {
      targetDate = new Date();
    }

    // Set to start of day in UTC
    const dateStr = targetDate.toISOString().split("T")[0];
    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

    // Check if court exists
    const court = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Fetch bookings for the court on the specified date
    const bookings = await prisma.booking.findMany({
      where: {
        courtId,
        start: { gte: dayStart },
        end: { lte: dayEnd },
        status: { in: ["reserved", "paid"] },
      },
      select: {
        start: true,
        end: true,
      },
      orderBy: { start: "asc" },
    });

    // Generate hourly slots for the day
    const slots: AvailabilitySlot[] = [];
    const slotDurationMs = SLOT_DURATION_HOURS * 60 * 60 * 1000;

    for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour += SLOT_DURATION_HOURS) {
      const slotStart = new Date(`${dateStr}T${hour.toString().padStart(2, "0")}:00:00.000Z`);
      const slotEnd = new Date(slotStart.getTime() + slotDurationMs);

      // Check if this slot overlaps with any booking
      let status: "available" | "booked" | "partial" = "available";

      for (const booking of bookings) {
        const bookingStart = new Date(booking.start);
        const bookingEnd = new Date(booking.end);

        // Check for overlap
        if (bookingStart < slotEnd && bookingEnd > slotStart) {
          // If the booking completely covers the slot, it's booked
          if (bookingStart <= slotStart && bookingEnd >= slotEnd) {
            status = "booked";
            break;
          } else {
            // Partial overlap
            status = "partial";
          }
        }
      }

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        status,
      });
    }

    const response: AvailabilityResponse = {
      date: dateStr,
      slots,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
