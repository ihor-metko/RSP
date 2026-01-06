import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResolvedPriceForSlot } from "@/lib/priceRules";
import type { CourtFormat } from "@/types/court";
import { createUTCDate, addMinutesUTC, doUTCRangesOverlap, getUTCDayBounds } from "@/utils/utcDateTime";

// Business hours configuration (aligned with frontend types.ts)
const BUSINESS_START_HOUR = 8;
const BUSINESS_END_HOUR = 22;

interface AvailableCourt {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  sportType: string;
  courtFormat: CourtFormat | null;
  defaultPriceCents: number;
  /**
   * Resolved price for the requested time slot in cents.
   * Calculated using court price rules for the specific date, time, and duration.
   * This respects all CourtPriceRule configurations (SPECIFIC_DATE, SPECIFIC_DAY, 
   * WEEKDAYS, WEEKENDS, ALL_DAYS, HOLIDAY) and falls back to defaultPriceCents
   * if no rules are defined.
   */
  priceCents: number;
}

interface AlternativeTimeSlot {
  startTime: string;
  availableCourtCount: number;
}

interface AlternativeDuration {
  duration: number;
  availableCourtCount: number;
}

interface AvailableCourtsResponse {
  availableCourts: AvailableCourt[];
  alternativeTimeSlots?: AlternativeTimeSlot[];
  alternativeDurations?: AlternativeDuration[];
}

interface Booking {
  courtId: string;
  start: Date;
  end: Date;
}

/**
 * Helper function to check if a court is available for a given time slot
 * Uses UTC-based overlap detection
 */
