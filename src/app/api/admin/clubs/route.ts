import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, requireRootAdmin } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";
import type { Prisma } from "@prisma/client";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetClubs, mockCreateClub } from "@/services/mockApiHandlers";

export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const clubs = await mockGetClubs({
        adminType: authResult.adminType,
        managedIds: authResult.managedIds,
      });
      return NextResponse.json(clubs);
    }

    // Build the where clause based on admin type
    let whereClause: Prisma.ClubWhereInput = {};

    if (authResult.adminType === "organization_admin") {
      // Organization admin sees clubs in their managed organizations
      whereClause = {
        organizationId: {
          in: authResult.managedIds,
        },
      };
    } else if (authResult.adminType === "club_admin") {
      // Club admin sees only their managed clubs
      whereClause = {
        id: {
          in: authResult.managedIds,
        },
      };
    }
    // Root admin sees all clubs (no where clause)

    const clubs = await prisma.club.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        location: true,
        city: true,
        contactInfo: true,
        openingHours: true,
        logo: true,
        heroImage: true,
        tags: true,
        isPublic: true,
        createdAt: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        courts: {
          select: {
            id: true,
            indoor: true,
            bookings: {
              select: {
                id: true,
              },
            },
          },
        },
        clubMemberships: {
          where: {
            role: ClubMembershipRole.CLUB_ADMIN,
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Process clubs to add counts and transform data
    const clubsWithCounts = clubs.map((club) => {
      const { indoorCount, outdoorCount, bookingCount } = club.courts.reduce(
        (acc, court) => {
          if (court.indoor) {
            acc.indoorCount++;
          } else {
            acc.outdoorCount++;
          }
          acc.bookingCount += court.bookings.length;
          return acc;
        },
        { indoorCount: 0, outdoorCount: 0, bookingCount: 0 }
      );

      return {
        id: club.id,
        name: club.name,
        shortDescription: club.shortDescription,
        location: club.location,
        city: club.city,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logo: club.logo,
        heroImage: club.heroImage,
        tags: club.tags,
        isPublic: club.isPublic,
        createdAt: club.createdAt,
        indoorCount,
        outdoorCount,
        courtCount: club.courts.length,
        bookingCount,
        organization: club.organization,
        admins: club.clubMemberships.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        })),
      };
    });

    return NextResponse.json(clubsWithCounts);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching clubs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, location, contactInfo, openingHours, logo } = body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const club = await mockCreateClub({
        name,
        location,
        contactInfo: contactInfo || null,
        openingHours: openingHours || null,
        logo: logo || null,
        createdById: authResult.userId,
      });
      return NextResponse.json(club, { status: 201 });
    }

    const club = await prisma.club.create({
      data: {
        name,
        location,
        contactInfo: contactInfo || null,
        openingHours: openingHours || null,
        logo: logo || null,
      },
    });

    return NextResponse.json(club, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
