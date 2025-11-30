import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { isValidTimeFormat, isValidTimeRange, doTimesOverlap, isValidDayOfWeek } from "@/utils/dateTime";
import type { CoachWeeklyAvailabilitySlot, UpdateAvailabilitySlotRequest } from "@/types/coach";

/**
 * PUT /api/coaches/[coachId]/availability/[slotId]
 * Update an existing availability slot
 * Only the coach themselves or an admin can update slots
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ coachId: string; slotId: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const { coachId, slotId } = resolvedParams;

    if (!coachId || !slotId) {
      return NextResponse.json(
        { error: "Missing coach ID or slot ID" },
        { status: 400 }
      );
    }

    // Verify the coach exists
    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach not found" },
        { status: 404 }
      );
    }

    // Verify the authenticated user is the coach or an admin
    if (authResult.userRole !== "admin" && coach.userId !== authResult.userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only modify your own availability" },
        { status: 403 }
      );
    }

    // Find the slot and verify it belongs to this coach
    const existingSlot = await prisma.coachWeeklyAvailability.findUnique({
      where: { id: slotId },
    });

    if (!existingSlot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    if (existingSlot.coachId !== coachId) {
      return NextResponse.json(
        { error: "Slot does not belong to this coach" },
        { status: 403 }
      );
    }

    const body: UpdateAvailabilitySlotRequest = await request.json();
    const { dayOfWeek, startTime, endTime, note } = body;

    // Determine the final values (use existing if not provided)
    const finalDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : existingSlot.dayOfWeek;
    const finalStartTime = startTime || existingSlot.startTime;
    const finalEndTime = endTime || existingSlot.endTime;
    const finalNote = note !== undefined ? note : existingSlot.note;

    // Validate dayOfWeek if provided
    if (dayOfWeek !== undefined && !isValidDayOfWeek(dayOfWeek)) {
      return NextResponse.json(
        { error: "Invalid dayOfWeek. Must be an integer from 0 (Sunday) to 6 (Saturday)" },
        { status: 400 }
      );
    }

    // Validate time format if provided
    if (startTime && !isValidTimeFormat(startTime)) {
      return NextResponse.json(
        { error: "Invalid startTime format. Use HH:mm" },
        { status: 400 }
      );
    }
    if (endTime && !isValidTimeFormat(endTime)) {
      return NextResponse.json(
        { error: "Invalid endTime format. Use HH:mm" },
        { status: 400 }
      );
    }

    // Validate startTime < endTime
    if (!isValidTimeRange(finalStartTime, finalEndTime)) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Check for overlapping slots on the same day (excluding the current slot)
    const existingSlots = await prisma.coachWeeklyAvailability.findMany({
      where: {
        coachId,
        dayOfWeek: finalDayOfWeek,
        NOT: { id: slotId },
      },
    });

    const hasOverlap = existingSlots.some((slot) =>
      doTimesOverlap(finalStartTime, finalEndTime, slot.startTime, slot.endTime)
    );

    if (hasOverlap) {
      return NextResponse.json(
        { error: "This slot overlaps with an existing availability slot" },
        { status: 409 }
      );
    }

    // Update the slot
    const updatedSlot = await prisma.coachWeeklyAvailability.update({
      where: { id: slotId },
      data: {
        dayOfWeek: finalDayOfWeek,
        startTime: finalStartTime,
        endTime: finalEndTime,
        note: finalNote,
      },
    });

    const formattedSlot: CoachWeeklyAvailabilitySlot = {
      id: updatedSlot.id,
      coachId: updatedSlot.coachId,
      dayOfWeek: updatedSlot.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: updatedSlot.startTime,
      endTime: updatedSlot.endTime,
      note: updatedSlot.note,
      createdAt: updatedSlot.createdAt.toISOString(),
      updatedAt: updatedSlot.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedSlot);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating coach weekly availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coaches/[coachId]/availability/[slotId]
 * Delete an availability slot
 * Only the coach themselves or an admin can delete slots
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ coachId: string; slotId: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const { coachId, slotId } = resolvedParams;

    if (!coachId || !slotId) {
      return NextResponse.json(
        { error: "Missing coach ID or slot ID" },
        { status: 400 }
      );
    }

    // Verify the coach exists
    const coach = await prisma.coach.findUnique({
      where: { id: coachId },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach not found" },
        { status: 404 }
      );
    }

    // Verify the authenticated user is the coach or an admin
    if (authResult.userRole !== "admin" && coach.userId !== authResult.userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only modify your own availability" },
        { status: 403 }
      );
    }

    // Find the slot and verify it belongs to this coach
    const existingSlot = await prisma.coachWeeklyAvailability.findUnique({
      where: { id: slotId },
    });

    if (!existingSlot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    if (existingSlot.coachId !== coachId) {
      return NextResponse.json(
        { error: "Slot does not belong to this coach" },
        { status: 403 }
      );
    }

    // Delete the slot
    await prisma.coachWeeklyAvailability.delete({
      where: { id: slotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting coach weekly availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
