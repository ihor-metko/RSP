import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

/**
 * Trend data point for user registrations
 */
export interface TrendDataPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  count: number;
}

/**
 * Response type for registered users endpoint
 */
export interface RegisteredUsersResponse {
  totalUsers: number;
  trend: TrendDataPoint[];
}

/**
 * GET /api/admin/dashboard/registered-users
 * 
 * Returns the count of real, active platform users (players) excluding:
 * - System/admin accounts (users with isRoot = true)
 * - Organization admins (users with ORGANIZATION_ADMIN role)
 * - Club admins (users with CLUB_ADMIN role)
 * 
 * Optionally includes trend data for the last 30 days.
 * 
 * Access: Root Admin only
 */
export async function GET(
  request: Request
): Promise<NextResponse<RegisteredUsersResponse | { error: string }>> {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  try {
    // Get admin user IDs to exclude
    const [rootAdmins, orgAdmins, clubAdmins] = await Promise.all([
      // Root admins
      prisma.user.findMany({
        where: { isRoot: true },
        select: { id: true },
      }),
      // Organization admins
      prisma.membership.findMany({
        where: { role: "ORGANIZATION_ADMIN" },
        select: { userId: true },
        distinct: ["userId"],
      }),
      // Club admins
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
          notIn: excludedIds.length > 0 ? excludedIds : undefined,
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
          notIn: excludedIds.length > 0 ? excludedIds : undefined,
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
    const trend: TrendDataPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = recentUsers.filter((user) => {
        const userDate = new Date(user.createdAt);
        return userDate >= date && userDate < nextDate;
      }).length;

      trend.push({
        date: date.toISOString().split("T")[0], // Format as YYYY-MM-DD
        count,
      });
    }

    const response: RegisteredUsersResponse = {
      totalUsers,
      trend,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching registered users data:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
