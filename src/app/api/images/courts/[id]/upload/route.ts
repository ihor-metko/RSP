import { NextRequest, NextResponse } from "next/server";
import { requireAnyAdmin } from "@/lib/requireRole";
import {
  validateUploadedFile,
  saveUploadedFile,
  getUploadedImageUrl,
} from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/images/courts/:id/upload
 *
 * Upload an image for a court.
 * Only admins with appropriate permissions can upload images.
 *
 * @param id - Court ID
 * @body file - The image file to upload
 * @body type - Image type: "heroImage" (banner)
 *
 * @returns JSON with the uploaded image URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const courtId = id;
  let formData: FormData | null = null;
  let file: File | null = null;
  
  try {
    // Check authorization
    const authResult = await requireAnyAdmin(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Verify court exists and get club info for authorization
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: { 
        id: true,
        clubId: true,
        club: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!court) {
      return NextResponse.json(
        { error: "Court not found" },
        { status: 404 }
      );
    }

    // Check if admin has permission to upload images for this court
    if (authResult.adminType === "organization_admin") {
      // Organization admin can only access courts in their organization's clubs
      if (!authResult.managedIds.includes(court.club.organizationId || "")) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    } else if (authResult.adminType === "club_admin") {
      // Club admin can only access courts in their managed clubs
      if (!authResult.managedIds.includes(court.clubId)) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    }
    // Root admin can access all courts

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

    // Validate image type parameter (courts only support banner/heroImage, no logo)
    if (!imageType || imageType !== "heroImage") {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'heroImage'" },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateUploadedFile(file);
    if (validationError) {
      console.warn(`[Court Upload] Validation failed for court ${courtId}:`, validationError);
      
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
    console.log(`[Court Upload] Saving file for court ${courtId}, type: ${imageType}, size: ${file.size} bytes`);
    const filename = await saveUploadedFile(file, "courts", courtId);
    console.log(`[Court Upload] File saved successfully: ${filename}`);

    // Generate URL
    const url = getUploadedImageUrl("courts", courtId, filename);

    // Update court record with new banner image URL
    const existingCourt = await prisma.court.findUnique({
      where: { id: courtId },
      select: { bannerData: true },
    });

    let existingData: Record<string, unknown> = {};
    if (existingCourt?.bannerData) {
      try {
        existingData = JSON.parse(existingCourt.bannerData);
      } catch {
        // Invalid JSON in database - start fresh
        existingData = {};
      }
    }

    const imageData = {
      ...existingData,
      url,
    };

    await prisma.court.update({
      where: { id: courtId },
      data: {
        bannerData: JSON.stringify(imageData),
      },
    });

    console.log(`[Court Upload] Database updated successfully for court ${courtId}, ${imageType}: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      filename,
      type: imageType,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error(`[Court Upload] Error uploading image for court ${courtId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      courtId,
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
