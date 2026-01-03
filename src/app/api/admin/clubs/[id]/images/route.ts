import { NextRequest, NextResponse } from "next/server";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";
import {
  validateUploadedFile,
  saveUploadedFile,
  getUploadedImageUrl,
} from "@/lib/fileUpload";

/**
 * POST /api/admin/clubs/:id/images
 *
 * Upload a gallery image for a club.
 * Only club admins, club owners, organization admins, and root admins can upload images.
 *
 * @param id - Club ID
 * @body file - The image file to upload
 *
 * @returns JSON with the uploaded image URL and key
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = await params;
  const clubId = id;
  let formData: FormData | null = null;
  let file: File | null = null;
  
  try {
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

    // Parse form data
    formData = await request.formData();
    file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateUploadedFile(file);
    if (validationError) {
      console.warn(`Club Gallery Upload - Validation failed for club ${clubId}:`, validationError);
      
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
    console.log(`Club Gallery Upload - Saving file for club ${clubId}, size: ${file.size} bytes`);
    const filename = await saveUploadedFile(file, "clubs", clubId);
    console.log(`Club Gallery Upload - File saved successfully: ${filename}`);

    // Generate URL
    const url = getUploadedImageUrl("clubs", clubId, filename);

    console.log(`Club Gallery Upload - Upload successful for club ${clubId}: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      key: filename,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error(`Club Gallery Upload - Error uploading image for club ${clubId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      clubId,
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
