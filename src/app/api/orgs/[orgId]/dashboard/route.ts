import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";

/**
 * Dashboard metrics response type
 */
export interface OrgDashboardMetrics {
  clubsCount: number;
  courtsCount: number;
  bookingsToday: number;
  clubAdminsCount: number;
}

/**
 * Organization info for dashboard
 */
export interface OrgDashboardOrg {
  id: string;
  name: string;
  slug: string;
}

/**
 * Dashboard response type
 */
export interface OrgDashboardResponse {
  metrics: OrgDashboardMetrics;
  org: OrgDashboardOrg;
}

/**
 * GET /api/orgs/:orgId/dashboard
 * 
 * Returns aggregated dashboard data for an organization.
 * Protected with requireRole - only ORGANIZATION_ADMIN or root can access.
 * 
 * Response:
 * {
 *   metrics: {
 *     clubsCount: number;
 *     courtsCount: number;
 *     bookingsToday: number;
 *     clubAdminsCount: number;
 *   },
 *   org: { id, name, slug }
 * }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  // Require ORGANIZATION_ADMIN or root admin
  const authResult = await requireOrganizationAdmin(orgId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Fetch organization info
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get today's date range for bookings query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run all metric queries in parallel for efficiency
    const [clubsCount, courtsCount, bookingsToday, clubAdminsCount] = await Promise.all([
      // Count clubs in this organization
      prisma.club.count({
        where: { organizationId: orgId },
      }),
      // Count courts across all clubs in this organization
      prisma.court.count({
        where: {
          club: { organizationId: orgId },
        },
      }),
      // Count bookings for today across all clubs in this organization
      prisma.booking.count({
        where: {
          court: {
            club: { organizationId: orgId },
          },
          start: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      // Count club admins (users with CLUB_ADMIN role in clubs of this organization)
      prisma.clubMembership.count({
        where: {
          role: "CLUB_ADMIN",
          club: { organizationId: orgId },
        },
      }),
    ]);

    const response: OrgDashboardResponse = {
      metrics: {
        clubsCount,
        courtsCount,
        bookingsToday,
        clubAdminsCount,
      },
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization dashboard:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
