import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { Roles } from "@/constants/roles";

export async function GET(request: Request) {
  const authResult = await requireRole(request, [Roles.SuperAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const clubs = await prisma.club.findMany({
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
        courts: {
          select: {
            id: true,
            indoor: true,
          },
        },
      },
    });

    // Process clubs to add indoor/outdoor counts (single pass)
    const clubsWithCounts = clubs.map((club) => {
      const { indoorCount, outdoorCount } = club.courts.reduce(
        (acc, court) => {
          if (court.indoor) {
            acc.indoorCount++;
          } else {
            acc.outdoorCount++;
          }
          return acc;
        },
        { indoorCount: 0, outdoorCount: 0 }
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
  const authResult = await requireRole(request, [Roles.SuperAdmin]);

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
