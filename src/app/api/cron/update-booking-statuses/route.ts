import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shouldMarkAsCompleted, shouldCancelUnpaidBooking } from "@/utils/bookingStatus";
import { BOOKING_STATUS, PAYMENT_STATUS, CANCEL_REASON } from "@/types/booking";
import { sendBookingCancellationEmail } from "@/services/emailService";

/**
 * Validate cron authentication
 * 
 * @param request - The incoming request
 * @returns true if authenticated, false otherwise
 */
function validateCronAuth(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // If no secret is configured, allow access (development mode)
  if (!cronSecret) {
    return true;
  }

  // Validate secret format
  if (cronSecret.length < 32) {
    console.error("[Cron] CRON_SECRET is too short. Minimum length is 32 characters.");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  return providedSecret === cronSecret;
}

/**
 * POST /api/cron/update-booking-statuses
 * 
 * Cron job endpoint to update persistent booking statuses.
 * This should be called periodically (e.g., every hour) to:
 * - Mark completed bookings as "completed" in the database
 * - Cancel unpaid bookings that have exceeded payment timeout
 * 
 * This endpoint should be protected by:
 * 1. A secret token in production (Vercel Cron, etc.)
 * 2. Or called from a trusted cron service
 * 
 * Security: Check for CRON_SECRET in headers to prevent unauthorized access
 */
export async function POST(request: Request) {
  try {
    // Verify cron authentication
    if (!validateCronAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    
    // STEP 1: Cancel unpaid bookings that exceeded payment timeout
    // Find bookings with Confirmed status and Unpaid payment where reservationExpiresAt has passed
    const unpaidBookings = await prisma.booking.findMany({
      where: {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: {
          not: null, // Only consider bookings with reservationExpiresAt set
          lt: now, // Reservation has expired
        },
      },
      select: {
        id: true,
        bookingStatus: true,
        paymentStatus: true,
        reservationExpiresAt: true,
        start: true,
        end: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        court: {
          select: {
            name: true,
            club: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Filter bookings that should be cancelled
    const bookingsToCancelIds: string[] = [];
    const cancellationNotifications: Array<{
      userEmail: string;
      userName: string | null;
      courtName: string;
      clubName: string;
      startTime: string;
      endTime: string;
    }> = [];

    for (const booking of unpaidBookings) {
      if (
        shouldCancelUnpaidBooking(
          booking.bookingStatus,
          booking.paymentStatus,
          booking.reservationExpiresAt,
          now
        )
      ) {
        bookingsToCancelIds.push(booking.id);
        cancellationNotifications.push({
          userEmail: booking.user.email,
          userName: booking.user.name,
          courtName: booking.court.name,
          clubName: booking.court.club.name,
          startTime: booking.start.toISOString(),
          endTime: booking.end.toISOString(),
        });
      }
    }

    // Cancel bookings that exceeded payment timeout
    let cancelledCount = 0;
    if (bookingsToCancelIds.length > 0) {
      const cancelResult = await prisma.booking.updateMany({
        where: {
          id: {
            in: bookingsToCancelIds,
          },
        },
        data: {
          bookingStatus: BOOKING_STATUS.CANCELLED,
          status: "cancelled", // Update legacy status as well
          cancelReason: CANCEL_REASON.PAYMENT_TIMEOUT, // Set cancel reason for activity history
        },
      });
      cancelledCount = cancelResult.count;

      // Send cancellation notifications concurrently (non-blocking)
      const emailPromises = cancellationNotifications.map((notification) =>
        sendBookingCancellationEmail({
          to: notification.userEmail,
          userName: notification.userName || undefined,
          courtName: notification.courtName,
          clubName: notification.clubName,
          startTime: notification.startTime,
          endTime: notification.endTime,
        }).catch((error) => {
          // Log but don't fail the cron job if email fails
          console.error(
            `[Cron] Failed to send cancellation email to ${notification.userEmail}:`,
            error
          );
          return { success: false, error };
        })
      );
      
      // Wait for all emails to complete (or fail)
      await Promise.allSettled(emailPromises);
    }

    // STEP 2: Mark completed bookings as "completed" in the database
    // Find all bookings that have ended but are not in a terminal state
    const bookingsToUpdate = await prisma.booking.findMany({
      where: {
        end: {
          lte: now, // Booking has ended
        },
        status: {
          notIn: ["cancelled", "no-show", "completed"], // Not already in terminal state
        },
      },
      select: {
        id: true,
        end: true,
        status: true,
      },
    });

    // Filter bookings that should be marked as completed
    const bookingIdsToComplete = bookingsToUpdate
      .filter((booking) =>
        shouldMarkAsCompleted(booking.end, booking.status, now)
      )
      .map((booking) => booking.id);

    // Update bookings to completed status
    let completedCount = 0;
    if (bookingIdsToComplete.length > 0) {
      const updateResult = await prisma.booking.updateMany({
        where: {
          id: {
            in: bookingIdsToComplete,
          },
        },
        data: {
          status: "completed",
          bookingStatus: BOOKING_STATUS.COMPLETED,
        },
      });
      completedCount = updateResult.count;
    }

    // Log results
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Cron] Booking status update completed. Cancelled ${cancelledCount} unpaid bookings, updated ${completedCount} bookings to 'completed'.`
      );
    }

    return NextResponse.json({
      success: true,
      cancelledCount,
      completedCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Cron] Error updating booking statuses:", error);
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/update-booking-statuses
 * 
 * Check endpoint status and get information about pending updates
 */
export async function GET(request: Request) {
  try {
    // Verify cron authentication
    if (!validateCronAuth(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();

    // Count bookings that need to be cancelled due to payment timeout
    const pendingCancellations = await prisma.booking.count({
      where: {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: {
          not: null, // Only consider bookings with reservationExpiresAt set
          lt: now, // Reservation has expired
        },
      },
    });

    // Count bookings that need to be updated to completed
    const pendingCompletions = await prisma.booking.count({
      where: {
        end: {
          lte: now,
        },
        status: {
          notIn: ["cancelled", "no-show", "completed"],
        },
      },
    });

    return NextResponse.json({
      status: "healthy",
      pendingCancellations,
      pendingCompletions,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Cron] Error checking status:", error);
    }
    return NextResponse.json(
      {
        status: "error",
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
