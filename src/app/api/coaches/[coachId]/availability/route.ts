import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { isValidTimeFormat, isValidTimeRange, doTimesOverlap, isValidDayOfWeek } from "@/utils/dateTime";
import type { CoachWeeklyAvailabilitySlot, CreateAvailabilitySlotRequest } from "@/types/coach";

/**
 * GET /api/coaches/[coachId]/availability
 * Returns all weekly availability slots for the specified coach
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ coachId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { coachId } = resolvedParams;

    if (!coachId) {
      return NextResponse.json(
        { error: "Missing coach ID" },
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

    // Fetch all weekly availability slots for the coach
    const slots = await prisma.coachWeeklyAvailability.findMany({
      where: { coachId },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    const formattedSlots: CoachWeeklyAvailabilitySlot[] = slots.map((slot) => ({
      id: slot.id,
      coachId: slot.coachId,
      dayOfWeek: slot.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: slot.startTime,
      endTime: slot.endTime,
      note: slot.note,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    }));

    return NextResponse.json({ slots: formattedSlots });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching coach weekly availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coaches/[coachId]/availability
 * Create a new weekly availability slot for the coach
 * Only the coach themselves or an admin can add slots
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ coachId: string }> }
) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const { coachId } = resolvedParams;

    if (!coachId) {
      return NextResponse.json(
        { error: "Missing coach ID" },
        { status: 400 }
      );
    }

    // Verify the coach exists and get their user ID
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

    const body: CreateAvailabilitySlotRequest = await request.json();
    const { dayOfWeek, startTime, endTime, note } = body;

    // Validate required fields
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields: dayOfWeek, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    // Validate dayOfWeek
    if (!isValidDayOfWeek(dayOfWeek)) {
      return NextResponse.json(
        { error: "Invalid dayOfWeek. Must be an integer from 0 (Sunday) to 6 (Saturday)" },
        { status: 400 }
      );
    }

    // Validate time format
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:mm" },
        { status: 400 }
      );
    }

    // Validate startTime < endTime
    if (!isValidTimeRange(startTime, endTime)) {
      return NextResponse.json(
        { error: "Start time must be before end time" },
        { status: 400 }
      );
    }

    // Check for overlapping slots on the same day
    const existingSlots = await prisma.coachWeeklyAvailability.findMany({
      where: {
        coachId,
        dayOfWeek,
      },
    });

    const hasOverlap = existingSlots.some((slot) =>
      doTimesOverlap(startTime, endTime, slot.startTime, slot.endTime)
    );

    if (hasOverlap) {
      return NextResponse.json(
        { error: "This slot overlaps with an existing availability slot" },
        { status: 409 }
      );
    }

    // Create the new availability slot
    const slot = await prisma.coachWeeklyAvailability.create({
      data: {
        coachId,
        dayOfWeek,
        startTime,
        endTime,
        note: note || null,
      },
    });

    const formattedSlot: CoachWeeklyAvailabilitySlot = {
      id: slot.id,
      coachId: slot.coachId,
      dayOfWeek: slot.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: slot.startTime,
      endTime: slot.endTime,
      note: slot.note,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    };

    return NextResponse.json(formattedSlot, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating coach weekly availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
