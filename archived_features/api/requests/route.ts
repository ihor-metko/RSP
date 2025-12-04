import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";

interface TrainingRequestFilter {
  trainerId?: string;
  status?: string;
  date?: Date;
}

/**
 * GET /api/trainer/requests
 * Fetch all training requests assigned to the authenticated trainer
 * Supports filtering by status and date
 */
export async function GET(request: Request) {
  try {
    // Role check: only coach or admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Find coach record for this user
    const coach = await prisma.coach.findFirst({
      where: { userId: authResult.userId },
    });

    if (!coach && authResult.userRole !== "super_admin") {
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    // Build where clause
    const whereClause: TrainingRequestFilter = {};

    // Coaches see only their requests, admins see all
    if (authResult.userRole === "coach" && coach) {
      whereClause.trainerId = coach.id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (date) {
      whereClause.date = new Date(date);
    }

    const requests = await prisma.trainingRequest.findMany({
      where: whereClause,
      orderBy: [{ date: "desc" }, { time: "asc" }],
    });

    // Get player, club, court information for each request
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        const [player, club, trainerInfo, court] = await Promise.all([
          prisma.user.findUnique({
            where: { id: req.playerId },
            select: { id: true, name: true, email: true },
          }),
          prisma.club.findUnique({
            where: { id: req.clubId },
            select: { id: true, name: true },
          }),
          prisma.coach.findUnique({
            where: { id: req.trainerId },
            include: {
              user: { select: { name: true } },
            },
          }),
          req.courtId
            ? prisma.court.findUnique({
                where: { id: req.courtId },
                select: { id: true, name: true },
              })
            : null,
        ]);

        return {
          id: req.id,
          trainerId: req.trainerId,
          trainerName: trainerInfo?.user?.name || "Unknown Trainer",
          playerId: req.playerId,
          playerName: player?.name || "Unknown Player",
          playerEmail: player?.email || "",
          clubId: req.clubId,
          clubName: club?.name || "Unknown Club",
          courtId: req.courtId,
          courtName: court?.name || null,
          bookingId: req.bookingId,
          bookingStatus: req.status === "confirmed" ? "confirmed" : "pending",
          date: req.date.toISOString().split("T")[0],
          time: req.time,
          comment: req.comment,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
        };
      })
    );

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching trainer requests:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
