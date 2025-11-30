import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Business hours configuration
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 22;

// Types for the availability response
interface CourtAvailabilityStatus {
  courtId: string;
  courtName: string;
  courtType: string | null;
  indoor: boolean;
  status: "available" | "booked" | "partial";
}

interface HourSlotAvailability {
  hour: number;
  courts: CourtAvailabilityStatus[];
  summary: {
    available: number;
    booked: number;
    partial: number;
    total: number;
  };
  overallStatus: "available" | "partial" | "booked";
}

interface DayAvailability {
  date: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  dayName: string;
  hours: HourSlotAvailability[];
}

interface WeeklyAvailabilityResponse {
  weekStart: string;
  weekEnd: string;
  days: DayAvailability[];
  courts: Array<{
    id: string;
    name: string;
    type: string | null;
    indoor: boolean;
  }>;
}

// Helper to get day name using native Date API
function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function getWeekDates(startDate: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Get week start from query params, default to this week's Monday
    const url = new URL(request.url);
    const weekStartParam = url.searchParams.get("weekStart");

    let weekStart: Date;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
      if (isNaN(weekStart.getTime())) {
        return NextResponse.json(
          { error: "Invalid weekStart format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    } else {
      // Default to this week's Monday
      const today = new Date();
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
    }

    // Set to start of day
    weekStart.setHours(0, 0, 0, 0);

    // Check if club exists and get its courts
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          select: {
            id: true,
            name: true,
            type: true,
            indoor: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get week dates
    const weekDates = getWeekDates(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Get all bookings for the week
    const weekStartUtc = new Date(`${weekDates[0]}T00:00:00.000Z`);
    const weekEndUtc = new Date(`${weekDates[6]}T23:59:59.999Z`);

    const bookings = await prisma.booking.findMany({
      where: {
        courtId: { in: club.courts.map((c) => c.id) },
        start: { gte: weekStartUtc },
        end: { lte: weekEndUtc },
        status: { in: ["reserved", "paid"] },
      },
      select: {
        courtId: true,
        start: true,
        end: true,
      },
    });

    // Build availability for each day
    const days: DayAvailability[] = [];

    for (const dateStr of weekDates) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayName = getDayName(date);

      const hours: HourSlotAvailability[] = [];

      for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
        const slotStart = new Date(`${dateStr}T${hour.toString().padStart(2, "0")}:00:00.000Z`);
        const slotEnd = new Date(`${dateStr}T${(hour + 1).toString().padStart(2, "0")}:00:00.000Z`);

        const courts: CourtAvailabilityStatus[] = [];
        let availableCount = 0;
        let bookedCount = 0;
        let partialCount = 0;

        for (const court of club.courts) {
          // Check for bookings that overlap with this slot
          const courtBookings = bookings.filter((b) => b.courtId === court.id);
          let status: "available" | "booked" | "partial" = "available";

          for (const booking of courtBookings) {
            const bookingStart = new Date(booking.start);
            const bookingEnd = new Date(booking.end);

            // Check for overlap
            if (bookingStart < slotEnd && bookingEnd > slotStart) {
              // If the booking completely covers the slot, it's booked
              if (bookingStart <= slotStart && bookingEnd >= slotEnd) {
                status = "booked";
                break; // Complete booking found, no need to check further
              } else {
                // Partial overlap - only upgrade from available to partial
                status = "partial";
              }
            }
          }

          courts.push({
            courtId: court.id,
            courtName: court.name,
            courtType: court.type,
            indoor: court.indoor,
            status,
          });

          if (status === "available") availableCount++;
          else if (status === "booked") bookedCount++;
          else partialCount++;
        }

        // Determine overall status for this hour slot
        let overallStatus: "available" | "partial" | "booked";
        if (availableCount === club.courts.length) {
          overallStatus = "available";
        } else if (bookedCount === club.courts.length) {
          overallStatus = "booked";
        } else {
          overallStatus = "partial";
        }

        hours.push({
          hour,
          courts,
          summary: {
            available: availableCount,
            booked: bookedCount,
            partial: partialCount,
            total: club.courts.length,
          },
          overallStatus,
        });
      }

      days.push({
        date: dateStr,
        dayOfWeek,
        dayName,
        hours,
      });
    }

    const response: WeeklyAvailabilityResponse = {
      weekStart: weekDates[0],
      weekEnd: weekDates[6],
      days,
      courts: club.courts.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        indoor: c.indoor,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching weekly court availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
