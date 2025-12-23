import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { deleteFileFromStorage, extractFilenameFromPath } from "@/lib/fileStorage";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;
    const imageId = resolvedParams.imageId;

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Check if image exists and belongs to this club
    const image = await prisma.clubGallery.findFirst({
      where: {
        id: imageId,
        clubId,
      },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Delete from filesystem if imageKey exists
    if (image.imageKey) {
      // Extract filename from the key/URL
      const filename = extractFilenameFromPath(image.imageKey);
      
      if (filename) {
        const deleteResult = await deleteFileFromStorage(filename);
        if ("error" in deleteResult) {
          console.error("Failed to delete from filesystem:", deleteResult.error);
          // Continue with DB deletion even if storage deletion fails
        }
      }
    }

    // Delete the gallery record
    await prisma.clubGallery.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting club image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
