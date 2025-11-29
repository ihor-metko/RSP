import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getDateString, isValidTimeFormat, formatTimeHHMM } from "@/utils/dateTime";

/**
 * PUT /api/coach/availability/[slotId]
 * Update or toggle availability for a specific slot
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const slotId = resolvedParams.slotId;

    if (!slotId) {
      return NextResponse.json(
        { error: "Missing slot ID" },
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

    // Find the availability slot
    const slot = await prisma.coachAvailability.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    // Verify the slot belongs to the coach
    if (slot.coachId !== coach.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startTime, endTime } = body;

    // If times are provided, update the slot
    if (startTime && endTime) {
      // Validate time format using utility function
      if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:MM" },
          { status: 400 }
        );
      }

      const dateStr = getDateString(slot.start);
      const newStart = new Date(`${dateStr}T${startTime}:00`);
      const newEnd = new Date(`${dateStr}T${endTime}:00`);

      if (newStart >= newEnd) {
        return NextResponse.json(
          { error: "Start time must be before end time" },
          { status: 400 }
        );
      }

      const updatedSlot = await prisma.coachAvailability.update({
        where: { id: slotId },
        data: {
          start: newStart,
          end: newEnd,
        },
      });

      return NextResponse.json({
        slotId: updatedSlot.id,
        startTime,
        endTime,
        date: dateStr,
      });
    }

    // If no body, return current slot info
    return NextResponse.json({
      slotId: slot.id,
      startTime: formatTimeHHMM(slot.start),
      endTime: formatTimeHHMM(slot.end),
      date: getDateString(slot.start),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating coach availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/coach/availability/[slotId]
 * Delete an availability slot (mark as unavailable)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const slotId = resolvedParams.slotId;

    if (!slotId) {
      return NextResponse.json(
        { error: "Missing slot ID" },
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

    // Find the availability slot
    const slot = await prisma.coachAvailability.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "Availability slot not found" },
        { status: 404 }
      );
    }

    // Verify the slot belongs to the coach
    if (slot.coachId !== coach.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Delete the availability slot
    await prisma.coachAvailability.delete({
      where: { id: slotId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting coach availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
