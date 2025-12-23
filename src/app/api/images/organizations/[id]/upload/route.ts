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
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id;

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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
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
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Save file to storage
    const filename = await saveUploadedFile(file, "organizations", organizationId);

    // Generate URL
    const url = getUploadedImageUrl("organizations", organizationId, filename);

    // Update organization record with new image URL
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        [imageType]: url,
      },
    });

    return NextResponse.json({
      success: true,
      url,
      filename,
      type: imageType,
    });
  } catch (error) {
    console.error("Error uploading organization image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
