import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import {
  saveFileToStorage,
  validateLogoFileForUpload,
  validateFileForUpload,
  generateUniqueFilename,
} from "@/lib/fileStorage";
import { sanitizeSVG, isValidSVGBuffer } from "@/lib/svgSanitizer";

/**
 * POST /api/admin/organizations/[id]/images
 * Upload an image for an organization to filesystem storage.
 * 
 * Images are stored in /app/storage/images/ with unique filenames.
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

    // Validate file type and size based on image type
    // SVG is only allowed for logos, not for heroImage
    const validationError = imageType === "logo"
      ? validateLogoFileForUpload(file.type, file.size)
      : validateFileForUpload(file.type, file.size);
    
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.type);

    // Get file buffer
    let fileBuffer = Buffer.from(await file.arrayBuffer());

    // If it's an SVG logo, sanitize it first
    if (imageType === "logo" && file.type === "image/svg+xml") {
      try {
        // Validate the buffer contains SVG
        if (!isValidSVGBuffer(fileBuffer)) {
          return NextResponse.json(
            { error: "Invalid SVG file" },
            { status: 400 }
          );
        }

        // Convert buffer to string and sanitize
        const svgContent = fileBuffer.toString("utf-8");
        const sanitizedSVG = sanitizeSVG(svgContent);

        // Convert sanitized content back to buffer
        fileBuffer = Buffer.from(sanitizedSVG, "utf-8");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "SVG sanitization failed";
        console.error("SVG sanitization error:", errorMessage);
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        );
      }
    }

    // Save file to filesystem
    const saveResult = await saveFileToStorage(filename, fileBuffer);

    if ("error" in saveResult) {
      console.error("Failed to save file:", saveResult.error);
      return NextResponse.json(
        { error: `Upload failed: ${saveResult.error}` },
        { status: 500 }
      );
    }

    // Generate URL to serve the image
    const imageUrl = `/api/images/${filename}`;

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
        key: filename,
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
