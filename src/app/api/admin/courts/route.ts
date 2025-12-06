import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import type { Prisma } from "@prisma/client";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetCourtsForAdmin } from "@/services/mockApiHandlers";

/**
 * GET /api/admin/courts
 * 
 * Returns courts based on admin role:
 * - Root Admin: sees all courts across all clubs and organizations
 * - Organization Admin: sees only courts within their organization's clubs
 * - Club Admin: sees only courts within their assigned club(s)
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const courts = await mockGetCourtsForAdmin({
        adminType: authResult.adminType,
        managedIds: authResult.managedIds,
      });
      return NextResponse.json(courts);
    }

    // Build the where clause based on admin type
    let whereClause: Prisma.CourtWhereInput = {};

    if (authResult.adminType === "organization_admin") {
      // Organization admin sees courts in clubs belonging to their organizations
      whereClause = {
        club: {
          organizationId: {
            in: authResult.managedIds,
          },
        },
      };
    } else if (authResult.adminType === "club_admin") {
      // Club admin sees only courts in their managed clubs
      whereClause = {
        clubId: {
          in: authResult.managedIds,
        },
      };
    }
    // Root admin sees all courts (no where clause)

    const courts = await prisma.court.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        surface: true,
        indoor: true,
        defaultPriceCents: true,
        createdAt: true,
        updatedAt: true,
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
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Transform the response for easier frontend consumption
    const courtsWithDetails = courts.map((court) => ({
      id: court.id,
      name: court.name,
      slug: court.slug,
      type: court.type,
      surface: court.surface,
      indoor: court.indoor,
      defaultPriceCents: court.defaultPriceCents,
      createdAt: court.createdAt,
      updatedAt: court.updatedAt,
      club: {
        id: court.club.id,
        name: court.club.name,
      },
      organization: court.club.organization
        ? {
            id: court.club.organization.id,
            name: court.club.organization.name,
          }
        : null,
      bookingCount: court._count.bookings,
    }));

    return NextResponse.json(courtsWithDetails);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching courts:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
