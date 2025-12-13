import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shouldMarkAsCompleted } from "@/utils/bookingStatus";

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
    let updatedCount = 0;
    if (bookingIdsToComplete.length > 0) {
      const updateResult = await prisma.booking.updateMany({
        where: {
          id: {
            in: bookingIdsToComplete,
          },
        },
        data: {
          status: "completed",
        },
      });
      updatedCount = updateResult.count;
    }

    // Log results
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Cron] Booking status update completed. Updated ${updatedCount} bookings to 'completed'.`
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
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

    // Count bookings that need to be updated
    const pendingUpdates = await prisma.booking.count({
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
      pendingUpdates,
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
