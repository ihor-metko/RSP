import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode, getMockClubs, getMockCourts, getMockCoaches, getMockBusinessHours, getMockGalleryImages, getMockUsers } from "@/services/mockDb";

// Maximum number of gallery images to return
const MAX_GALLERY_IMAGES = 6;

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
      const mockCoaches = getMockCoaches();
      const mockBusinessHours = getMockBusinessHours();
      const mockGalleryImages = getMockGalleryImages();
      const mockUsers = getMockUsers();
      
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
      
      // Get coaches for this club
      const clubCoaches = mockCoaches
        .filter((c) => c.clubId === clubId)
        .map((coach) => {
          const user = mockUsers.find((u) => u.id === coach.userId);
          return {
            id: coach.id,
            name: user?.name || "Unknown Coach",
          };
        });
      
      // Get business hours for this club
      const clubBusinessHours = mockBusinessHours
        .filter((bh) => bh.clubId === clubId)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      
      // Get gallery images for this club
      const clubGallery = mockGalleryImages
        .filter((img) => img.clubId === clubId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, MAX_GALLERY_IMAGES);
      
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
        coaches: clubCoaches,
        businessHours: clubBusinessHours,
        gallery: clubGallery,
      });
    }

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
