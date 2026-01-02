import { NextRequest, NextResponse } from "next/server";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/admin/clubs/[id]/images/[imageId]
 * Delete a gallery image for a club
 * 
 * This endpoint is part of the unified image upload mechanism for clubs.
 * It handles deletion of gallery images from the ClubGallery table.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;
    const imageId = resolvedParams.imageId;

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

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    // Delete the gallery image
    const galleryImage = await prisma.clubGallery.findUnique({
      where: { id: imageId },
    });

    if (!galleryImage) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Verify the image belongs to this club
    if (galleryImage.clubId !== clubId) {
      return NextResponse.json(
        { error: "Image does not belong to this club" },
        { status: 403 }
      );
    }

    await prisma.clubGallery.delete({
      where: { id: imageId },
    });

    console.log(`[Club Gallery Delete] Successfully deleted gallery image ${imageId} for club ${clubId}`);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(`[Club Gallery Delete] Error deleting gallery image:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
