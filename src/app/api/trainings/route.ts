import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { isValidDateFormat, isValidTimeFormat } from "@/utils/dateTime";

interface TrainingRequest {
  trainerId: string;
  playerId: string;
  clubId: string;
  date: string;
  time: string;
  comment?: string;
}

/**
 * GET /api/trainings
 * Fetch training requests for the authenticated user
 */
export async function GET(request: Request) {
  try {
    // Role check: player, coach, admin can access
    const authResult = await requireRole(request, ["player", "coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Build where clause based on user role
    const whereClause: {
      status?: string;
      playerId?: string;
      trainerId?: string;
    } = {};

    if (status) {
      whereClause.status = status;
    }

    // Players see their own requests
    if (authResult.userRole === "player") {
      whereClause.playerId = authResult.userId;
    }
    // Coaches see requests assigned to them
    else if (authResult.userRole === "coach") {
      // Find coach record for this user
      const coach = await prisma.coach.findFirst({
        where: { userId: authResult.userId },
      });
      if (coach) {
        whereClause.trainerId = coach.id;
      }
    }
    // Admins can see all requests (no additional filter)

    const trainings = await prisma.trainingRequest.findMany({
      where: whereClause,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    return NextResponse.json({ trainings });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching training requests:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trainings
 * Create a new training request
 */
export async function POST(request: Request) {
  try {
    // Role check: player, admin can create training requests
    const authResult = await requireRole(request, ["player", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body: TrainingRequest = await request.json();

    // Validate required fields
    if (!body.trainerId || !body.playerId || !body.clubId || !body.date || !body.time) {
      return NextResponse.json(
        { error: "Missing required fields: trainerId, playerId, clubId, date, and time are required" },
        { status: 400 }
      );
    }

    // Validate date format
    if (!isValidDateFormat(body.date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format
    if (!isValidTimeFormat(body.time)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM" },
        { status: 400 }
      );
    }

    // Verify trainer exists and belongs to the club
    const trainer = await prisma.coach.findFirst({
      where: {
        id: body.trainerId,
        clubId: body.clubId,
      },
      include: {
        weeklyAvailabilities: true,
      },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "Trainer not found in this club" },
        { status: 400 }
      );
    }

    // Parse date - the body.date is in YYYY-MM-DD format
    const requestedDate = new Date(body.date);
    
    // Get day of week from the requested date (0=Sunday, 6=Saturday)
    const requestedDayOfWeek = requestedDate.getDay();

    // Check if trainer has weekly availability on this day of the week
    const daySlotsForWeekday = trainer.weeklyAvailabilities.filter(
      (slot) => slot.dayOfWeek === requestedDayOfWeek
    );

    // If no slots exist for this day of week, trainer doesn't work on this day
    if (daySlotsForWeekday.length === 0) {
      return NextResponse.json(
        { error: "Trainer does not work on this day. Choose another date." },
        { status: 400 }
      );
    }

    // Check if the requested time falls within any of the day's slots
    const isWithinWorkingHours = daySlotsForWeekday.some(
      (slot) => body.time >= slot.startTime && body.time < slot.endTime
    );

    if (!isWithinWorkingHours) {
      return NextResponse.json(
        { error: "Trainer is not available at this time. Choose another slot." },
        { status: 400 }
      );
    }

    // Check for existing training at the same time
    const existingTraining = await prisma.trainingRequest.findFirst({
      where: {
        trainerId: body.trainerId,
        date: requestedDate,
        time: body.time,
        status: { in: ["pending", "confirmed"] },
      },
    });

    if (existingTraining) {
      return NextResponse.json(
        { error: "Trainer already has training at this time. Choose another slot." },
        { status: 409 }
      );
    }

    // Create training request
    const trainingRequest = await prisma.trainingRequest.create({
      data: {
        trainerId: body.trainerId,
        playerId: body.playerId,
        clubId: body.clubId,
        date: requestedDate,
        time: body.time,
        comment: body.comment || null,
        status: "pending",
      },
    });

    return NextResponse.json(
      {
        id: trainingRequest.id,
        trainerId: trainingRequest.trainerId,
        playerId: trainingRequest.playerId,
        clubId: trainingRequest.clubId,
        date: body.date,
        time: trainingRequest.time,
        comment: trainingRequest.comment,
        status: trainingRequest.status,
        message: "Training request sent. Waiting for trainer confirmation.",
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating training request:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
