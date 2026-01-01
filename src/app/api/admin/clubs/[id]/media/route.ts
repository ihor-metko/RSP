import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";
import { CLUB_DETAIL_INCLUDE, formatClubResponse } from "@/lib/clubApiHelpers";

interface GalleryImage {
  id?: string;
  imageUrl: string;
  imageKey?: string | null;
  altText?: string | null;
  sortOrder: number;
}

/**
 * PATCH /api/admin/clubs/[id]/media
 * Update club media (logo, banner, gallery)
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
    const { bannerData, logoData, gallery } = body;

    // Update media and fetch updated club in a transaction
    const updatedClub = await prisma.$transaction(async (tx) => {
      // Update banner and logo data if provided
      const updateData: Record<string, unknown> = {};
      if (bannerData !== undefined) {
        updateData.bannerData = bannerData ? JSON.stringify(bannerData) : null;
      }
      if (logoData !== undefined) {
        updateData.logoData = logoData ? JSON.stringify(logoData) : null;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.club.update({
          where: { id: clubId },
          data: updateData,
        });
      }

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

      // Fetch and return the updated club with all relations
      return await tx.club.findUnique({
        where: { id: clubId },
        include: CLUB_DETAIL_INCLUDE,
      });
    });

    if (!updatedClub) {
      return NextResponse.json({ error: "Club not found after update" }, { status: 404 });
    }

    return NextResponse.json(formatClubResponse(updatedClub));
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
