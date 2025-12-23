import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { MembershipRole } from "@/constants/roles";
import {
  validateUploadedFile,
  saveUploadedFile,
  getUploadedImageUrl,
} from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/images/organizations/:id/upload
 *
 * Upload an image for an organization.
 * Only organization admins and root admins can upload images.
 *
 * @param id - Organization ID
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
  const organizationId = id;
  let formData: FormData | null = null;
  let file: File | null = null;
  
  try {
    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check authorization
    const authResult = await requireOrganizationAdmin(organizationId, [
      MembershipRole.ORGANIZATION_ADMIN,
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
    if (!imageType || !["logo", "heroImage"].includes(imageType)) {
      return NextResponse.json(
        { error: "Invalid image type. Must be 'logo' or 'heroImage'" },
        { status: 400 }
      );
    }

    // Validate file
    const validationError = validateUploadedFile(file);
    if (validationError) {
      console.warn(`[Organization Upload] Validation failed for org ${organizationId}:`, validationError);
      
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
    console.log(`[Organization Upload] Saving file for org ${organizationId}, type: ${imageType}, size: ${file.size} bytes`);
    const filename = await saveUploadedFile(file, "organizations", organizationId);
    console.log(`[Organization Upload] File saved successfully: ${filename}`);

    // Generate URL
    const url = getUploadedImageUrl("organizations", organizationId, filename);

    // Update organization record with new image URL
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        [imageType]: url,
      },
    });

    console.log(`[Organization Upload] Database updated successfully for org ${organizationId}, ${imageType}: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      filename,
      type: imageType,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error(`[Organization Upload] Error uploading image for org ${organizationId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      organizationId,
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
      
      // Return the actual error message for debugging (in development)
      // In production, you might want to return a generic message
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
