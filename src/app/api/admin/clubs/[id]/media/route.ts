import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

interface GalleryImage {
  id?: string;
  imageUrl: string;
  imageKey?: string | null;
  altText?: string | null;
  sortOrder: number;
}

/**
 * PATCH /api/admin/clubs/[id]/media
 * Update club gallery images only
 * Note: Banner and logo are managed separately via dedicated endpoints
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check access permission for organization admins, club owners, and club admins
    if (authResult.adminType !== "root_admin") {
      const hasAccess = await canAccessClub(
        authResult.adminType,
        authResult.managedIds,
        clubId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body = await request.json();
    const { gallery } = body;

    // Update gallery in transaction
    await prisma.$transaction(async (tx) => {
      // Update gallery if provided
      if (gallery !== undefined && Array.isArray(gallery)) {
        // Delete existing gallery and replace
        await tx.clubGallery.deleteMany({
          where: { clubId },
        });

        if (gallery.length > 0) {
          await tx.clubGallery.createMany({
            data: gallery.map((image: GalleryImage, index: number) => ({
              clubId,
              imageUrl: image.imageUrl,
              imageKey: image.imageKey || null,
              altText: image.altText || null,
              sortOrder: image.sortOrder ?? index,
            })),
          });
        }
      }
    });

    // Fetch updated club data to return
    // Note: We return the full club data (not just gallery) because the component's
    // updateClubInStore() method needs the complete club object to properly update
    // the Zustand store. This maintains consistency with other update endpoints.
    const updatedClub = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        metadata: false,
        courts: {
          orderBy: { name: "asc" },
        },
        gallery: {
          orderBy: { sortOrder: "asc" },
        },
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    if (!updatedClub) {
      return NextResponse.json({ error: "Club not found after update" }, { status: 404 });
    }

    // Parse JSON fields
    const formattedClub = {
      ...updatedClub,
      logoData: updatedClub.logoData ? JSON.parse(updatedClub.logoData) : null,
      bannerData: updatedClub.bannerData ? JSON.parse(updatedClub.bannerData) : null,
    };

    return NextResponse.json(formattedClub);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club media:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
