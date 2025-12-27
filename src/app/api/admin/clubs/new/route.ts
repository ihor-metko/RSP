import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { SportType } from "@/constants/sports";
import type { Address } from "@/types/address";

interface BusinessHourInput {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
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
  location: string; // Legacy field
  address?: Address; // New Address object
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
  heroImage?: string;
  logo?: string;
  gallery?: GalleryInput[];
  businessHours?: BusinessHourInput[];
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
    const club = await prisma.$transaction(async (tx) => {
      // Handle addressData - support both Address object and legacy string
      let addressDataJson: string | null = null;
      let legacyLocation: string = body.location?.trim() || "Address not provided";

      if (body.address && typeof body.address === 'object' && 'street' in body.address && 'city' in body.address) {
        // New Address object format
        addressDataJson = JSON.stringify(body.address);
        // Update legacy location for backward compatibility
        const parts = [body.address.street, body.address.city, body.address.zip, body.address.country].filter(Boolean);
        if (parts.length > 0) {
          legacyLocation = parts.join(', ');
        }
      }

      // Create the club
      const newClub = await tx.club.create({
        data: {
          name: body.name.trim(),
          slug,
          organizationId: body.organizationId,
          createdById: authResult.userId,
          shortDescription: body.shortDescription.trim(),
          longDescription: body.longDescription?.trim() || null,
          location: legacyLocation,
          addressData: addressDataJson,
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
          heroImage: body.heroImage || null,
          logo: body.logo || null,
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

      return newClub;
    });

    // Parse addressData for response
    let responseClub = { ...club };
    if (club.addressData) {
      try {
        responseClub.address = JSON.parse(club.addressData);
      } catch {
        // Keep legacy location if parsing fails
      }
    }

    return NextResponse.json(responseClub, { status: 201 });
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
