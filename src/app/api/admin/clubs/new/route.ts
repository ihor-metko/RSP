import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { SportType } from "@/constants/sports";

interface BusinessHourInput {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface SpecialHourInput {
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason?: string;
}

interface CourtInput {
  name: string;
  type: string | null;
  surface: string | null;
  indoor: boolean;
  sportType?: SportType;
  defaultPriceCents: number;
}

interface GalleryInput {
  url: string;
  key: string;
}

interface CreateClubRequest {
  organizationId: string;
  name: string;
  slug?: string;
  shortDescription: string;
  longDescription?: string;
  location: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks?: string | null;
  defaultCurrency?: string;
  timezone?: string;
  isPublic?: boolean;
  tags?: string | null;
  supportedSports?: SportType[];
  bannerData?: { url: string; altText?: string; description?: string; position?: string };
  logoData?: { url: string; altText?: string; thumbnailUrl?: string };
  gallery?: GalleryInput[];
  businessHours?: BusinessHourInput[];
  specialHours?: SpecialHourInput[];
  courts?: CourtInput[];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  // Allow root admin or organization admin to create clubs
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Only root admin and organization admin can create clubs
  if (authResult.adminType === "club_admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body: CreateClubRequest = await request.json();

    // Validate required fields
    if (!body.organizationId?.trim()) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 }
      );
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Club name is required" },
        { status: 400 }
      );
    }

    if (!body.shortDescription?.trim()) {
      return NextResponse.json(
        { error: "Short description is required" },
        { status: 400 }
      );
    }

    if (!body.location?.trim()) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Validate organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: body.organizationId, archivedAt: null },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // For organization admins, verify they have access to this organization
    // using the managed IDs from the auth result (avoids redundant DB query)
    if (authResult.adminType === "organization_admin") {
      if (!authResult.managedIds.includes(body.organizationId)) {
        return NextResponse.json(
          { error: "You do not have permission to create clubs in this organization" },
          { status: 403 }
        );
      }
    }

    // Check if organization has reached club creation limit
    const currentClubCount = await prisma.club.count({
      where: { organizationId: body.organizationId },
    });

    const maxClubs = organization.maxClubs ?? 3;
    if (currentClubCount >= maxClubs) {
      return NextResponse.json(
        { 
          error: `Organization has reached the maximum limit of ${maxClubs} clubs`,
          maxClubs,
          currentCount: currentClubCount,
        },
        { status: 403 }
      );
    }

    // Generate or validate slug
    const slug = body.slug?.trim() || generateSlug(body.name);

    // Check slug uniqueness
    const existingClub = await prisma.club.findUnique({
      where: { slug },
    });

    if (existingClub) {
      return NextResponse.json(
        { error: "A club with this slug already exists" },
        { status: 409 }
      );
    }

    // Create club with related records in a transaction
    const clubId = await prisma.$transaction(async (tx) => {
      // Create the club
      const newClub = await tx.club.create({
        data: {
          name: body.name.trim(),
          slug,
          organizationId: body.organizationId,
          createdById: authResult.userId,
          shortDescription: body.shortDescription.trim(),
          longDescription: body.longDescription?.trim() || null,
          location: body.location.trim(),
          city: body.city || null,
          country: body.country || null,
          latitude: body.latitude || null,
          longitude: body.longitude || null,
          phone: body.phone || null,
          email: body.email || null,
          website: body.website || null,
          socialLinks: body.socialLinks || null,
          defaultCurrency: body.defaultCurrency || "USD",
          timezone: body.timezone || "UTC",
          isPublic: body.isPublic ?? true,
          tags: body.tags || null,
          supportedSports: body.supportedSports || ["PADEL"],
          bannerData: body.bannerData ? JSON.stringify(body.bannerData) : null,
          logoData: body.logoData ? JSON.stringify(body.logoData) : null,
        },
      });

      // Create business hours
      if (body.businessHours && body.businessHours.length > 0) {
        await tx.clubBusinessHours.createMany({
          data: body.businessHours.map((hour) => ({
            clubId: newClub.id,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          })),
        });
      }

      // Create special hours
      if (body.specialHours && body.specialHours.length > 0) {
        await tx.clubSpecialHours.createMany({
          data: body.specialHours.map((hour) => ({
            clubId: newClub.id,
            date: new Date(hour.date),
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            reason: hour.reason || null,
          })),
        });
      }

      // Create gallery images
      if (body.gallery && body.gallery.length > 0) {
        await tx.clubGallery.createMany({
          data: body.gallery.map((image, index) => ({
            clubId: newClub.id,
            imageUrl: image.url,
            imageKey: image.key || null,
            sortOrder: index,
          })),
        });
      }

      // Create courts
      if (body.courts && body.courts.length > 0) {
        await tx.court.createMany({
          data: body.courts.map((court) => ({
            clubId: newClub.id,
            name: court.name,
            type: court.type || null,
            surface: court.surface || null,
            indoor: court.indoor,
            sportType: court.sportType || "PADEL",
            defaultPriceCents: court.defaultPriceCents,
          })),
        });
      }

      return newClub.id;
    });

    return NextResponse.json({ id: clubId, success: true }, { status: 201 });
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
