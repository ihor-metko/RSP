import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import {
  saveFileToStorage,
  validateFileForUpload,
  generateUniqueFilename,
} from "@/lib/fileStorage";

export async function POST(
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

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type and size
    const validationError = validateFileForUpload(file.type, file.size);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.type);

    // Save file to filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    const saveResult = await saveFileToStorage(filename, buffer);

    if ("error" in saveResult) {
      console.error("Failed to save file:", saveResult.error);
      return NextResponse.json(
        { error: `Upload failed: ${saveResult.error}` },
        { status: 500 }
      );
    }

    // Generate URL to serve the image
    const imageUrl = `/api/images/${filename}`;

    // Get current max sortOrder for this club's gallery
    const maxSortOrder = await prisma.clubGallery.aggregate({
      where: { clubId },
      _max: { sortOrder: true },
    });

    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    // Create gallery record
    const galleryImage = await prisma.clubGallery.create({
      data: {
        clubId,
        imageUrl,
        imageKey: filename,
        altText: file.name,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        id: galleryImage.id,
        url: imageUrl,
        key: filename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        sortOrder: galleryImage.sortOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading club image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
