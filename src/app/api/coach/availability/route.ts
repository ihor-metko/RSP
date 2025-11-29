import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/**
 * GET /api/coach/availability?date=YYYY-MM-DD
 * Fetch coach availability slots for a specific date
 */
export async function GET(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
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
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Parse date and create start/end of day
    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    const startOfDay = new Date(dateParam);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateParam);
    endOfDay.setHours(23, 59, 59, 999);

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

    // Parse club opening hours (format: "09:00-22:00" or similar)
    let clubOpeningHour = 9; // Default 9 AM
    let clubClosingHour = 22; // Default 10 PM
    
    if (coach.club.openingHours) {
      const match = coach.club.openingHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
      if (match) {
        clubOpeningHour = parseInt(match[1], 10);
        clubClosingHour = parseInt(match[3], 10);
      }
    }

    // Transform availability slots to match the API response format
    const formattedSlots = availabilitySlots.map((slot) => ({
      slotId: slot.id,
      startTime: slot.start.toTimeString().slice(0, 5), // HH:MM format
      endTime: slot.end.toTimeString().slice(0, 5), // HH:MM format
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
    const authResult = await requireRole(request, ["coach", "admin"]);
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

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
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
