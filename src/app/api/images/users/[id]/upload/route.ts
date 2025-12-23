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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const targetUserId = id;
  let formData: FormData | null = null;
  let file: File | null = null;
  
  try {
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
      console.warn(`[User Upload] Validation failed for user ${targetUserId}:`, validationError);
      
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
    console.log(`[User Upload] Saving file for user ${targetUserId}, size: ${file.size} bytes`);
    const filename = await saveUploadedFile(file, "users", targetUserId);
    console.log(`[User Upload] File saved successfully: ${filename}`);

    // Generate URL
    const url = getUploadedImageUrl("users", targetUserId, filename);

    // Update user record with new avatar URL
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        image: url,
      },
    });

    console.log(`[User Upload] Database updated successfully for user ${targetUserId}, avatar: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error(`[User Upload] Error uploading avatar for user ${targetUserId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      targetUserId,
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
