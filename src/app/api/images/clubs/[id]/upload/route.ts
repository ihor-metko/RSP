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
  { params }: { params: { id: string } }
) {
  try {
    const clubId = params.id;

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
    const filename = await saveUploadedFile(file, "clubs", clubId);

    // Generate URL
    const url = getUploadedImageUrl("clubs", clubId, filename);

    // Update club record with new image URL
    await prisma.club.update({
      where: { id: clubId },
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
    console.error("Error uploading club image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
