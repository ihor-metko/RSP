import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatTimeHHMM } from "@/utils/dateTime";

/**
 * GET /api/trainers/[id]/availability
 * Fetch trainer availability for players to view when requesting training
 * No authentication required - this is public information
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const trainerId = resolvedParams.id;

    // Fetch trainer with availability
    const trainer = await prisma.coach.findUnique({
      where: { id: trainerId },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        availabilities: {
          where: {
            // Only show future availability
            start: { gte: new Date() },
          },
          orderBy: { start: "asc" },
          take: 30, // Limit to next 30 availability slots
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

    // Group availability by date
    const availabilityByDate: Record<string, { start: string; end: string }[]> = {};
    
    for (const slot of trainer.availabilities) {
      const dateKey = slot.start.toISOString().split("T")[0];
      if (!availabilityByDate[dateKey]) {
        availabilityByDate[dateKey] = [];
      }
      availabilityByDate[dateKey].push({
        start: formatTimeHHMM(slot.start),
        end: formatTimeHHMM(slot.end),
      });
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
