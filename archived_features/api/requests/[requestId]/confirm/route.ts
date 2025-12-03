import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { getCourtAvailabilitySuggestions } from "@/lib/courtAvailability";
import { createAdminNotification } from "@/lib/adminNotifications";

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

    // Check for double-booking conflicts (preliminary check before transaction)
    const conflictingRequest = await prisma.trainingRequest.findFirst({
      where: {
        trainerId: trainingRequest.trainerId,
        date: trainingRequest.date,
        time: trainingRequest.time,
        status: "confirmed",
        id: { not: requestId },
      },
    });

    if (conflictingRequest) {
      return NextResponse.json(
        { error: "Cannot confirm: trainer already has a confirmed session at this time" },
        { status: 409 }
      );
    }

    // Update training request and booking in a transaction with conflict checks
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Re-check for conflicting training requests inside transaction to prevent race conditions
        const txConflictingRequest = await tx.trainingRequest.findFirst({
          where: {
            trainerId: trainingRequest.trainerId,
            date: trainingRequest.date,
            time: trainingRequest.time,
            status: "confirmed",
            id: { not: requestId },
          },
        });

        if (txConflictingRequest) {
          throw new Error("TRAINER_CONFLICT");
        }

        // If there's a booking associated, verify the court is still available
        if (trainingRequest.bookingId) {
          const booking = await tx.booking.findUnique({
            where: { id: trainingRequest.bookingId },
          });

          if (booking) {
            // Check if there are any other confirmed bookings for the same court/time
            const conflictingBooking = await tx.booking.findFirst({
              where: {
                courtId: booking.courtId,
                start: { lt: booking.end },
                end: { gt: booking.start },
                status: { in: ["reserved", "paid"] },
                id: { not: booking.id },
              },
            });

            if (conflictingBooking) {
              throw new Error("COURT_CONFLICT");
            }
          }
        }

        // Update the training request status to confirmed
        const updatedRequest = await tx.trainingRequest.update({
          where: { id: requestId },
          data: { status: "confirmed" },
        });

        // If there's an associated booking, update it to reserved
        if (trainingRequest.bookingId) {
          await tx.booking.update({
            where: { id: trainingRequest.bookingId },
            data: { status: "reserved" },
          });
        }

        return updatedRequest;
      });

      // Get court name for response
      let courtName = null;
      if (trainingRequest.courtId) {
        const court = await prisma.court.findUnique({
          where: { id: trainingRequest.courtId },
          select: { name: true },
        });
        courtName = court?.name || null;
      }

      // Emit admin notification for confirmed training request
      await createAdminNotification({
        type: "ACCEPTED",
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
        courtName,
        bookingId: result.bookingId,
        date: result.date.toISOString().split("T")[0],
        time: result.time,
        comment: result.comment,
        status: result.status,
        message: "Training request confirmed successfully",
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "TRAINER_CONFLICT") {
          // Get alternative suggestions
          const dateStr = trainingRequest.date.toISOString().split("T")[0];
          const suggestions = await getCourtAvailabilitySuggestions(
            trainingRequest.clubId,
            trainingRequest.trainerId,
            dateStr,
            trainingRequest.time
          );
          return NextResponse.json(
            { 
              error: "Cannot confirm: trainer already has a confirmed session at this time",
              code: "TRAINER_CONFLICT",
              suggestions,
            },
            { status: 409 }
          );
        }
        if (error.message === "COURT_CONFLICT") {
          // Get alternative suggestions
          const dateStr = trainingRequest.date.toISOString().split("T")[0];
          const suggestions = await getCourtAvailabilitySuggestions(
            trainingRequest.clubId,
            trainingRequest.trainerId,
            dateStr,
            trainingRequest.time
          );
          return NextResponse.json(
            { 
              error: "Cannot confirm: the court is already booked by another player",
              code: "COURT_CONFLICT",
              suggestions,
            },
            { status: 409 }
          );
        }
      }
      throw error;
    }
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
