import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import {
  validateUploadedFile,
  saveUploadedFile,
  getUploadedImageUrl,
} from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/images/users/:id/upload
 *
 * Upload an avatar image for a user.
 * Users can only upload images for themselves, unless they are root admin.
 *
 * @param id - User ID
 * @body file - The image file to upload
 *
 * @returns JSON with the uploaded image URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const targetUserId = params.id;

    // Check authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { userId, isRoot } = authResult;

    // Users can only upload their own avatar unless they are root admin
    if (!isRoot && userId !== targetUserId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
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
    const filename = await saveUploadedFile(file, "users", targetUserId);

    // Generate URL
    const url = getUploadedImageUrl("users", targetUserId, filename);

    // Update user record with new avatar URL
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        image: url,
      },
    });

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    console.error("Error uploading user avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
