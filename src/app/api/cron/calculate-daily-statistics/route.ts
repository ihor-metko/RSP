import { NextResponse } from "next/server";
import { calculateDailyStatisticsForAllClubs } from "@/services/statisticsService";

// Constants
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

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
 * POST /api/cron/calculate-daily-statistics
 * 
 * Cron job endpoint to calculate daily statistics for all clubs.
 * This should be called once per day (e.g., at midnight) to:
 * - Calculate occupancy statistics for the previous day
 * - Store results in ClubDailyStatistics table
 * 
 * Query params:
 * - date: Optional date to calculate statistics for (ISO format, defaults to yesterday)
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

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Parse date or use default (yesterday)
    let date: Date;
    if (dateParam) {
      date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO format (YYYY-MM-DD)" },
          { status: 400 }
        );
      }
    } else {
      // Default to yesterday
      date = new Date(Date.now() - MILLISECONDS_PER_DAY);
    }

    // Calculate statistics for all clubs
    const results = await calculateDailyStatisticsForAllClubs(date);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Log results
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Cron] Daily statistics calculation completed. Success: ${successCount}, Failed: ${failureCount}`
      );
    }

    return NextResponse.json({
      success: true,
      date: date.toISOString(),
      totalClubs: results.length,
      successCount,
      failureCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Cron] Error calculating daily statistics:", error);
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/calculate-daily-statistics
 * 
 * Check endpoint status
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

    return NextResponse.json({
      status: "healthy",
      endpoint: "/api/cron/calculate-daily-statistics",
      description: "Calculates daily statistics for all clubs",
      timestamp: new Date().toISOString(),
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
