import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import {
  validateUploadedFile,
  saveUploadedFile,
  getUploadedImageUrl,
} from "@/lib/fileUpload";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/images/bookings/:id/upload
 *
 * Upload an image for a booking.
 * Only the booking owner or admins can upload images.
 *
 * @param id - Booking ID
 * @body file - The image file to upload
 *
 * @returns JSON with the uploaded image URL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bookingId = params.id;
  let formData: FormData | null = null;
  let file: File | null = null;
  
  try {
    // Check authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { userId, isRoot } = authResult;

    // Verify booking exists and check ownership
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { 
        id: true, 
        userId: true,
        image: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Users can only upload images for their own bookings unless they are root admin
    if (!isRoot && booking.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
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
      console.warn(`[Booking Upload] Validation failed for booking ${bookingId}:`, validationError);
      
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
    console.log(`[Booking Upload] Saving file for booking ${bookingId}, size: ${file.size} bytes`);
    const filename = await saveUploadedFile(file, "bookings", bookingId);
    console.log(`[Booking Upload] File saved successfully: ${filename}`);

    // Generate URL
    const url = getUploadedImageUrl("bookings", bookingId, filename);

    // Update booking record with new image URL
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        image: url,
      },
    });

    console.log(`[Booking Upload] Database updated successfully for booking ${bookingId}, image: ${url}`);

    return NextResponse.json({
      success: true,
      url,
      filename,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error(`[Booking Upload] Error uploading image for booking ${bookingId}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      bookingId,
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
