import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { Roles } from "@/constants/roles";
import type { PlatformStatistics } from "@/types/admin";

/**
 * Root Admin Dashboard Statistics API
 * 
 * Returns platform-wide statistics including:
 * - Total number of clubs
 * - Total number of registered users
 * - Total number of active bookings (pending or paid)
 * 
 * Access: Root Admin only
 */

export async function GET(request: Request) {
  const authResult = await requireRole(request, [Roles.RootAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Fetch all statistics in parallel for better performance
    const [totalClubs, totalUsers, activeBookings] = await Promise.all([
      prisma.club.count(),
      prisma.user.count(),
      prisma.booking.count({
        where: {
          status: {
            in: ["pending", "paid"],
          },
        },
      }),
    ]);

    const statistics: PlatformStatistics = {
      totalClubs,
      totalUsers,
      activeBookings,
    };

    return NextResponse.json(statistics);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching root dashboard statistics:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
