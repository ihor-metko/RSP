import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode, getMockClubs, getMockCourts } from "@/services/mockDb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockClubs = getMockClubs();
      const mockCourts = getMockCourts();
      
      const club = mockClubs.find((c) => c.id === clubId);
      
      if (!club) {
        return NextResponse.json({ error: "Club not found" }, { status: 404 });
      }
      
      const courts = mockCourts
        .filter((c) => c.clubId === clubId)
        .map((court) => ({
          id: court.id,
          name: court.name,
          type: court.type,
          surface: court.surface,
          indoor: court.indoor,
          defaultPriceCents: court.defaultPriceCents,
        }));
      
      // Mock empty arrays for data we don't have in mockDb
      // TODO: Add these to mockDb when needed for testing
      const coaches: Array<{ id: string; name: string }> = [];
      const businessHours: Array<unknown> = [];
      const gallery: Array<unknown> = [];
      
      return NextResponse.json({
        id: club.id,
        name: club.name,
        slug: club.slug,
        shortDescription: club.shortDescription,
        longDescription: club.longDescription,
        location: club.location,
        city: club.city,
        country: club.country,
        latitude: club.latitude,
        longitude: club.longitude,
        phone: club.phone,
        email: club.email,
        website: club.website,
        socialLinks: club.socialLinks,
        contactInfo: club.contactInfo,
        openingHours: club.openingHours,
        logo: club.logo,
        heroImage: club.heroImage,
        defaultCurrency: club.defaultCurrency,
        timezone: club.timezone,
        tags: club.tags,
        courts,
        coaches,
        businessHours,
        gallery,
      });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          select: {
            id: true,
            name: true,
            type: true,
            surface: true,
            indoor: true,
            defaultPriceCents: true,
          },
        },
        coaches: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
        },
        gallery: {
          orderBy: { sortOrder: "asc" },
          take: 6,
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Transform coaches to include name from user
    const coaches = club.coaches.map((coach) => ({
      id: coach.id,
      name: coach.user.name || "Unknown Coach",
    }));

    // Return full club details for the redesigned player page
    return NextResponse.json({
      id: club.id,
      name: club.name,
      slug: club.slug,
      shortDescription: club.shortDescription,
      longDescription: club.longDescription,
      location: club.location,
      city: club.city,
      country: club.country,
      latitude: club.latitude,
      longitude: club.longitude,
      phone: club.phone,
      email: club.email,
      website: club.website,
      socialLinks: club.socialLinks,
      contactInfo: club.contactInfo,
      openingHours: club.openingHours,
      logo: club.logo,
      heroImage: club.heroImage,
      defaultCurrency: club.defaultCurrency,
      timezone: club.timezone,
      tags: club.tags,
      courts: club.courts,
      coaches,
      businessHours: club.businessHours,
      gallery: club.gallery,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
