import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetOrganizationUsers } from "@/services/mockApiHandlers";

/**
 * GET /api/orgs/[orgId]/users
 * Returns a preview of users who have interacted with the organization's clubs.
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 * 
 * Query params:
 * - limit: number of users to return (default 10, max 100)
 * - filter: "recent" (default) | "active" | "all"
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireOrganizationAdmin(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const filter = url.searchParams.get("filter") || "recent";

    const limit = Math.min(Math.max(parseInt(limitParam || "10", 10) || 10, 1), 100);

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const users = await mockGetOrganizationUsers({
        orgId,
        limit,
      });
      return NextResponse.json(users);
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get clubs in this organization
    const clubs = await prisma.club.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });

    if (clubs.length === 0) {
      return NextResponse.json({
        items: [],
        summary: {
          totalUsers: 0,
          activeToday: 0,
        },
      });
    }

    const clubIds = clubs.map((c) => c.id);

    // Get courts in these clubs
    const courts = await prisma.court.findMany({
      where: { clubId: { in: clubIds } },
      select: { id: true },
    });

    const courtIds = courts.map((c) => c.id);

    if (courtIds.length === 0) {
      return NextResponse.json({
        items: [],
        summary: {
          totalUsers: 0,
          activeToday: 0,
        },
      });
    }

    // Build query based on filter
    let orderBy: { [key: string]: "asc" | "desc" }[] = [{ createdAt: "desc" }];
    let bookingFilter = {};

    if (filter === "recent") {
      // Most recent bookings
      orderBy = [{ createdAt: "desc" }];
    } else if (filter === "active") {
      // Users with active/future bookings
      bookingFilter = {
        status: { in: ["pending", "paid", "reserved", "confirmed"] },
        start: { gte: new Date() },
      };
    }

    // Find unique users who have bookings in this org's clubs
    const bookings = await prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        ...bookingFilter,
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        createdAt: true,
      },
      orderBy,
      take: limit * 5, // Fetch more to account for duplicates
    });

    // Deduplicate users
    const userMap = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string;
        lastLoginAt: Date | null;
        lastBookingAt: Date;
        createdAt: Date;
      }
    >();

    for (const booking of bookings) {
      if (!userMap.has(booking.user.id)) {
        userMap.set(booking.user.id, {
          id: booking.user.id,
          name: booking.user.name,
          email: booking.user.email,
          lastLoginAt: booking.user.lastLoginAt,
          lastBookingAt: booking.createdAt,
          createdAt: booking.user.createdAt,
        });
      }
    }

    const users = Array.from(userMap.values()).slice(0, limit);

    // Get summary stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUniqueUsers, todayActiveUsers] = await Promise.all([
      prisma.booking
        .groupBy({
          by: ["userId"],
          where: {
            courtId: { in: courtIds },
          },
        })
        .then((groups) => groups.length),
      prisma.booking
        .groupBy({
          by: ["userId"],
          where: {
            courtId: { in: courtIds },
            createdAt: { gte: today },
          },
        })
        .then((groups) => groups.length),
    ]);

    return NextResponse.json({
      items: users,
      summary: {
        totalUsers: totalUniqueUsers,
        activeToday: todayActiveUsers,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization users:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
