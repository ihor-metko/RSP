import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";
import { isValidDateFormat, isValidTimeFormat, isValidTimeRange, doTimesOverlap } from "@/utils/dateTime";
import type { CoachTimeOffEntry, CreateTimeOffRequest } from "@/types/coach";

/**
 * GET /api/coach/timeoff
 * Fetch all time off entries for the authenticated coach
 */
export async function GET(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
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

    // Fetch all time off entries for the coach
    const timeOffs = await prisma.coachTimeOff.findMany({
      where: { coachId: coach.id },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" },
      ],
    });

    const formattedTimeOffs: CoachTimeOffEntry[] = timeOffs.map((entry) => ({
      id: entry.id,
      coachId: entry.coachId,
      date: entry.date.toISOString().split("T")[0],
      startTime: entry.startTime,
      endTime: entry.endTime,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
    }));

    return NextResponse.json({ timeOffs: formattedTimeOffs });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching coach time off:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coach/timeoff
 * Create a new time off entry for the authenticated coach
 */
export async function POST(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
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

    const body: CreateTimeOffRequest = await request.json();
    const { date, startTime, endTime, reason } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { error: "Missing required field: date" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!isValidDateFormat(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // If startTime or endTime provided, validate both
    const hasPartialDay = startTime !== undefined || endTime !== undefined;
    if (hasPartialDay) {
      if (!startTime || !endTime) {
        return NextResponse.json(
          { error: "Both startTime and endTime are required for partial-day time off" },
          { status: 400 }
        );
      }

      if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:mm" },
          { status: 400 }
        );
      }

      if (!isValidTimeRange(startTime, endTime)) {
        return NextResponse.json(
          { error: "Start time must be before end time" },
          { status: 400 }
        );
      }
    }

    // Check for conflicts with existing bookings
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const existingBookings = await prisma.booking.findMany({
      where: {
        coachId: coach.id,
        start: {
          gte: dateStart,
          lte: dateEnd,
        },
        status: { notIn: ["cancelled"] },
      },
    });

    if (existingBookings.length > 0) {
      // Check if time off overlaps with any existing booking
      for (const booking of existingBookings) {
        const bookingStartTime = booking.start.toTimeString().slice(0, 5);
        const bookingEndTime = booking.end.toTimeString().slice(0, 5);

        // If full-day time off, any booking is a conflict
        if (!hasPartialDay) {
          return NextResponse.json(
            { error: "Cannot create time off: conflicts with existing booking" },
            { status: 409 }
          );
        }

        // Check if partial-day time off overlaps with booking
        if (doTimesOverlap(startTime!, endTime!, bookingStartTime, bookingEndTime)) {
          return NextResponse.json(
            { error: "Cannot create time off: conflicts with existing booking" },
            { status: 409 }
          );
        }
      }
    }

    // Check for overlapping time off entries on the same date
    const existingTimeOffs = await prisma.coachTimeOff.findMany({
      where: {
        coachId: coach.id,
        date: new Date(date),
      },
    });

    for (const existing of existingTimeOffs) {
      // If either entry is full-day, they conflict
      if (!existing.startTime || !existing.endTime || !hasPartialDay) {
        return NextResponse.json(
          { error: "Time off entry already exists for this date" },
          { status: 409 }
        );
      }

      // Check if partial-day time offs overlap
      if (doTimesOverlap(startTime!, endTime!, existing.startTime, existing.endTime)) {
        return NextResponse.json(
          { error: "This time off overlaps with an existing time off entry" },
          { status: 409 }
        );
      }
    }

    // Create the time off entry
    const timeOff = await prisma.coachTimeOff.create({
      data: {
        coachId: coach.id,
        date: new Date(date),
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
      },
    });

    const formattedTimeOff: CoachTimeOffEntry = {
      id: timeOff.id,
      coachId: timeOff.coachId,
      date: timeOff.date.toISOString().split("T")[0],
      startTime: timeOff.startTime,
      endTime: timeOff.endTime,
      reason: timeOff.reason,
      createdAt: timeOff.createdAt.toISOString(),
      updatedAt: timeOff.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedTimeOff, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating coach time off:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
