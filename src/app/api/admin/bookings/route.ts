import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import type { Prisma } from "@prisma/client";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetBookings } from "@/services/mockApiHandlers";

/**
 * Booking status type
 */
export type BookingStatus = "pending" | "paid" | "cancelled" | "reserved";

/**
 * Booking response type for the admin API
 */
export interface AdminBookingResponse {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  courtId: string;
  courtName: string;
  clubId: string;
  clubName: string;
  organizationId: string | null;
  organizationName: string | null;
  start: string;
  end: string;
  status: string;
  price: number;
  coachId: string | null;
  coachName: string | null;
  createdAt: string;
}

/**
 * Paginated response type
 */
export interface AdminBookingsListResponse {
  bookings: AdminBookingResponse[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * GET /api/admin/bookings
 *
 * Returns bookings based on the current user's admin role.
 * - Root Admin: All bookings across all organizations and clubs
 * - Organization Admin: All bookings for their organization only
 * - Club Admin: All bookings for their assigned club only
 *
 * Query parameters:
 * - orgId: Filter by organization ID (Root/OrgAdmin only)
 * - clubId: Filter by club ID
 * - dateFrom: Filter bookings starting from this date (ISO 8601)
 * - dateTo: Filter bookings up to this date (ISO 8601)
 * - status: Filter by booking status
 * - userId: Filter by user ID
 * - page: Page number (default: 1)
 * - perPage: Results per page (default: 20, max: 100)
 */
export async function GET(
  request: Request
): Promise<NextResponse<AdminBookingsListResponse | { error: string }>> {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response as NextResponse<{ error: string }>;
  }

  const { adminType, managedIds } = authResult;
  const url = new URL(request.url);

  // Parse query parameters
  const orgId = url.searchParams.get("orgId");
  const clubId = url.searchParams.get("clubId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const status = url.searchParams.get("status");
  const userId = url.searchParams.get("userId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("perPage") || "20", 10)));

  try {
    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockResult = await mockGetBookings({
        adminType,
        managedIds,
        filters: {
          orgId,
          clubId,
          dateFrom,
          dateTo,
          status,
          userId,
          page,
          perPage,
        },
      });
      return NextResponse.json(mockResult);
    }

    // Build the where clause based on admin type and filters
    const whereClause: Prisma.BookingWhereInput = {};
    const courtWhere: Prisma.CourtWhereInput = {};
    const clubWhere: Prisma.ClubWhereInput = {};

    // Role-based scope
    if (adminType === "organization_admin") {
      // Organization admin sees bookings for clubs in their managed organizations
      clubWhere.organizationId = { in: managedIds };
    } else if (adminType === "club_admin") {
      // Club admin sees only bookings for their managed clubs
      courtWhere.clubId = { in: managedIds };
    }
    // Root admin sees all bookings (no additional where clause)

    // Apply filters
    if (orgId && adminType === "root_admin") {
      // Root admin can filter by organization
      clubWhere.organizationId = orgId;
    }

    if (clubId) {
      // Validate club access based on role
      if (adminType === "club_admin" && !managedIds.includes(clubId)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }
      courtWhere.clubId = clubId;
    }

    // Build court where clause if any conditions
    if (Object.keys(clubWhere).length > 0) {
      courtWhere.club = clubWhere;
    }
    if (Object.keys(courtWhere).length > 0) {
      whereClause.court = courtWhere;
    }

    // Build date filter
    const startFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      startFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const dateToEnd = new Date(dateTo);
      dateToEnd.setHours(23, 59, 59, 999);
      startFilter.lte = dateToEnd;
    }
    if (Object.keys(startFilter).length > 0) {
      whereClause.start = startFilter;
    }

    if (status) {
      whereClause.status = status;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    // Get total count for pagination
    const total = await prisma.booking.count({ where: whereClause });

    // Fetch bookings with related data
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      orderBy: { start: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        court: {
          select: {
            id: true,
            name: true,
            clubId: true,
            club: {
              select: {
                id: true,
                name: true,
                organizationId: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        coach: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform bookings to response format
    const bookingResponses: AdminBookingResponse[] = bookings.map((booking) => ({
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      courtName: booking.court.name,
      clubId: booking.court.clubId,
      clubName: booking.court.club.name,
      organizationId: booking.court.club.organizationId,
      organizationName: booking.court.club.organization?.name ?? null,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      status: booking.status,
      price: booking.price,
      coachId: booking.coachId,
      coachName: booking.coach?.user.name ?? null,
      createdAt: booking.createdAt.toISOString(),
    }));

    const response: AdminBookingsListResponse = {
      bookings: bookingResponses,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching admin bookings:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
