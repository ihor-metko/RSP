import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";

// Valid booking statuses that can be updated via API
const ALLOWED_STATUSES = ["reserved", "paid", "cancelled", "confirmed", "completed", "no-show"];

/**
 * PATCH /api/bookings/[id]
 * 
 * Update a booking (e.g., cancel it)
 * Only the booking owner can update their own bookings
 * 
 * Body:
 * - status: string - New status for the booking (must be one of ALLOWED_STATUSES)
 * 
 * Returns:
 * - Updated booking information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const userId = authResult.userId;
    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { error: "status is required" },
        { status: 400 }
      );
    }

    // Validate status value
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if booking exists and belongs to the user
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (existingBooking.userId !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to update this booking" },
        { status: 403 }
      );
    }

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: body.status,
      },
      include: {
        court: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: updatedBooking.id,
        status: updatedBooking.status,
        courtId: updatedBooking.courtId,
        start: updatedBooking.start.toISOString(),
        end: updatedBooking.end.toISOString(),
        price: updatedBooking.price,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
