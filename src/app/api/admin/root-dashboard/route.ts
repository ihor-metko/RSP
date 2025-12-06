import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import type { PlatformStatistics } from "@/types/admin";

/**
 * Root Admin Dashboard Statistics API
 * 
 * Returns platform-wide statistics including:
 * - Total number of organizations
 * - Total number of clubs
 * - Total number of registered users
 * - Total number of active bookings (pending or paid)
 * 
 * Access: Root Admin only
 */

export async function GET(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Fetch all statistics in parallel for better performance
    const [totalOrganizations, totalClubs, totalUsers, activeBookings] = await Promise.all([
      prisma.organization.count(),
      prisma.club.count(),
      prisma.user.count(),
      prisma.booking.count({
        where: {
          status: {
            in: ["pending", "paid", "reserved", "confirmed"],
          },
        },
      }),
    ]);

    const statistics: PlatformStatistics = {
      totalOrganizations,
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
