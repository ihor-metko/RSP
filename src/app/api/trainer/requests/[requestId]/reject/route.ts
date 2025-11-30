import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

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

    // Update the training request status to rejected
    const updatedRequest = await prisma.trainingRequest.update({
      where: { id: requestId },
      data: { status: "rejected" },
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
