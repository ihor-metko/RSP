import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleLegacy as requireRole } from "@/lib/requireRole";
import { createAdminNotification } from "@/lib/adminNotifications";

/**
 * PUT /api/trainer/requests/[requestId]/reject
 * Reject a training request
 * Only the assigned trainer or admin can reject
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const requestId = resolvedParams.requestId;

    // Find the training request
    const trainingRequest = await prisma.trainingRequest.findUnique({
      where: { id: requestId },
    });

    if (!trainingRequest) {
      return NextResponse.json(
        { error: "Training request not found" },
        { status: 404 }
      );
    }

    // Find coach record for this user
    const coach = await prisma.coach.findFirst({
      where: { userId: authResult.userId },
    });

    // Authorization: only assigned trainer or admin can reject
    if (authResult.userRole === "coach") {
      if (!coach || trainingRequest.trainerId !== coach.id) {
        return NextResponse.json(
          { error: "You can only reject your own training requests" },
          { status: 403 }
        );
      }
    }

    // Validate the request is pending
    if (trainingRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot reject a request with status: ${trainingRequest.status}` },
        { status: 400 }
      );
    }

    // Update training request and booking in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the training request status to rejected
      const updatedRequest = await tx.trainingRequest.update({
        where: { id: requestId },
        data: { status: "rejected" },
      });

      // If there's an associated booking, cancel it to free up the court
      if (trainingRequest.bookingId) {
        await tx.booking.update({
          where: { id: trainingRequest.bookingId },
          data: { status: "cancelled" },
        });
      }

      return updatedRequest;
    });

    // Get court name for notification
    let courtName = null;
    if (trainingRequest.courtId) {
      const court = await prisma.court.findUnique({
        where: { id: trainingRequest.courtId },
        select: { name: true },
      });
      courtName = court?.name || null;
    }

    // Emit admin notification for declined training request
    await createAdminNotification({
      type: "DECLINED",
      playerId: result.playerId,
      coachId: result.trainerId,
      trainingRequestId: result.id,
      bookingId: result.bookingId || undefined,
      sessionDate: result.date,
      sessionTime: result.time,
      courtInfo: courtName || undefined,
    });

    return NextResponse.json({
      id: result.id,
      trainerId: result.trainerId,
      playerId: result.playerId,
      clubId: result.clubId,
      courtId: result.courtId,
      bookingId: result.bookingId,
      date: result.date.toISOString().split("T")[0],
      time: result.time,
      comment: result.comment,
      status: result.status,
      message: "Training request rejected",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error rejecting training request:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
