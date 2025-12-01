import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { isValidDateFormat, isValidTimeFormat, doTimesOverlap } from "@/utils/dateTime";
import { getResolvedPriceForSlot } from "@/lib/priceRules";
import { getCourtAvailabilitySuggestions, findAvailableCourts } from "@/lib/courtAvailability";
import { createAdminNotification } from "@/lib/adminNotifications";

interface TrainingRequest {
  trainerId: string;
  playerId: string;
  clubId: string;
  date: string;
  time: string;
  comment?: string;
}

// Training session duration in minutes (default 1 hour)
const TRAINING_DURATION_MINUTES = 60;

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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause based on user role
    const whereClause: {
      status?: string | { in: string[] };
      playerId?: string;
      trainerId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {};

    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Date filtering
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
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
      orderBy: [{ date: "desc" }, { time: "asc" }],
    });

    // Enrich training requests with trainer, court, and club information
    const enrichedTrainings = await Promise.all(
      trainings.map(async (training) => {
        const [trainer, court, club] = await Promise.all([
          prisma.coach.findUnique({
            where: { id: training.trainerId },
            include: { user: { select: { name: true } } },
          }),
          training.courtId
            ? prisma.court.findUnique({
                where: { id: training.courtId },
                select: { id: true, name: true },
              })
            : null,
          prisma.club.findUnique({
            where: { id: training.clubId },
            select: { id: true, name: true },
          }),
        ]);

        return {
          id: training.id,
          trainerId: training.trainerId,
          trainerName: trainer?.user?.name || "Unknown Trainer",
          playerId: training.playerId,
          clubId: training.clubId,
          clubName: club?.name || "Unknown Club",
          courtId: training.courtId,
          courtName: court?.name || null,
          bookingId: training.bookingId,
          date: training.date.toISOString().split("T")[0],
          time: training.time,
          comment: training.comment,
          status: training.status,
          createdAt: training.createdAt.toISOString(),
          updatedAt: training.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ trainings: enrichedTrainings });
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
        timeOffs: {
          where: {
            date: new Date(body.date),
          },
        },
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

    // Check if trainer has time off on this day
    if (trainer.timeOffs.length > 0) {
      // Calculate end time for the training session
      const [hours, mins] = body.time.split(":").map(Number);
      const totalMinutes = hours * 60 + mins + TRAINING_DURATION_MINUTES;
      const endHours = Math.floor(totalMinutes / 60);
      const endMins = totalMinutes % 60;
      const trainingEndTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;

      for (const timeOff of trainer.timeOffs) {
        // Full-day time off blocks the entire day
        if (!timeOff.startTime && !timeOff.endTime) {
          return NextResponse.json(
            { error: "This coach is unavailable on the selected day." },
            { status: 400 }
          );
        }
        // Partial-day time off - check if training time overlaps with time off
        if (timeOff.startTime && timeOff.endTime) {
          if (doTimesOverlap(body.time, trainingEndTime, timeOff.startTime, timeOff.endTime)) {
            return NextResponse.json(
              { error: "This coach is unavailable during the selected time." },
              { status: 400 }
            );
          }
        }
      }
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
      // Get suggestions for alternative slots
      const suggestions = await getCourtAvailabilitySuggestions(
        body.clubId,
        body.trainerId,
        body.date,
        body.time
      );
      return NextResponse.json(
        { 
          error: "Trainer already has training at this time. Choose another slot.",
          code: "TRAINER_NOT_AVAILABLE",
          suggestions,
        },
        { status: 409 }
      );
    }

    // Find an available court for the requested time using the helper
    const availableCourts = await findAvailableCourts(
      body.clubId,
      body.date,
      body.time,
      TRAINING_DURATION_MINUTES
    );

    // Get all courts to check if the club has any courts
    const allCourts = await prisma.court.findMany({
      where: { clubId: body.clubId },
    });

    if (allCourts.length === 0) {
      return NextResponse.json(
        { error: "No courts available at this club. Please contact support." },
        { status: 400 }
      );
    }

    if (availableCourts.length === 0) {
      // Get suggestions for alternative slots
      const suggestions = await getCourtAvailabilitySuggestions(
        body.clubId,
        body.trainerId,
        body.date,
        body.time
      );
      return NextResponse.json(
        { 
          error: "No courts available at the selected time. Please choose a different time slot.",
          code: "NO_COURT_AVAILABLE",
          suggestions,
        },
        { status: 409 }
      );
    }

    const availableCourt = allCourts.find(c => c.id === availableCourts[0].courtId)!;

    // Calculate start and end times for the booking
    const startTime = new Date(`${body.date}T${body.time}:00.000Z`);
    const endTime = new Date(startTime.getTime() + TRAINING_DURATION_MINUTES * 60 * 1000);

    // Calculate price for the booking
    let resolvedPrice: number;
    try {
      resolvedPrice = await getResolvedPriceForSlot(
        availableCourt.id,
        body.date,
        body.time,
        TRAINING_DURATION_MINUTES
      );
    } catch (priceError) {
      // Log error in development and fall back to default price
      if (process.env.NODE_ENV === "development") {
        console.error("Price calculation failed, using default:", priceError);
      }
      resolvedPrice = availableCourt.defaultPriceCents;
    }

    // Create booking and training request in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the booking with pending status (will be confirmed when trainer accepts)
      const booking = await tx.booking.create({
        data: {
          courtId: availableCourt.id,
          userId: body.playerId,
          coachId: body.trainerId,
          start: startTime,
          end: endTime,
          price: resolvedPrice,
          status: "pending", // Pending until trainer confirms
        },
      });

      // Create training request with court and booking info
      const trainingRequest = await tx.trainingRequest.create({
        data: {
          trainerId: body.trainerId,
          playerId: body.playerId,
          clubId: body.clubId,
          courtId: availableCourt.id,
          bookingId: booking.id,
          date: requestedDate,
          time: body.time,
          comment: body.comment || null,
          status: "pending",
        },
      });

      return { booking, trainingRequest };
    });

    // Emit admin notification for new training request
    await createAdminNotification({
      type: "REQUESTED",
      playerId: body.playerId,
      coachId: body.trainerId,
      trainingRequestId: result.trainingRequest.id,
      bookingId: result.trainingRequest.bookingId || undefined,
      sessionDate: new Date(body.date),
      sessionTime: body.time,
      courtInfo: availableCourt.name,
    });

    return NextResponse.json(
      {
        id: result.trainingRequest.id,
        trainerId: result.trainingRequest.trainerId,
        playerId: result.trainingRequest.playerId,
        clubId: result.trainingRequest.clubId,
        courtId: result.trainingRequest.courtId,
        courtName: availableCourt.name,
        bookingId: result.trainingRequest.bookingId,
        date: body.date,
        time: result.trainingRequest.time,
        comment: result.trainingRequest.comment,
        status: result.trainingRequest.status,
        message: "Training request sent. A court has been reserved pending trainer confirmation.",
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
