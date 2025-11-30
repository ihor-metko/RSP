import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Number of days to generate availability for
const AVAILABILITY_DAYS = 14;

/**
 * GET /api/trainers/[id]/availability
 * Fetch trainer availability for players to view when requesting training
 * No authentication required - this is public information
 * 
 * Uses CoachWeeklyAvailability to generate availability for the next 14 days
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const trainerId = resolvedParams.id;

    // Fetch trainer with weekly availability
    const trainer = await prisma.coach.findUnique({
      where: { id: trainerId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        weeklyAvailabilities: {
          orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" },
          ],
        },
      },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "Trainer not found" },
        { status: 404 }
      );
    }

    // Get existing training requests for this trainer (to show busy times)
    const existingTrainings = await prisma.trainingRequest.findMany({
      where: {
        trainerId,
        date: { gte: new Date() },
        status: { in: ["pending", "confirmed"] },
      },
    });

    // Transform weekly availability into specific dates for the next N days
    const availabilityByDate: Record<string, { start: string; end: string }[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < AVAILABILITY_DAYS; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
      const dateKey = date.toISOString().split("T")[0];

      // Find all weekly availability slots for this day of week
      const daySlots = trainer.weeklyAvailabilities.filter(
        (slot) => slot.dayOfWeek === dayOfWeek
      );

      if (daySlots.length > 0) {
        availabilityByDate[dateKey] = daySlots.map((slot) => ({
          start: slot.startTime,
          end: slot.endTime,
        }));
      }
    }

    // Group busy times by date
    const busyTimesByDate: Record<string, string[]> = {};
    for (const training of existingTrainings) {
      const dateKey = training.date.toISOString().split("T")[0];
      if (!busyTimesByDate[dateKey]) {
        busyTimesByDate[dateKey] = [];
      }
      busyTimesByDate[dateKey].push(training.time);
    }

    return NextResponse.json({
      trainerId: trainer.id,
      trainerName: trainer.user.name || "Unknown Trainer",
      availability: availabilityByDate,
      busyTimes: busyTimesByDate,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching trainer availability:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
