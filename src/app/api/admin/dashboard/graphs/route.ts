import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import type { DashboardGraphsResponse, TimeRange, BookingTrendDataPoint, ActiveUsersDataPoint } from "@/types/graphs";

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
  const date = new Date(dateStr + 'T00:00:00');
  
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

    const { startDate, endDate } = getDateRange(timeRange);
    const dateLabels = generateDateLabels(startDate, endDate);

    // Initialize data structures
    const bookingCountsByDate = new Map<string, number>();
    const activeUserCountsByDate = new Map<string, number>();

    // Initialize all dates with 0
    dateLabels.forEach(date => {
      bookingCountsByDate.set(date, 0);
      activeUserCountsByDate.set(date, 0);
    });

    // Build where clause based on admin type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingsWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usersWhere: any = {
      lastLoginAt: {
        gte: startDate,
        lte: endDate,
      },
      isRoot: false, // Exclude root admins from active users count
      blocked: false, // Exclude blocked users
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

      // For users, we need to check if they have bookings in the organization's clubs
      // or if they are members of the organization
      usersWhere.OR = [
        {
          bookings: {
            some: {
              court: {
                club: {
                  organizationId: {
                    in: managedIds,
                  },
                },
              },
            },
          },
        },
        {
          memberships: {
            some: {
              organizationId: {
                in: managedIds,
              },
            },
          },
        },
      ];
    } else if (adminType === "club_admin") {
      // Filter by club
      bookingsWhere.court = {
        clubId: {
          in: managedIds,
        },
      };

      // For users, check if they have bookings in the clubs
      usersWhere.OR = [
        {
          bookings: {
            some: {
              court: {
                clubId: {
                  in: managedIds,
                },
              },
            },
          },
        },
        {
          clubMemberships: {
            some: {
              clubId: {
                in: managedIds,
              },
            },
          },
        },
      ];
    }

    // Fetch bookings for the date range
    const bookings = await prisma.booking.findMany({
      where: bookingsWhere,
      select: {
        createdAt: true,
      },
    });

    // Count bookings by date
    bookings.forEach(booking => {
      const dateStr = booking.createdAt.toISOString().split('T')[0];
      if (bookingCountsByDate.has(dateStr)) {
        bookingCountsByDate.set(dateStr, bookingCountsByDate.get(dateStr)! + 1);
      }
    });

    // Fetch active users (users who logged in during the period)
    const activeUsers = await prisma.user.findMany({
      where: usersWhere,
      select: {
        lastLoginAt: true,
      },
    });

    // Count active users by date
    activeUsers.forEach(user => {
      if (user.lastLoginAt) {
        const dateStr = user.lastLoginAt.toISOString().split('T')[0];
        if (activeUserCountsByDate.has(dateStr)) {
          activeUserCountsByDate.set(dateStr, activeUserCountsByDate.get(dateStr)! + 1);
        }
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
      users: activeUserCountsByDate.get(date) || 0,
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
