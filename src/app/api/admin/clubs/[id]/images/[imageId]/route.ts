import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

/**
 * DELETE /api/admin/clubs/:id/images/:imageId
 *
 * Delete a gallery image from a club.
 * Only club admins, club owners, organization admins, and root admins can delete images.
 *
 * @param id - Club ID
 * @param imageId - Gallery image ID
 *
 * @returns Success status
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id: clubId, imageId } = await params;

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

    // Verify the image exists and belongs to the club
    const image = await prisma.clubGallery.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.clubId !== clubId) {
      return NextResponse.json({ error: "Image does not belong to this club" }, { status: 403 });
    }

    // Delete the image from the database
    await prisma.clubGallery.delete({
      where: { id: imageId },
    });

    console.log(`[Club Gallery Delete] Successfully deleted image ${imageId} from club ${clubId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[Club Gallery Delete] Error deleting image:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
