import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/**
 * PUT /api/trainer/requests/[requestId]/confirm
 * Confirm a training request
 * Only the assigned trainer or admin can confirm
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const authResult = await requireRole(request, ["coach", "admin"]);
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

    // Authorization: only assigned trainer or admin can confirm
    if (authResult.userRole === "coach") {
      if (!coach || trainingRequest.trainerId !== coach.id) {
        return NextResponse.json(
          { error: "You can only confirm your own training requests" },
          { status: 403 }
        );
      }
    }

    // Validate the request is pending
    if (trainingRequest.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot confirm a request with status: ${trainingRequest.status}` },
        { status: 400 }
      );
    }

    // Check for double-booking conflicts
    // Find any confirmed training at the same time for this trainer
    const conflictingRequest = await prisma.trainingRequest.findFirst({
      where: {
        trainerId: trainingRequest.trainerId,
        date: trainingRequest.date,
        time: trainingRequest.time,
        status: "confirmed",
        id: { not: requestId }, // Exclude this request
      },
    });

    if (conflictingRequest) {
      return NextResponse.json(
        { error: "Cannot confirm: trainer already has a confirmed session at this time" },
        { status: 409 }
      );
    }

    // Update the training request status to confirmed
    const updatedRequest = await prisma.trainingRequest.update({
      where: { id: requestId },
      data: { status: "confirmed" },
    });

    return NextResponse.json({
      id: updatedRequest.id,
      trainerId: updatedRequest.trainerId,
      playerId: updatedRequest.playerId,
      clubId: updatedRequest.clubId,
      date: updatedRequest.date.toISOString().split("T")[0],
      time: updatedRequest.time,
      comment: updatedRequest.comment,
      status: updatedRequest.status,
      message: "Training request confirmed successfully",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error confirming training request:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
