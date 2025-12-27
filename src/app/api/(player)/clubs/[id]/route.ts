import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;


    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        organization: {
          select: {
            isPublic: true,
          },
        },
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

    // Check if club exists and is visible (club must be public AND organization must be public)
    if (!club || !club.isPublic || !club.organization?.isPublic) {
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
      // New structure
      logoData: club.logoData ? JSON.parse(club.logoData) : null,
      bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
      // Deprecated - kept for backward compatibility
      logo: club.logo,
      heroImage: club.heroImage,
      metadata: club.metadata,
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
