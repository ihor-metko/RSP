import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";
import { randomUUID } from "crypto";
import {
  uploadToStorage,
  validateFileForUpload,
  getExtensionForMimeType,
  isSupabaseStorageConfigured,
} from "@/lib/supabase";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ADMIN_ROLES);

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

    // Generate unique key for the file using validated extension from MIME type
    const extension = getExtensionForMimeType(file.type);
    // Path inside the bucket: clubs/{clubId}/{uuid}.{ext}
    const imageKey = `clubs/${clubId}/${randomUUID()}.${extension}`;

    let imageUrl: string;

    // Upload to Supabase Storage if configured, otherwise use mock URL
    if (isSupabaseStorageConfigured()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadToStorage(imageKey, buffer, file.type);

      if ("error" in uploadResult) {
        console.error("Failed to upload to Supabase Storage:", uploadResult.error);
        return NextResponse.json(
          { error: `Upload failed: ${uploadResult.error}` },
          { status: 500 }
        );
      }

      // Store the relative path returned by Supabase (e.g., "clubs/{clubId}/{uuid}.jpg")
      // The getSupabaseStorageUrl utility will convert this to a full URL
      imageUrl = uploadResult.path;
    } else {
      // Development fallback: store as mock URL
      console.warn("Supabase Storage not configured, using mock URL");
      imageUrl = `/uploads/${imageKey}`;
    }

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
        imageKey,
        altText: file.name,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        id: galleryImage.id,
        url: imageUrl,
        key: imageKey,
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
