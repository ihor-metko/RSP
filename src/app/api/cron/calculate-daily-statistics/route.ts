import { NextResponse } from "next/server";
import { calculateDailyStatisticsForAllClubs } from "@/services/statisticsService";
import { prisma } from "@/lib/prisma";

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
 * This now acts as a FALLBACK mechanism that only recalculates:
 * - Missing dates (no statistics record exists)
 * - Historical data for initial population
 * - Verification and correction of existing data
 * 
 * With reactive statistics, most updates happen immediately on booking changes.
 * This cron job ensures no gaps exist in historical data.
 * 
 * Query params:
 * - date: Optional date to calculate statistics for (ISO format, defaults to yesterday)
 * - mode: 'fallback' (default) or 'force'
 *   - fallback: Only recalculate if statistics don't exist or are older than 1 day
 *   - force: Recalculate all statistics regardless
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
    const mode = searchParams.get("mode") || "fallback";

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

    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Get all active clubs
    const clubs = await prisma.club.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
      },
    });

    const results = [];
    let skippedCount = 0;

    for (const club of clubs) {
      try {
        // In fallback mode, check if statistics already exist and are recent
        if (mode === "fallback") {
          const existingStats = await prisma.clubDailyStatistics.findUnique({
            where: {
              clubId_date: {
                clubId: club.id,
                date: normalizedDate,
              },
            },
          });

          // Skip if statistics exist and were updated within the last day
          if (existingStats) {
            const oneDay = 24 * 60 * 60 * 1000;
            const statAge = Date.now() - existingStats.updatedAt.getTime();
            
            if (statAge < oneDay) {
              skippedCount++;
              results.push({
                clubId: club.id,
                clubName: club.name,
                success: true,
                skipped: true,
                reason: "Statistics already up-to-date",
              });
              continue;
            }
          }
        }

        // Calculate statistics (either missing or in force mode)
        const { calculateAndStoreDailyStatistics } = await import("@/services/statisticsService");
        const stats = await calculateAndStoreDailyStatistics(club.id, normalizedDate);
        
        results.push({
          clubId: club.id,
          clubName: club.name,
          success: true,
          skipped: false,
          statistics: stats,
        });
      } catch (error) {
        console.error(
          `Failed to calculate statistics for club ${club.id}:`,
          error
        );
        results.push({
          clubId: club.id,
          clubName: club.name,
          success: false,
          skipped: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success && !r.skipped).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Log results
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Cron] Daily statistics calculation completed. ` +
        `Success: ${successCount}, Skipped: ${skippedCount}, Failed: ${failureCount}`
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      date: normalizedDate.toISOString(),
      totalClubs: results.length,
      successCount,
      skippedCount,
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
 * Check endpoint status and configuration
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
      description: "Calculates daily statistics for all clubs (fallback mode)",
      mode: "fallback - only fills missing or outdated statistics",
      note: "Primary statistics updates happen reactively on booking changes",
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
