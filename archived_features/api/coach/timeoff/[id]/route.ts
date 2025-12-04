import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";
import { isValidDateFormat, isValidTimeFormat, isValidTimeRange, doTimesOverlap } from "@/utils/dateTime";
import type { CoachTimeOffEntry, UpdateTimeOffRequest } from "@/types/coach";

/**
 * PUT /api/coach/timeoff/[id]
 * Update an existing time off entry
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: "Missing time off ID" },
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

    // Find the time off entry and verify ownership
    const existingTimeOff = await prisma.coachTimeOff.findUnique({
      where: { id },
    });

    if (!existingTimeOff) {
      return NextResponse.json(
        { error: "Time off entry not found" },
        { status: 404 }
      );
    }

    if (existingTimeOff.coachId !== coach.id && authResult.userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: You can only modify your own time off entries" },
        { status: 403 }
      );
    }

    const body: UpdateTimeOffRequest = await request.json();
    const { date, startTime, endTime, reason } = body;

    // Determine final values
    const finalDate = date !== undefined ? date : existingTimeOff.date.toISOString().split("T")[0];
    const finalStartTime = startTime !== undefined ? startTime : existingTimeOff.startTime;
    const finalEndTime = endTime !== undefined ? endTime : existingTimeOff.endTime;
    const finalReason = reason !== undefined ? reason : existingTimeOff.reason;

    // Validate date format if provided
    if (date !== undefined && !isValidDateFormat(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format if provided
    const hasPartialDay = finalStartTime !== null || finalEndTime !== null;
    if (hasPartialDay) {
      if (!finalStartTime || !finalEndTime) {
        return NextResponse.json(
          { error: "Both startTime and endTime are required for partial-day time off" },
          { status: 400 }
        );
      }

      if (!isValidTimeFormat(finalStartTime) || !isValidTimeFormat(finalEndTime)) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:mm" },
          { status: 400 }
        );
      }

      if (!isValidTimeRange(finalStartTime, finalEndTime)) {
        return NextResponse.json(
          { error: "Start time must be before end time" },
          { status: 400 }
        );
      }
    }

    // Check for conflicts with existing bookings
    const dateStart = new Date(finalDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(finalDate);
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
      for (const booking of existingBookings) {
        const bookingStartTime = booking.start.toTimeString().slice(0, 5);
        const bookingEndTime = booking.end.toTimeString().slice(0, 5);

        if (!hasPartialDay) {
          return NextResponse.json(
            { error: "Cannot update time off: conflicts with existing booking" },
            { status: 409 }
          );
        }

        if (doTimesOverlap(finalStartTime!, finalEndTime!, bookingStartTime, bookingEndTime)) {
          return NextResponse.json(
            { error: "Cannot update time off: conflicts with existing booking" },
            { status: 409 }
          );
        }
      }
    }

    // Check for overlapping time off entries (excluding current one)
    const existingTimeOffs = await prisma.coachTimeOff.findMany({
      where: {
        coachId: coach.id,
        date: new Date(finalDate),
        NOT: { id },
      },
    });

    for (const existing of existingTimeOffs) {
      if (!existing.startTime || !existing.endTime || !hasPartialDay) {
        return NextResponse.json(
          { error: "Time off entry already exists for this date" },
          { status: 409 }
        );
      }

      if (doTimesOverlap(finalStartTime!, finalEndTime!, existing.startTime, existing.endTime)) {
        return NextResponse.json(
          { error: "This time off overlaps with an existing time off entry" },
          { status: 409 }
        );
      }
    }

    // Update the time off entry
    const updatedTimeOff = await prisma.coachTimeOff.update({
      where: { id },
      data: {
        date: new Date(finalDate),
        startTime: finalStartTime,
        endTime: finalEndTime,
        reason: finalReason,
      },
    });

    const formattedTimeOff: CoachTimeOffEntry = {
      id: updatedTimeOff.id,
      coachId: updatedTimeOff.coachId,
      date: updatedTimeOff.date.toISOString().split("T")[0],
      startTime: updatedTimeOff.startTime,
      endTime: updatedTimeOff.endTime,
      reason: updatedTimeOff.reason,
      createdAt: updatedTimeOff.createdAt.toISOString(),
      updatedAt: updatedTimeOff.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedTimeOff);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating coach time off:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coach/timeoff/[id]
 * Delete a time off entry
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { error: "Missing time off ID" },
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

    // Find the time off entry and verify ownership
    const existingTimeOff = await prisma.coachTimeOff.findUnique({
      where: { id },
    });

    if (!existingTimeOff) {
      return NextResponse.json(
        { error: "Time off entry not found" },
        { status: 404 }
      );
    }

    if (existingTimeOff.coachId !== coach.id && authResult.userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own time off entries" },
        { status: 403 }
      );
    }

    // Delete the time off entry
    await prisma.coachTimeOff.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting coach time off:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
