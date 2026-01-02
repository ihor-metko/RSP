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
            id: true,
            name: true,
            isPublic: true,
          },
        },
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    // Check if club exists and is visible (club must be public AND organization must be public)
    if (!club || !club.isPublic || !club.organization?.isPublic) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Return optimized club details (without courts, coaches, and gallery)
    // Courts: Available via /api/(player)/clubs/[id]/courts
    // Gallery: Available via /api/(player)/clubs/[id]/gallery
    // Coaches: Removed per requirements
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
      logoData: club.logoData ? (() => {
        try {
          return JSON.parse(club.logoData);
        } catch {
          return null;
        }
      })() : null,
      bannerData: club.bannerData ? (() => {
        try {
          return JSON.parse(club.bannerData);
        } catch {
          return null;
        }
      })() : null,
      defaultCurrency: club.defaultCurrency,
      timezone: club.timezone,
      tags: club.tags,
      organization: club.organization ? {
        id: club.organization.id,
        name: club.organization.name,
      } : null,
      businessHours: club.businessHours,
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
