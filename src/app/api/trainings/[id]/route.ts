import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { createAdminNotification } from "@/lib/adminNotifications";

/**
 * GET /api/trainings/[id]
 * Get a specific training request
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, ["player", "coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const trainingId = resolvedParams.id;

    const training = await prisma.trainingRequest.findUnique({
      where: { id: trainingId },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Training request not found" },
        { status: 404 }
      );
    }

    // Authorization: players can only see their own requests
    if (authResult.userRole === "player" && training.playerId !== authResult.userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Coaches can only see requests assigned to them
    if (authResult.userRole === "coach") {
      const coach = await prisma.coach.findFirst({
        where: { userId: authResult.userId },
      });
      if (!coach || training.trainerId !== coach.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    // Fetch additional information
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

    return NextResponse.json({
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
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching training request:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/trainings/[id]
 * Update training request status (cancel, confirm, reject)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(request, ["player", "coach", "admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const trainingId = resolvedParams.id;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "Missing required field: status" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "confirmed", "rejected", "cancelled", "cancelled_by_player"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const training = await prisma.trainingRequest.findUnique({
      where: { id: trainingId },
    });

    if (!training) {
      return NextResponse.json(
        { error: "Training request not found" },
        { status: 404 }
      );
    }

    // Authorization checks
    // Players can only cancel their own pending requests
    if (authResult.userRole === "player") {
      if (training.playerId !== authResult.userId) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      if (body.status !== "cancelled" && body.status !== "cancelled_by_player") {
        return NextResponse.json(
          { error: "Players can only cancel their requests" },
          { status: 400 }
        );
      }
      if (training.status !== "pending") {
        return NextResponse.json(
          { error: "Can only cancel pending requests" },
          { status: 400 }
        );
      }
      // Force status to cancelled_by_player when player cancels
      body.status = "cancelled_by_player";
    }

    // Coaches can confirm or reject requests assigned to them
    if (authResult.userRole === "coach") {
      const coach = await prisma.coach.findFirst({
        where: { userId: authResult.userId },
      });
      if (!coach || training.trainerId !== coach.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      if (!["confirmed", "rejected"].includes(body.status)) {
        return NextResponse.json(
          { error: "Coaches can only confirm or reject requests" },
          { status: 400 }
        );
      }
    }

    // Determine if we need to cancel or confirm booking
    const shouldCancelBooking = body.status === "cancelled" || body.status === "rejected" || body.status === "cancelled_by_player";
    const shouldConfirmBooking = body.status === "confirmed";

    // Update training request and booking in a transaction
    const updatedTraining = await prisma.$transaction(async (tx) => {
      const updated = await tx.trainingRequest.update({
        where: { id: trainingId },
        data: { status: body.status },
      });

      // Handle booking status based on training status change
      if (training.bookingId) {
        if (shouldCancelBooking) {
          await tx.booking.update({
            where: { id: training.bookingId },
            data: { status: "cancelled" },
          });
        } else if (shouldConfirmBooking) {
          await tx.booking.update({
            where: { id: training.bookingId },
            data: { status: "reserved" },
          });
        }
      }

      return updated;
    });

    // Get court name for response
    let courtName = null;
    if (training.courtId) {
      const court = await prisma.court.findUnique({
        where: { id: training.courtId },
        select: { name: true },
      });
      courtName = court?.name || null;
    }

    // Emit admin notification for status changes
    // Note: We emit CANCELED for both cancelled and cancelled_by_player
    // ACCEPTED and DECLINED are emitted via the dedicated confirm/reject endpoints
    if (body.status === "cancelled" || body.status === "cancelled_by_player") {
      await createAdminNotification({
        type: "CANCELED",
        playerId: updatedTraining.playerId,
        coachId: updatedTraining.trainerId,
        trainingRequestId: updatedTraining.id,
        bookingId: updatedTraining.bookingId || undefined,
        sessionDate: updatedTraining.date,
        sessionTime: updatedTraining.time,
        courtInfo: courtName || undefined,
      });
    } else if (body.status === "confirmed") {
      await createAdminNotification({
        type: "ACCEPTED",
        playerId: updatedTraining.playerId,
        coachId: updatedTraining.trainerId,
        trainingRequestId: updatedTraining.id,
        bookingId: updatedTraining.bookingId || undefined,
        sessionDate: updatedTraining.date,
        sessionTime: updatedTraining.time,
        courtInfo: courtName || undefined,
      });
    } else if (body.status === "rejected") {
      await createAdminNotification({
        type: "DECLINED",
        playerId: updatedTraining.playerId,
        coachId: updatedTraining.trainerId,
        trainingRequestId: updatedTraining.id,
        bookingId: updatedTraining.bookingId || undefined,
        sessionDate: updatedTraining.date,
        sessionTime: updatedTraining.time,
        courtInfo: courtName || undefined,
      });
    }

    return NextResponse.json({
      id: updatedTraining.id,
      trainerId: updatedTraining.trainerId,
      playerId: updatedTraining.playerId,
      clubId: updatedTraining.clubId,
      courtId: updatedTraining.courtId,
      courtName,
      bookingId: updatedTraining.bookingId,
      date: updatedTraining.date.toISOString().split("T")[0],
      time: updatedTraining.time,
      comment: updatedTraining.comment,
      status: updatedTraining.status,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating training request:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
