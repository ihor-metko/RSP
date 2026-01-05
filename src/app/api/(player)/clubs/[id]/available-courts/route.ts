import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResolvedPriceForSlot } from "@/lib/priceRules";

// Business hours configuration (same as availability endpoint)
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 22;

interface AvailableCourt {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  sportType: string;
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

interface AvailableCourtsResponse {
  availableCourts: AvailableCourt[];
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
          },
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            surface: true,
            indoor: true,
            sportType: true,
            defaultPriceCents: true,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Parse requested slot times
    const [startHour] = timeStart.split(":").map(Number);
    const slotStart = new Date(`${dateParam}T${timeStart}:00.000Z`);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

    // Validate slot is within business hours
    const endHour = slotEnd.getUTCHours() + slotEnd.getUTCMinutes() / 60;
    if (startHour < BUSINESS_START_HOUR || endHour > BUSINESS_END_HOUR) {
      // Slot is outside business hours - return empty list
      const response: AvailableCourtsResponse = {
        availableCourts: [],
      };
      return NextResponse.json(response);
    }

    // Get all bookings for the club's courts on the specified date
    const dayStart = new Date(`${dateParam}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateParam}T23:59:59.999Z`);

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
      // Check if there are any overlapping bookings for this court
      const courtBookings = bookings.filter((b) => b.courtId === court.id);
      let isAvailable = true;

      for (const booking of courtBookings) {
        const bookingStart = new Date(booking.start);
        const bookingEnd = new Date(booking.end);

        // Check for overlap: booking overlaps if it starts before slot ends AND ends after slot starts
        if (bookingStart < slotEnd && bookingEnd > slotStart) {
          isAvailable = false;
          break;
        }
      }

      if (isAvailable) {
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
          defaultPriceCents: court.defaultPriceCents,
          priceCents: resolvedPrice,
        });
      }
    }

    const response: AvailableCourtsResponse = {
      availableCourts,
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
