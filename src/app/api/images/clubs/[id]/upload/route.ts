import { NextRequest, NextResponse } from "next/server";
import { requireClubAdmin } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";
import {
  validateUploadedFile,
  saveUploadedFile,
  getUploadedImageUrl,
} from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/images/clubs/:id/upload
 *
 * Upload an image for a club.
 * Only club admins, club owners, and root admins can upload images.
 *
 * @param id - Club ID
 * @body file - The image file to upload
 * @body type - Image type: "logo" or "heroImage"
 *
 * @returns JSON with the uploaded image URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clubId = id;
  let formData: FormData | null = null;
  let file: File | null = null;
  
  try {
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

    // Check authorization (allow both CLUB_ADMIN and CLUB_OWNER)
    const authResult = await requireClubAdmin(clubId, [
      ClubMembershipRole.CLUB_ADMIN,
      ClubMembershipRole.CLUB_OWNER,
    ]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Parse form data
    formData = await request.formData();
    file = formData.get("file") as File | null;
    const imageType = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate image type parameter
    if (!imageType || !["logo", "heroImage", "secondLogo"].includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'logo', 'heroImage', or 'secondLogo'" },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateUploadedFile(file);
    if (validationError) {
      console.warn(`[Club Upload] Validation failed for club ${clubId}:`, validationError);
      
      // Return 415 for unsupported file type
      if (validationError.includes("Invalid file type") || validationError.includes("Allowed types")) {
        return NextResponse.json(
          { error: validationError },
          { status: 415 }
        );
      }
      
      // Return 400 for other validation errors (size, empty file, etc.)
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Save file to storage
    console.log(`[Club Upload] Saving file for club ${clubId}, type: ${imageType}, size: ${file.size} bytes`);
    const filename = await saveUploadedFile(file, "clubs", clubId);
    console.log(`[Club Upload] File saved successfully: ${filename}`);

    // Generate URL
    const url = getUploadedImageUrl("clubs", clubId, filename);

    // Update club record with new image URL
    if (imageType === "secondLogo") {
      // For secondLogo, update the metadata JSON field
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { metadata: true },
      });

      let metadata: Record<string, unknown> = {};
      if (club?.metadata) {
        try {
          metadata = JSON.parse(club.metadata);
        } catch {
          // Invalid JSON, start fresh
          metadata = {};
        }
      }

      metadata.secondLogo = url;

      await prisma.club.update({
        where: { id: clubId },
        data: {
          metadata: JSON.stringify(metadata),
        },
      });
    } else {
      // For logo and heroImage, update the logoData and bannerData fields with full JSON objects
      const fieldName = imageType === "logo" ? "logoData" : "bannerData";
      
      // Get existing data to preserve any metadata
      const club = await prisma.club.findUnique({
        where: { id: clubId },
        select: { logoData: true, bannerData: true },
      });

      let existingData: Record<string, unknown> = {};
      const existingField = club?.[fieldName as keyof typeof club];
      if (existingField) {
        try {
          existingData = JSON.parse(existingField);
        } catch {
          // Invalid JSON in database - start fresh
          // This is intentional to handle corrupted data gracefully
          existingData = {};
        }
      }

      const imageData = {
        ...existingData,
        url,
      };

      await prisma.club.update({
        where: { id: clubId },
        data: {
          [fieldName]: JSON.stringify(imageData),
        },
      });
    }

    console.log(`[Club Upload] Database updated successfully for club ${clubId}, ${imageType}: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      filename,
      type: imageType,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error(`[Club Upload] Error uploading image for club ${clubId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      clubId,
      imageType: formData?.get("type"),
      fileSize: file ? file.size : "N/A",
      fileType: file ? file.type : "N/A",
    });
    
    // Return appropriate error response
    if (error instanceof Error) {
      // Check for filesystem errors
      if (error.message.includes("EACCES") || error.message.includes("permission")) {
        return NextResponse.json(
          { error: "Storage permission error. Please contact support." },
          { status: 500 }
        );
      }
      
      if (error.message.includes("ENOSPC") || error.message.includes("no space")) {
        return NextResponse.json(
          { error: "Storage space full. Please contact support." },
          { status: 500 }
        );
      }
      
      // Return the actual error message for debugging
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
