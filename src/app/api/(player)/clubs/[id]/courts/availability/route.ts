import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUTCDate, doUTCRangesOverlap, getUTCDayBounds, getTodayUTC, getDatesFromStartUTC, getWeekMondayUTC } from "@/utils/utcDateTime";

// Business hours configuration
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 22;

// Types for the availability response
interface CourtAvailabilityStatus {
  courtId: string;
  courtName: string;
  courtType: string | null;
  indoor: boolean;
  status: "available" | "booked" | "partial" | "pending";
}

interface HourSlotAvailability {
  hour: number;
  courts: CourtAvailabilityStatus[];
  summary: {
    available: number;
    booked: number;
    partial: number;
    pending: number;
    total: number;
  };
  overallStatus: "available" | "partial" | "booked" | "pending";
}

interface DayAvailability {
  date: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  dayName: string;
  hours: HourSlotAvailability[];
  isToday?: boolean;
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
  mode?: "rolling" | "calendar";
}

// Helper to get day name from UTC date string (YYYY-MM-DD format)
// Returns the day name in English (e.g., "Monday", "Tuesday")
function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00.000Z');
  return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    /**
     * IMPORTANT TIMEZONE RULE:
     * This API returns availability based on UTC date boundaries.
     * All booking start/end times are in UTC.
     * Frontend is responsible for:
     * 1. Converting club timezone to UTC when interpreting results
     * 2. Displaying times in club local timezone to users
     */

    const url = new URL(request.url);
    
    // Support both new 'start' param and legacy 'weekStart' for backward compatibility
    const startParam = url.searchParams.get("start") || url.searchParams.get("weekStart");
    const daysParam = url.searchParams.get("days");
    const modeParam = url.searchParams.get("mode") as "rolling" | "calendar" | null;
    
    // Default number of days
    let numDays = 7;
    if (daysParam) {
      const parsed = parseInt(daysParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
        numDays = parsed;
      }
    }

    let startDateStr: string;
    const todayStr = getTodayUTC();
    
    if (startParam) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startParam)) {
        return NextResponse.json(
          { error: "Invalid start format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
      startDateStr = startParam;
    } else {
      // Default behavior based on mode:
      // - rolling (default): start from today (UTC)
      // - calendar: start from this week's Monday (UTC)
      if (modeParam === "calendar") {
        startDateStr = getWeekMondayUTC(todayStr);
      } else {
        // Default to rolling mode: start from today (UTC)
        startDateStr = todayStr;
      }
    }

    // Check if club exists and get its courts
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          where: {
            isPublished: true, // Only return published courts for players
          },
          select: {
            id: true,
            name: true,
            type: true,
            indoor: true,
            sportType: true,
            courtFormat: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get dates for the requested period (UTC-based)
    const datesToShow = getDatesFromStartUTC(startDateStr, numDays);

    // Get all confirmed bookings for the period (UTC-based)
    const { startOfDay: periodStartUtc } = getUTCDayBounds(datesToShow[0]);
    const { endOfDay: periodEndUtc } = getUTCDayBounds(datesToShow[datesToShow.length - 1]);

    const confirmedBookings = await prisma.booking.findMany({
      where: {
        courtId: { in: club.courts.map((c) => c.id) },
        start: { gte: periodStartUtc },
        end: { lte: periodEndUtc },
        status: { in: ["reserved", "paid"] },
      },
      select: {
        courtId: true,
        start: true,
        end: true,
      },
    });

    // Get all pending bookings for the period
    const pendingBookings = await prisma.booking.findMany({
      where: {
        courtId: { in: club.courts.map((c) => c.id) },
        start: { gte: periodStartUtc },
        end: { lte: periodEndUtc },
        status: "pending",
      },
      select: {
        courtId: true,
        start: true,
        end: true,
      },
    });

    // Build availability for each day
    const days: DayAvailability[] = [];

    for (const dateStr of datesToShow) {
      const date = new Date(dateStr + 'T00:00:00.000Z');
      const dayOfWeek = date.getUTCDay();
      const dayName = getDayName(dateStr);
      const isToday = dateStr === todayStr;

      const hours: HourSlotAvailability[] = [];

      for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
        // Create UTC time boundaries for this hour slot
        const slotStart = createUTCDate(dateStr, `${hour.toString().padStart(2, "0")}:00`);
        const slotEnd = createUTCDate(dateStr, `${(hour + 1).toString().padStart(2, "0")}:00`);

        const courts: CourtAvailabilityStatus[] = [];
        let availableCount = 0;
        let bookedCount = 0;
        let partialCount = 0;
        let pendingCount = 0;

        for (const court of club.courts) {
          // Check for bookings that overlap with this slot
          const courtPendingBookings = pendingBookings.filter((b) => b.courtId === court.id);
          const courtConfirmedBookings = confirmedBookings.filter((b) => b.courtId === court.id);
          let status: "available" | "booked" | "partial" | "pending" = "available";

          // First check pending bookings - they take priority for pending status
          for (const booking of courtPendingBookings) {
            const bookingStart = new Date(booking.start);
            const bookingEnd = new Date(booking.end);

            // Check for overlap using UTC-based comparison
            if (doUTCRangesOverlap(bookingStart, bookingEnd, slotStart, slotEnd)) {
              // If the booking completely covers the slot or overlaps, mark as pending
              if (bookingStart <= slotStart && bookingEnd >= slotEnd) {
                status = "pending";
                break;
              } else {
                // Partial overlap with pending
                status = "pending";
              }
            }
          }

          // If not pending, check confirmed bookings
          if (status === "available") {
            for (const booking of courtConfirmedBookings) {
              const bookingStart = new Date(booking.start);
              const bookingEnd = new Date(booking.end);

              // Check for overlap using UTC-based comparison
              if (doUTCRangesOverlap(bookingStart, bookingEnd, slotStart, slotEnd)) {
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
          else if (status === "pending") pendingCount++;
          else partialCount++;
        }

        // Determine overall status for this hour slot
        let overallStatus: "available" | "partial" | "booked" | "pending";
        if (availableCount === club.courts.length) {
          overallStatus = "available";
        } else if (bookedCount === club.courts.length) {
          overallStatus = "booked";
        } else if (pendingCount === club.courts.length) {
          overallStatus = "pending";
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
            pending: pendingCount,
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
        isToday,
      });
    }

    const response: WeeklyAvailabilityResponse = {
      weekStart: datesToShow[0],
      weekEnd: datesToShow[datesToShow.length - 1],
      days,
      courts: club.courts.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        indoor: c.indoor,
        sportType: c.sportType || "PADEL",
        courtFormat: c.courtFormat,
      })),
      mode: modeParam || "rolling",
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
