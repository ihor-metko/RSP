import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, AdminType } from "@/lib/requireRole";
import type { PlatformStatistics } from "@/types/admin";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetUnifiedDashboard } from "@/services/mockApiHandlers";

/**
 * Organization info for unified dashboard
 */
export interface UnifiedDashboardOrg {
  id: string;
  name: string;
  slug: string;
  clubsCount: number;
  courtsCount: number;
  bookingsToday: number;
  clubAdminsCount: number;
  activeBookings: number;
  pastBookings: number;
}

/**
 * Club info for unified dashboard
 */
export interface UnifiedDashboardClub {
  id: string;
  name: string;
  slug: string | null;
  organizationId: string | null;
  organizationName: string | null;
  courtsCount: number;
  bookingsToday: number;
  activeBookings: number;
  pastBookings: number;
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
  // Organization admin data
  organizations?: UnifiedDashboardOrg[];
  // Club admin data
  clubs?: UnifiedDashboardClub[];
}

/**
 * GET /api/admin/unified-dashboard
 *
 * Returns dashboard data appropriate for the current user's admin role.
 * - Root Admin: Platform-wide statistics
 * - Organization Admin: Metrics for all managed organizations
 * - Club Admin: Metrics for all managed clubs
 *
 * Access: Any admin role (root, organization admin, or club admin)
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
    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockResult = await mockGetUnifiedDashboard({
        adminType,
        managedIds,
      });
      return NextResponse.json(mockResult);
    }

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
        prisma.user.count(),
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
      // Fetch metrics for each managed organization
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const organizations = await Promise.all(
        managedIds.map(async (orgId) => {
          const [
            org,
            clubsCount,
            courtsCount,
            bookingsToday,
            clubAdminsCount,
            activeBookings,
            pastBookings,
          ] = await Promise.all([
            prisma.organization.findUnique({
              where: { id: orgId },
              select: { id: true, name: true, slug: true },
            }),
            prisma.club.count({ where: { organizationId: orgId } }),
            prisma.court.count({ where: { club: { organizationId: orgId } } }),
            prisma.booking.count({
              where: {
                court: { club: { organizationId: orgId } },
                start: { gte: today, lt: tomorrow },
              },
            }),
            prisma.clubMembership.count({
              where: {
                role: "CLUB_ADMIN",
                club: { organizationId: orgId },
              },
            }),
            // Active/Upcoming bookings: today and future
            prisma.booking.count({
              where: {
                court: { club: { organizationId: orgId } },
                start: { gte: today },
                status: { in: ["pending", "paid", "reserved", "confirmed"] },
              },
            }),
            // Past bookings: before today (completed bookings only)
            prisma.booking.count({
              where: {
                court: { club: { organizationId: orgId } },
                start: { lt: today },
                status: { in: ["pending", "paid", "reserved", "confirmed"] },
              },
            }),
          ]);

          if (!org) return null;

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            clubsCount,
            courtsCount,
            bookingsToday,
            clubAdminsCount,
            activeBookings,
            pastBookings,
          };
        })
      );

      const response: UnifiedDashboardResponse = {
        adminType,
        isRoot: false,
        organizations: organizations.filter((org): org is UnifiedDashboardOrg => org !== null),
      };

      return NextResponse.json(response);
    }

    if (adminType === "club_admin") {
      // Fetch metrics for each managed club
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const clubs = await Promise.all(
        managedIds.map(async (clubId) => {
          const [club, courtsCount, bookingsToday, activeBookings, pastBookings] =
            await Promise.all([
              prisma.club.findUnique({
                where: { id: clubId },
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  organizationId: true,
                  organization: {
                    select: { name: true },
                  },
                },
              }),
              prisma.court.count({ where: { clubId } }),
              prisma.booking.count({
                where: {
                  court: { clubId },
                  start: { gte: today, lt: tomorrow },
                },
              }),
              // Active/Upcoming bookings: today and future
              prisma.booking.count({
                where: {
                  court: { clubId },
                  start: { gte: today },
                  status: { in: ["pending", "paid", "reserved", "confirmed"] },
                },
              }),
              // Past bookings: before today (completed bookings only)
              prisma.booking.count({
                where: {
                  court: { clubId },
                  start: { lt: today },
                  status: { in: ["pending", "paid", "reserved", "confirmed"] },
                },
              }),
            ]);

          if (!club) return null;

          return {
            id: club.id,
            name: club.name,
            slug: club.slug,
            organizationId: club.organizationId,
            organizationName: club.organization?.name ?? null,
            courtsCount,
            bookingsToday,
            activeBookings,
            pastBookings,
          };
        })
      );

      const response: UnifiedDashboardResponse = {
        adminType,
        isRoot: false,
        clubs: clubs.filter((club): club is UnifiedDashboardClub => club !== null),
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
