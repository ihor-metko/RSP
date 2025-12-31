import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, AdminType } from "@/lib/requireRole";
import type { PlatformStatistics } from "@/types/admin";
import type { DashboardGraphsResponse, BookingTrendDataPoint, ActiveUsersDataPoint } from "@/types/graphs";
import { Prisma } from "@prisma/client";

/**
 * Trend data point for user registrations
 */
export interface TrendDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
}

/**
 * Registered users data
 */
export interface RegisteredUsersData {
  totalUsers: number;
  trend: TrendDataPoint[];
}

/**
 * Aggregated dashboard statistics
 */
export interface DashboardStats {
  activeBookings: number;
  bookingsToday: number;
  pastBookings: number;
  clubsCount?: number; // Only for organization admins
  courtsCount?: number; // For organization admins and club admins/owners
}

/**
 * Unified dashboard response type
 */
export interface UnifiedDashboardResponse {
  adminType: AdminType;
  isRoot: boolean;
  // Root admin data
  platformStats?: PlatformStatistics & {
    activeBookingsCount: number;
    pastBookingsCount: number;
  };
  // Organization admin and club admin data - aggregated stats
  stats?: DashboardStats;
  // Registered users data (Root Admin only)
  registeredUsers?: RegisteredUsersData;
  // Dashboard graphs data (all admin types)
  graphsData?: DashboardGraphsResponse;
}

/**
 * Helper function to get date range for graphs (default: week)
 */
function getDateRange(): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 6); // Last 7 days including today

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
 * Helper function to format date label for display (week view)
 */
function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    return dateStr;
  }

  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return dateStr;
  }

  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/**
 * Fetch registered users data (Root Admin only)
 */
