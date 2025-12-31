import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, AdminType } from "@/lib/requireRole";
import type { PlatformStatistics } from "@/types/admin";

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
}

/**
 * GET /api/admin/unified-dashboard
 *
 * Returns aggregated dashboard statistics appropriate for the current user's admin role.
 * - Root Admin: Platform-wide statistics
 * - Organization Admin: Aggregated stats for all managed organizations
 * - Club Owner: Aggregated stats for all owned clubs
 * - Club Admin: Aggregated stats for all managed clubs
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
      const [clubsCount, courtsCount, bookingsToday, activeBookings, pastBookings] =
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
      const [courtsCount, bookingsToday, activeBookings, pastBookings] =
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
