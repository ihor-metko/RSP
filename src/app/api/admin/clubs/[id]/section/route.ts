import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { SportType } from "@/constants/sports";

type Section = "header" | "contacts" | "hours" | "gallery" | "coaches";

interface HeaderPayload {
  name: string;
  slug: string;
  shortDescription: string;
  isPublic: boolean;
  supportedSports?: SportType[];
}

interface ContactsPayload {
  location: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface SpecialHour {
  id?: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason?: string | null;
}

interface HoursPayload {
  businessHours: BusinessHour[];
  specialHours: SpecialHour[];
}

interface GalleryImage {
  id?: string;
  imageUrl: string;
  imageKey?: string | null;
  altText?: string | null;
  sortOrder: number;
}

interface GalleryPayload {
  heroImage: string | null;
  logo: string | null;
  gallery: GalleryImage[];
}

interface CoachesPayload {
  coachIds: string[];
}

interface SectionUpdateRequest {
  section: Section;
  payload: HeaderPayload | ContactsPayload | HoursPayload | GalleryPayload | CoachesPayload;
}

function validateHours(hours: BusinessHour[]): { valid: boolean; error?: string } {
  for (const hour of hours) {
    if (!hour.isClosed && hour.openTime && hour.closeTime) {
      if (hour.openTime >= hour.closeTime) {
        return {
          valid: false,
          error: `Invalid hours for day ${hour.dayOfWeek}: opening time must be before closing time`,
        };
      }
    }
  }
  return { valid: true };
}

function validateSpecialHours(hours: SpecialHour[]): { valid: boolean; error?: string } {
  // Check for duplicates
  const dates = hours.map((h) => h.date);
  const uniqueDates = new Set(dates);
  if (dates.length !== uniqueDates.size) {
    return { valid: false, error: "Duplicate dates in special hours" };
  }

  // Check open/close times
  for (const hour of hours) {
    if (!hour.isClosed && hour.openTime && hour.closeTime) {
      if (hour.openTime >= hour.closeTime) {
        return {
          valid: false,
          error: `Invalid special hours for ${hour.date}: opening time must be before closing time`,
        };
      }
    }
  }
  return { valid: true };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body: SectionUpdateRequest = await request.json();
    const { section, payload } = body;

    if (!section || !payload) {
      return NextResponse.json(
        { error: "Section and payload are required" },
        { status: 400 }
      );
    }

    const validSections: Section[] = ["header", "contacts", "hours", "gallery", "coaches"];
    if (!validSections.includes(section)) {
      return NextResponse.json(
        { error: `Invalid section. Must be one of: ${validSections.join(", ")}` },
        { status: 400 }
      );
    }

    let updatedClub;

    switch (section) {
      case "header": {
        const headerPayload = payload as HeaderPayload;
        
        if (!headerPayload.name?.trim()) {
          return NextResponse.json(
            { error: "Club name is required" },
            { status: 400 }
          );
        }

        // Check slug uniqueness if changed
        if (headerPayload.slug && headerPayload.slug !== existingClub.slug) {
          const slugExists = await prisma.club.findFirst({
            where: {
              slug: headerPayload.slug,
              id: { not: clubId },
            },
          });
          if (slugExists) {
            return NextResponse.json(
              { error: "A club with this slug already exists" },
              { status: 409 }
            );
          }
        }

        updatedClub = await prisma.club.update({
          where: { id: clubId },
          data: {
            name: headerPayload.name.trim(),
            slug: headerPayload.slug?.trim() || existingClub.slug,
            shortDescription: headerPayload.shortDescription?.trim() || null,
            isPublic: headerPayload.isPublic ?? existingClub.isPublic,
            ...(headerPayload.supportedSports !== undefined && { 
              supportedSports: headerPayload.supportedSports 
            }),
          },
          include: {
            courts: true,
            coaches: { include: { user: true } },
            gallery: { orderBy: { sortOrder: "asc" } },
            businessHours: { orderBy: { dayOfWeek: "asc" } },
            specialHours: { orderBy: { date: "asc" } },
          },
        });
        break;
      }

      case "contacts": {
        const contactsPayload = payload as ContactsPayload;

        if (!contactsPayload.location?.trim()) {
          return NextResponse.json(
            { error: "Address is required" },
            { status: 400 }
          );
        }

        updatedClub = await prisma.club.update({
          where: { id: clubId },
          data: {
            location: contactsPayload.location.trim(),
            city: contactsPayload.city?.trim() || null,
            country: contactsPayload.country?.trim() || null,
            latitude: contactsPayload.latitude || null,
            longitude: contactsPayload.longitude || null,
            phone: contactsPayload.phone?.trim() || null,
            email: contactsPayload.email?.trim() || null,
            website: contactsPayload.website?.trim() || null,
          },
          include: {
            courts: true,
            coaches: { include: { user: true } },
            gallery: { orderBy: { sortOrder: "asc" } },
            businessHours: { orderBy: { dayOfWeek: "asc" } },
            specialHours: { orderBy: { date: "asc" } },
          },
        });
        break;
      }

      case "hours": {
        const hoursPayload = payload as HoursPayload;

        // Validate business hours
        const businessValidation = validateHours(hoursPayload.businessHours || []);
        if (!businessValidation.valid) {
          return NextResponse.json(
            { error: businessValidation.error },
            { status: 400 }
          );
        }

        // Validate special hours
        const specialValidation = validateSpecialHours(hoursPayload.specialHours || []);
        if (!specialValidation.valid) {
          return NextResponse.json(
            { error: specialValidation.error },
            { status: 400 }
          );
        }

        // Update in transaction
        updatedClub = await prisma.$transaction(async (tx) => {
          // Delete existing business hours and replace
          await tx.clubBusinessHours.deleteMany({
            where: { clubId },
          });

          if (hoursPayload.businessHours?.length > 0) {
            await tx.clubBusinessHours.createMany({
              data: hoursPayload.businessHours.map((hour) => ({
                clubId,
                dayOfWeek: hour.dayOfWeek,
                openTime: hour.openTime,
                closeTime: hour.closeTime,
                isClosed: hour.isClosed,
              })),
            });
          }

          // Delete existing special hours and replace
          await tx.clubSpecialHours.deleteMany({
            where: { clubId },
          });

          if (hoursPayload.specialHours?.length > 0) {
            await tx.clubSpecialHours.createMany({
              data: hoursPayload.specialHours.map((hour) => ({
                clubId,
                date: new Date(hour.date),
                openTime: hour.openTime,
                closeTime: hour.closeTime,
                isClosed: hour.isClosed,
                reason: hour.reason || null,
              })),
            });
          }

          return tx.club.findUnique({
            where: { id: clubId },
            include: {
              courts: true,
              coaches: { include: { user: true } },
              gallery: { orderBy: { sortOrder: "asc" } },
              businessHours: { orderBy: { dayOfWeek: "asc" } },
              specialHours: { orderBy: { date: "asc" } },
            },
          });
        });
        break;
      }

      case "gallery": {
        const galleryPayload = payload as GalleryPayload;

        updatedClub = await prisma.$transaction(async (tx) => {
          // Update hero image and logo
          await tx.club.update({
            where: { id: clubId },
            data: {
              heroImage: galleryPayload.heroImage || null,
              logo: galleryPayload.logo || null,
            },
          });

          // Delete existing gallery and replace
          await tx.clubGallery.deleteMany({
            where: { clubId },
          });

          if (galleryPayload.gallery?.length > 0) {
            await tx.clubGallery.createMany({
              data: galleryPayload.gallery.map((image, index) => ({
                clubId,
                imageUrl: image.imageUrl,
                imageKey: image.imageKey || null,
                altText: image.altText || null,
                sortOrder: image.sortOrder ?? index,
              })),
            });
          }

          return tx.club.findUnique({
            where: { id: clubId },
            include: {
              courts: true,
              coaches: { include: { user: true } },
              gallery: { orderBy: { sortOrder: "asc" } },
              businessHours: { orderBy: { dayOfWeek: "asc" } },
              specialHours: { orderBy: { date: "asc" } },
            },
          });
        });
        break;
      }

      case "coaches": {
        const coachesPayload = payload as CoachesPayload;

        updatedClub = await prisma.$transaction(async (tx) => {
          // First, unlink all existing coaches from this club
          await tx.coach.updateMany({
            where: { clubId },
            data: { clubId: null },
          });

          // Link selected coaches to this club
          if (coachesPayload.coachIds?.length > 0) {
            await tx.coach.updateMany({
              where: { id: { in: coachesPayload.coachIds } },
              data: { clubId },
            });
          }

          return tx.club.findUnique({
            where: { id: clubId },
            include: {
              courts: true,
              coaches: { include: { user: true } },
              gallery: { orderBy: { sortOrder: "asc" } },
              businessHours: { orderBy: { dayOfWeek: "asc" } },
              specialHours: { orderBy: { date: "asc" } },
            },
          });
        });
        break;
      }
    }

    return NextResponse.json(updatedClub);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club section:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
