import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { randomUUID } from "crypto";
import {
  uploadToStorage,
  validateFileForUpload,
  getExtensionForMimeType,
  isSupabaseStorageConfigured,
} from "@/lib/supabase";

/**
 * POST /api/admin/organizations/[id]/images
 * Upload an image for an organization to Supabase Storage
 * 
 * Images are stored in the "uploads" bucket with the path:
 * organizations/{organizationId}/{uuid}.{ext}
 * 
 * This follows the same pattern as club images: clubs/{clubId}/{uuid}.{ext}
 */
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
    const organizationId = resolvedParams.id;

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const imageType = formData.get("type") as string | null; // "logo" or "heroImage"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!imageType || !["logo", "heroImage"].includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'logo' or 'heroImage'" },
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
    // Path inside the bucket: organizations/{organizationId}/{uuid}.{ext}
    const imageKey = `organizations/${organizationId}/${randomUUID()}.${extension}`;

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

      // Store the relative path returned by Supabase (e.g., "organizations/{organizationId}/{uuid}.jpg")
      // The getSupabaseStorageUrl utility will convert this to a full URL
      imageUrl = uploadResult.path;
    } else {
      // Development fallback: store as mock URL
      console.warn("Supabase Storage not configured, using mock URL");
      imageUrl = `/uploads/${imageKey}`;
    }

    // Update the organization with the new image URL
    const updateData = imageType === "logo" 
      ? { logo: imageUrl }
      : { heroImage: imageUrl };

    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    return NextResponse.json(
      {
        url: imageUrl,
        key: imageKey,
        type: imageType,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        organization: {
          id: updatedOrganization.id,
          logo: updatedOrganization.logo,
          heroImage: updatedOrganization.heroImage,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading organization image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