async function fetchRegisteredUsersData(): Promise<RegisteredUsersData> {
  // Get admin user IDs to exclude
  const [rootAdmins, orgAdmins, clubAdmins] = await Promise.all([
    prisma.user.findMany({
      where: { isRoot: true },
      select: { id: true },
    }),
    prisma.membership.findMany({
      where: { role: "ORGANIZATION_ADMIN" },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.clubMembership.findMany({
      where: { role: "CLUB_ADMIN" },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  // Combine all admin IDs into a single set to exclude
  const adminIds = new Set<string>();
  rootAdmins.forEach((user) => adminIds.add(user.id));
  orgAdmins.forEach((membership) => adminIds.add(membership.userId));
  clubAdmins.forEach((membership) => adminIds.add(membership.userId));

  const excludedIds = Array.from(adminIds);

  // Count total real users (excluding admins)
  const totalUsers = await prisma.user.count({
    where: {
      id: {
        notIn: excludedIds,
      },
    },
  });

  // Calculate trend data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Get all users created in the last 30 days (excluding admins)
  const recentUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
      id: {
        notIn: excludedIds,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Build trend array for the last 30 days
  const usersByDate = new Map<string, number>();
  recentUsers.forEach((user) => {
    const dateStr = new Date(user.createdAt).toISOString().split("T")[0];
    usersByDate.set(dateStr, (usersByDate.get(dateStr) || 0) + 1);
  });

  const trend: TrendDataPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    trend.push({
      date: dateStr,
      count: usersByDate.get(dateStr) || 0,
    });
  }

  return {
    totalUsers,
    trend,
  };
}

/**
 * Fetch dashboard graphs data for all admin types
 */
async function fetchGraphsData(
  adminType: AdminType,
  managedIds: string[]
): Promise<DashboardGraphsResponse> {
  const { startDate, endDate } = getDateRange();
  const dateLabels = generateDateLabels(startDate, endDate);

  // Initialize data structures
  const bookingCountsByDate = new Map<string, number>();
  const activeUsersByDate = new Map<string, Set<string>>();

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
    bookingsWhere.court = {
      club: {
        organizationId: {
          in: managedIds,
        },
      },
    };
  } else if (adminType === "club_owner" || adminType === "club_admin") {
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

    const currentCount = bookingCountsByDate.get(dateStr) || 0;
    bookingCountsByDate.set(dateStr, currentCount + 1);

    const usersOnDate = activeUsersByDate.get(dateStr);
    if (usersOnDate) {
      usersOnDate.add(booking.userId);
    }
  });

  // Build response data
  const bookingTrends: BookingTrendDataPoint[] = dateLabels.map(date => ({
    date,
    bookings: bookingCountsByDate.get(date) || 0,
    label: formatDateLabel(date),
  }));

  const activeUsersData: ActiveUsersDataPoint[] = dateLabels.map(date => ({
    date,
    users: activeUsersByDate.get(date)?.size || 0,
    label: formatDateLabel(date),
  }));

  return {
    bookingTrends,
    activeUsers: activeUsersData,
    timeRange: "week",
  };
}

/**
 * GET /api/admin/dashboard
 *
 * Returns aggregated dashboard statistics appropriate for the current user's admin role.
 * - Root Admin: Platform-wide statistics + registered users + graphs
 * - Organization Admin: Aggregated stats for all managed organizations + graphs
 * - Club Owner: Aggregated stats for all owned clubs + graphs
 * - Club Admin: Aggregated stats for all managed clubs + graphs
 *
 * This endpoint consolidates multiple API calls into one to reduce redundant requests.
 *
 * Access: Any admin role (root, organization admin, club owner, or club admin)
 */
export async function GET(
  request: Request
): Promise<NextResponse<UnifiedDashboardResponse | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;

  try {
    if (adminType === "root_admin") {
      // Fetch platform-wide statistics for root admin
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalOrganizations,
        totalClubs,
        activeBookingsCount,
        pastBookingsCount,
        registeredUsers,
        graphsData,
      ] = await Promise.all([
        prisma.organization.count(),
        prisma.club.count(),
        // Active/Upcoming bookings: today and future
        prisma.booking.count({
          where: {
            start: {
              gte: today,
            },
            status: {
              in: ["pending", "paid", "reserved", "confirmed"],
            },
          },
        }),
        // Past bookings: before today (completed bookings only)
        prisma.booking.count({
          where: {
            start: {
              lt: today,
            },
            status: {
              in: ["pending", "paid", "reserved", "confirmed"],
            },
          },
        }),
        // Fetch registered users data
        fetchRegisteredUsersData(),
        // Fetch graphs data
        fetchGraphsData(adminType, managedIds),
      ]);

      const response: UnifiedDashboardResponse = {
        adminType,
        isRoot: true,
        platformStats: {
          totalOrganizations,
          totalClubs,
          activeBookingsCount,
          pastBookingsCount,
        },
        registeredUsers,
        graphsData,
      };

      return NextResponse.json(response);
    }

    if (adminType === "organization_admin") {
      // Fetch aggregated metrics for all managed organizations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Aggregate stats across all managed organizations
      const [clubsCount, courtsCount, bookingsToday, activeBookings, pastBookings, graphsData] =
        await Promise.all([
          // Total clubs across all managed organizations
          prisma.club.count({
            where: { organizationId: { in: managedIds } },
          }),
          // Total courts across all managed organizations
          prisma.court.count({
            where: { club: { organizationId: { in: managedIds } } },
          }),
          // Bookings today across all managed organizations
          prisma.booking.count({
            where: {
              court: { club: { organizationId: { in: managedIds } } },
              start: { gte: today, lt: tomorrow },
            },
          }),
          // Active/Upcoming bookings: today and future
          prisma.booking.count({
            where: {
              court: { club: { organizationId: { in: managedIds } } },
              start: { gte: today },
              status: { in: ["pending", "paid", "reserved", "confirmed"] },
            },
          }),
          // Past bookings: before today
          prisma.booking.count({
            where: {
              court: { club: { organizationId: { in: managedIds } } },
              start: { lt: today },
              status: { in: ["pending", "paid", "reserved", "confirmed"] },
            },
          }),
          // Fetch graphs data
          fetchGraphsData(adminType, managedIds),
        ]);

      const response: UnifiedDashboardResponse = {
        adminType,
        isRoot: false,
        stats: {
          clubsCount,
          courtsCount,
          bookingsToday,
          activeBookings,
          pastBookings,
        },
        graphsData,
      };

      return NextResponse.json(response);
    }

    if (adminType === "club_owner" || adminType === "club_admin") {
      // Fetch aggregated metrics for all owned/managed clubs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Aggregate stats across all managed clubs
      const [courtsCount, bookingsToday, activeBookings, pastBookings, graphsData] =
        await Promise.all([
          // Total courts across all managed clubs
          prisma.court.count({
            where: { clubId: { in: managedIds } },
          }),
          // Bookings today across all managed clubs
          prisma.booking.count({
            where: {
              court: { clubId: { in: managedIds } },
              start: { gte: today, lt: tomorrow },
            },
          }),
          // Active/Upcoming bookings: today and future
          prisma.booking.count({
            where: {
              court: { clubId: { in: managedIds } },
              start: { gte: today },
              status: { in: ["pending", "paid", "reserved", "confirmed"] },
            },
          }),
          // Past bookings: before today
          prisma.booking.count({
            where: {
              court: { clubId: { in: managedIds } },
              start: { lt: today },
              status: { in: ["pending", "paid", "reserved", "confirmed"] },
            },
          }),
          // Fetch graphs data
          fetchGraphsData(adminType, managedIds),
        ]);

      const response: UnifiedDashboardResponse = {
        adminType,
        isRoot: false,
        stats: {
          courtsCount,
          bookingsToday,
          activeBookings,
          pastBookings,
        },
        graphsData,
      };

      return NextResponse.json(response);
    }

    // Should not reach here
    return NextResponse.json(
      { error: "Unknown admin type" },
      { status: 500 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching unified dashboard:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