function isCourtAvailable(
  courtId: string,
  slotStart: Date,
  slotEnd: Date,
  bookings: Booking[]
): boolean {
  const courtBookings = bookings.filter((b) => b.courtId === courtId);
  
  for (const booking of courtBookings) {
    const bookingStart = new Date(booking.start);
    const bookingEnd = new Date(booking.end);
    
    // Check for overlap using UTC timestamps: booking overlaps if it starts before slot ends AND ends after slot starts
    if (doUTCRangesOverlap(bookingStart, bookingEnd, slotStart, slotEnd)) {
      return false;
    }
  }
  
  return true;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Get query params
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    const startParam = url.searchParams.get("start");
    const fromParam = url.searchParams.get("from"); // Alternative to start
    const toParam = url.searchParams.get("to"); // Alternative to duration
    const durationParam = url.searchParams.get("duration");
    const courtTypeParam = url.searchParams.get("courtType"); // Optional court type filter

    /**
     * IMPORTANT TIMEZONE RULE:
     * This API endpoint expects all datetime parameters in UTC.
     * The frontend MUST convert club local time to UTC before calling this endpoint.
     * 
     * Example: If club is in Europe/Kyiv (UTC+2) and user selects 10:00 local time,
     * frontend should send start=08:00 (UTC equivalent).
     */

    // Validate court type if provided
    if (courtTypeParam && courtTypeParam !== "SINGLE" && courtTypeParam !== "DOUBLE") {
      return NextResponse.json(
        { error: "Invalid court type. Must be 'SINGLE' or 'DOUBLE'" },
        { status: 400 }
      );
    }

    // Validate required params
    const timeStart = startParam || fromParam;
    if (!dateParam || !timeStart) {
      return NextResponse.json(
        { error: "Missing required parameters: date and start (or from) are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate start time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStart)) {
      return NextResponse.json(
        { error: "Invalid start time format. Use HH:MM" },
        { status: 400 }
      );
    }

    // Calculate duration from 'from' and 'to' params, or use duration param
    let duration: number;
    if (toParam) {
      // Validate 'to' time format
      if (!timeRegex.test(toParam)) {
        return NextResponse.json(
          { error: "Invalid end time format. Use HH:MM" },
          { status: 400 }
        );
      }
      // Calculate duration in minutes from 'from' and 'to'
      const [startHours, startMins] = timeStart.split(":").map(Number);
      const [endHours, endMins] = toParam.split(":").map(Number);
      const startMinutes = startHours * 60 + startMins;
      const endMinutes = endHours * 60 + endMins;
      duration = endMinutes - startMinutes;
      if (duration <= 0) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    } else {
      // Parse duration (default 60 minutes)
      duration = durationParam ? parseInt(durationParam, 10) : 60;
    }
    if (isNaN(duration) || duration <= 0) {
      return NextResponse.json(
        { error: "Invalid duration. Must be a positive integer" },
        { status: 400 }
      );
    }


    // Check if club exists and get its courts
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          where: {
            isPublished: true, // Only return published courts for players
            ...(courtTypeParam && { courtFormat: courtTypeParam as CourtFormat }), // Filter by court format if provided
          },
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            surface: true,
            indoor: true,
            sportType: true,
            courtFormat: true,
            defaultPriceCents: true,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Parse requested slot times - ensure UTC interpretation
    const [startHour] = timeStart.split(":").map(Number);
    const slotStart = createUTCDate(dateParam, timeStart);
    const slotEnd = addMinutesUTC(slotStart, duration);

    // Validate slot is within business hours
    const endHour = slotEnd.getUTCHours() + slotEnd.getUTCMinutes() / 60;
    if (startHour < BUSINESS_START_HOUR || endHour > BUSINESS_END_HOUR) {
      // Slot is outside business hours - return empty list
      const response: AvailableCourtsResponse = {
        availableCourts: [],
      };
      return NextResponse.json(response);
    }

    // Get all bookings for the club's courts on the specified date (UTC-based day boundaries)
    const { startOfDay: dayStart, endOfDay: dayEnd } = getUTCDayBounds(dateParam);

    const bookings = await prisma.booking.findMany({
      where: {
        courtId: { in: club.courts.map((c) => c.id) },
        start: { gte: dayStart, lt: dayEnd },
        status: { in: ["reserved", "paid", "pending"] },
      },
      select: {
        courtId: true,
        start: true,
        end: true,
      },
    });

    // Check each court for availability
    const availableCourts: AvailableCourt[] = [];

    for (const court of club.courts) {
      if (isCourtAvailable(court.id, slotStart, slotEnd, bookings)) {
        // Calculate resolved price for this court based on date, time, and duration
        let resolvedPrice: number;
        try {
          resolvedPrice = await getResolvedPriceForSlot(
            court.id,
            dateParam,
            timeStart,
            duration
          );
        } catch (error) {
          // If price resolution fails, fall back to default price calculation
          // This ensures court availability is maintained even if pricing fails
          if (process.env.NODE_ENV === "development") {
            console.error(`Failed to resolve price for court ${court.id}:`, error);
          }
          resolvedPrice = Math.round((court.defaultPriceCents / 60) * duration);
        }

        availableCourts.push({
          id: court.id,
          name: court.name,
          slug: court.slug,
          type: court.type,
          surface: court.surface,
          indoor: court.indoor,
          sportType: court.sportType || "PADEL",
          courtFormat: court.courtFormat,
          defaultPriceCents: court.defaultPriceCents,
          priceCents: resolvedPrice,
        });
      }
    }

    // If no courts available, find alternative durations and time slots
    const alternativeDurations: AlternativeDuration[] = [];
    let alternativeTimeSlots: AlternativeTimeSlot[] = [];
    
    if (availableCourts.length === 0) {
      // First, try shorter durations for the same start time
      // Standard duration options: 30, 60, 90, 120, 150, 180 minutes
      const standardDurations = [30, 60, 90, 120, 150, 180];
      const shorterDurations = standardDurations.filter(d => d < duration);
      
      for (const altDuration of shorterDurations.reverse()) { // Start with longest shorter duration
        // Check if this duration would fit within business hours
        const altSlotEnd = addMinutesUTC(slotStart, altDuration);
        const altEndHour = altSlotEnd.getUTCHours() + altSlotEnd.getUTCMinutes() / 60;
        
        if (altEndHour > BUSINESS_END_HOUR) {
          continue; // Skip durations that would go past closing time
        }
        
        let availableCount = 0;
        
        for (const court of club.courts) {
          if (isCourtAvailable(court.id, slotStart, altSlotEnd, bookings)) {
            availableCount++;
          }
        }
        
        if (availableCount > 0) {
          alternativeDurations.push({
            duration: altDuration,
            availableCourtCount: availableCount,
          });
        }
      }
      
      // If no shorter durations available, find alternative time slots
      if (alternativeDurations.length === 0) {
      // Check alternative time slots (±2 hours from requested time, in 30-minute increments)
      const alternativeTimes: string[] = [];
      const [requestedHour, requestedMinute] = timeStart.split(":").map(Number);
      const requestedTotalMinutes = requestedHour * 60 + requestedMinute;
      
      // Generate time slots 2 hours before and after the requested time
      for (let offset = -120; offset <= 120; offset += 30) {
        if (offset === 0) continue; // Skip the originally requested time
        
        const alternativeMinutes = requestedTotalMinutes + offset;
        
        // Ensure we stay within business hours
        if (alternativeMinutes < BUSINESS_START_HOUR * 60 || alternativeMinutes >= BUSINESS_END_HOUR * 60) {
          continue;
        }
        
        // Check if the slot would end within business hours
        const endMinutes = alternativeMinutes + duration;
        if (endMinutes > BUSINESS_END_HOUR * 60) {
          continue;
        }
        
        const altHour = Math.floor(alternativeMinutes / 60);
        const altMinute = alternativeMinutes % 60;
        const altTimeString = `${altHour.toString().padStart(2, "0")}:${altMinute.toString().padStart(2, "0")}`;
        alternativeTimes.push(altTimeString);
      }
      
      // Check availability for each alternative time slot
      for (const altTime of alternativeTimes) {
        const altSlotStart = createUTCDate(dateParam, altTime);
        const altSlotEnd = addMinutesUTC(altSlotStart, duration);
        
        let availableCount = 0;
        
        for (const court of club.courts) {
          if (isCourtAvailable(court.id, altSlotStart, altSlotEnd, bookings)) {
            availableCount++;
          }
        }
        
        if (availableCount > 0) {
          alternativeTimeSlots.push({
            startTime: altTime,
            availableCourtCount: availableCount,
          });
        }
      }
      
      // Sort by closest to original time and limit to top 5 alternatives
      alternativeTimeSlots.sort((a, b) => {
        const [aHour, aMinute] = a.startTime.split(":").map(Number);
        const [bHour, bMinute] = b.startTime.split(":").map(Number);
        const aTotalMinutes = aHour * 60 + aMinute;
        const bTotalMinutes = bHour * 60 + bMinute;
        
        const aDiff = Math.abs(aTotalMinutes - requestedTotalMinutes);
        const bDiff = Math.abs(bTotalMinutes - requestedTotalMinutes);
        
        return aDiff - bDiff;
      });
      
      alternativeTimeSlots = alternativeTimeSlots.slice(0, 5);
      } // End of alternative time slots check (when no shorter durations available)
    } // End of no courts available check

    const response: AvailableCourtsResponse = {
      availableCourts,
      ...(alternativeDurations.length > 0 && { alternativeDurations }),
      ...(alternativeTimeSlots.length > 0 && { alternativeTimeSlots }),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching available courts:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
