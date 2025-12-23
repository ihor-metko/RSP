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
  try {
    const bookingId = params.id;

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
    const filename = await saveUploadedFile(file, "bookings", bookingId);

    // Generate URL
    const url = getUploadedImageUrl("bookings", bookingId, filename);

    // Update booking record with new image URL
    await prisma.booking.update({
      where: { id: bookingId },
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
    console.error("Error uploading booking image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
