import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import { getBookingStatus } from "@/services/bookingPaymentService";

/**
 * GET /api/player/bookings/[id]/status
 *
 * Get booking status for frontend polling
 *
 * Returns:
 * - bookingId: string
 * - bookingStatus: string
 * - paymentStatus: string
 * - paymentIntentStatus: string (optional)
 * - courtName: string
 * - clubName: string
 * - startTime: string (ISO 8601)
 * - endTime: string (ISO 8601)
 * - price: number
 *
 * Security:
 * - Requires authentication
 * - Only returns status for bookings owned by the authenticated user
 */
export async function GET(
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
    const { id: bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get booking status
    const status = await getBookingStatus(bookingId, userId);

    if (!status) {
      return NextResponse.json(
        { error: "Booking not found or you don't have access to it" },
        { status: 404 }
      );
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error("[Player Booking Status] Error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
