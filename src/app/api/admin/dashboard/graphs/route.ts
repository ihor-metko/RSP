import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { Prisma } from "@prisma/client";
import type { DashboardGraphsResponse, TimeRange, BookingTrendDataPoint, ActiveUsersDataPoint } from "@/types/graphs";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetDashboardGraphs } from "@/services/mockApiHandlers";

/**
 * Helper function to get date range based on time range parameter
 */
function getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  if (timeRange === "week") {
    startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
  } else {
    startDate.setDate(startDate.getDate() - 29); // Last 30 days including today
  }
  
  return { startDate, endDate };
}

/**
 * Helper function to generate date labels
 */
function generateDateLabels(startDate: Date, endDate: Date): string[] {
  const labels: string[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    labels.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return labels;
}

/**
 * Helper function to format date label for display
 */
function formatDateLabel(dateStr: string, timeRange: TimeRange): string {
  // Parse date string safely (dateStr is in YYYY-MM-DD format)
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return dateStr; // Return as-is if format is invalid
  }
  
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateStr; // Return as-is if any part is not a number
  }
  
  const date = new Date(year, month - 1, day);
  
  if (timeRange === "week") {
    // Show day name for week view (Mon, Tue, etc.)
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    // Show month and day for month view (Jan 15, etc.)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * GET /api/admin/dashboard/graphs
 * 
 * Returns graph data appropriate for the current user's admin role.
 * - Root Admin: Platform-wide data
 * - Organization Admin: Data for all managed organizations
 * - Club Admin: Data for all managed clubs
 * 
 * Query parameters:
 * - timeRange: "week" or "month" (default: "week")
 * 
 * Access: Any admin role (root, organization admin, or club admin)
 */
export async function GET(request: Request): Promise<NextResponse<DashboardGraphsResponse | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeRangeParam = searchParams.get("timeRange");
    const timeRange: TimeRange = timeRangeParam === "month" ? "month" : "week";

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockResult = await mockGetDashboardGraphs({
        adminType,
        managedIds,
        timeRange,
      });
      return NextResponse.json(mockResult);
    }

    const { startDate, endDate } = getDateRange(timeRange);
    const dateLabels = generateDateLabels(startDate, endDate);

    // Initialize data structures
    const bookingCountsByDate = new Map<string, number>();
    const activeUsersByDate = new Map<string, Set<string>>(); // date -> Set of user IDs

    // Initialize all dates with 0/empty sets
    dateLabels.forEach(date => {
      bookingCountsByDate.set(date, 0);
      activeUsersByDate.set(date, new Set<string>());
    });

    // Build where clause based on admin type
    const bookingsWhere: Prisma.BookingWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["pending", "paid", "reserved", "confirmed"],
      },
    };

    if (adminType === "organization_admin") {
      // Filter by organization
      bookingsWhere.court = {
        club: {
          organizationId: {
            in: managedIds,
          },
        },
      };


    } else if (adminType === "club_admin") {
      // Filter by club
      bookingsWhere.court = {
        clubId: {
          in: managedIds,
        },
      };


    }

    // Fetch bookings for the date range with user information
    const bookings = await prisma.booking.findMany({
      where: bookingsWhere,
      select: {
        createdAt: true,
        userId: true,
      },
    });

    // Count bookings by date and track unique users per day
    bookings.forEach(booking => {
      const dateStr = booking.createdAt.toISOString().split('T')[0];
      
      // Count bookings
      const currentCount = bookingCountsByDate.get(dateStr) || 0;
      bookingCountsByDate.set(dateStr, currentCount + 1);
      
      // Track unique users who made bookings
      const usersOnDate = activeUsersByDate.get(dateStr);
      if (usersOnDate) {
        usersOnDate.add(booking.userId);
      }
    });

    // Build response data
    const bookingTrends: BookingTrendDataPoint[] = dateLabels.map(date => ({
      date,
      bookings: bookingCountsByDate.get(date) || 0,
      label: formatDateLabel(date, timeRange),
    }));

    const activeUsersData: ActiveUsersDataPoint[] = dateLabels.map(date => ({
      date,
      users: activeUsersByDate.get(date)?.size || 0,
      label: formatDateLabel(date, timeRange),
    }));

    const response: DashboardGraphsResponse = {
      bookingTrends,
      activeUsers: activeUsersData,
      timeRange,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching dashboard graphs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
