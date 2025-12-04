import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";
import { MembershipRole, ClubMembershipRole } from "@prisma/client";
import { generateSlug } from "@/utils/club";

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
  defaultPriceCents: number;
}

interface GalleryInput {
  url: string;
  key: string;
}

interface CreateClubRequest {
  name: string;
  slug?: string;
  organizationId?: string;
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
  heroImage?: string;
  logo?: string;
  gallery?: GalleryInput[];
  businessHours?: BusinessHourInput[];
  courts?: CourtInput[];
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, ADMIN_ROLES);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body: CreateClubRequest = await request.json();

    // Validate required fields
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
      // If no organizationId is provided, get or create a default organization for this user
      let organizationId = body.organizationId;
      
      if (!organizationId) {
        // Check if user has any organization membership as admin
        const existingMembership = await tx.membership.findFirst({
          where: {
            userId: authResult.userId,
            role: MembershipRole.ORGANIZATION_ADMIN,
          },
          select: { organizationId: true },
        });

        if (existingMembership) {
          organizationId = existingMembership.organizationId;
        } else {
          // Create a default organization for this user
          const orgSlug = `org-${generateSlug(body.name)}-${Date.now()}`;
          const newOrg = await tx.organization.create({
            data: {
              name: `${body.name.trim()} Organization`,
              slug: orgSlug,
              createdById: authResult.userId,
            },
          });
          
          // Make the user an organization admin
          await tx.membership.create({
            data: {
              userId: authResult.userId,
              organizationId: newOrg.id,
              role: MembershipRole.ORGANIZATION_ADMIN,
            },
          });
          
          organizationId = newOrg.id;
        }
      }

      // Create the club
      const newClub = await tx.club.create({
        data: {
          name: body.name.trim(),
          slug,
          organizationId,
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
          heroImage: body.heroImage || null,
          logo: body.logo || null,
        },
      });

      // Make the creator a club admin
      await tx.clubMembership.create({
        data: {
          userId: authResult.userId,
          clubId: newClub.id,
          role: ClubMembershipRole.CLUB_ADMIN,
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
            defaultPriceCents: court.defaultPriceCents,
          })),
        });
      }

      return newClub;
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
