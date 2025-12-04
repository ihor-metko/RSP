import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";
import { createDayRange, isValidDateFormat, isValidTimeFormat, parseOpeningHours, formatTimeHHMM } from "@/utils/dateTime";

/**
 * GET /api/coach/availability?date=YYYY-MM-DD
 * Fetch coach availability slots for a specific date
 */
export async function GET(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Validate date parameter
    if (!dateParam) {
      return NextResponse.json(
        { error: "Missing required parameter: date" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!isValidDateFormat(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const { startOfDay, endOfDay } = createDayRange(dateParam);

    // Find the coach record for the authenticated user
    const coach = await prisma.coach.findFirst({
      where: { userId: authResult.userId },
      include: {
        club: {
          select: {
            openingHours: true,
          },
        },
      },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    // Check if coach has a club assigned
    // If no club, use default hours (09:00 - 21:00)
    let clubOpeningHour = 9;
    let clubClosingHour = 21;
    
    if (coach.club) {
      const parsedHours = parseOpeningHours(coach.club.openingHours);
      clubOpeningHour = parsedHours.openingHour;
      clubClosingHour = parsedHours.closingHour;
    }

    // Fetch coach availability slots for the specified date
    const availabilitySlots = await prisma.coachAvailability.findMany({
      where: {
        coachId: coach.id,
        start: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        start: "asc",
      },
    });

    // Transform availability slots to match the API response format
    const formattedSlots = availabilitySlots.map((slot) => ({
      slotId: slot.id,
      startTime: formatTimeHHMM(slot.start),
      endTime: formatTimeHHMM(slot.end),
      date: dateParam,
    }));

    return NextResponse.json({
      availableSlots: formattedSlots,
      clubHours: {
        opening: `${clubOpeningHour.toString().padStart(2, "0")}:00`,
        closing: `${clubClosingHour.toString().padStart(2, "0")}:00`,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching coach availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coach/availability
 * Create a new availability slot for the coach
 */
export async function POST(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { startTime, endTime, date } = body;

    // Validate required fields
    if (!startTime || !endTime || !date) {
      return NextResponse.json(
        { error: "Missing required fields: startTime, endTime, and date are required" },
        { status: 400 }
      );
    }

    // Validate date format using utility function
    if (!isValidDateFormat(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format using utility function
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM" },
        { status: 400 }
      );
    }

    // Find the coach record for the authenticated user
    const coach = await prisma.coach.findFirst({
      where: { userId: authResult.userId },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    // Create DateTime objects for start and end
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (start >= end) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Create the availability slot
    const slot = await prisma.coachAvailability.create({
      data: {
        coachId: coach.id,
        start,
        end,
      },
    });

    return NextResponse.json(
      {
        slotId: slot.id,
        startTime,
        endTime,
        date,
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating coach availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
