import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import { initiatePlayerBookingPayment } from "@/services/bookingPaymentService";
import {
  PlayerBookingPaymentRequest,
  PlayerBookingPaymentResponse,
} from "@/types/paymentIntent";
import { isPaymentProvider } from "@/types/paymentAccount";

/**
 * POST /api/player/bookings/pay
 *
 * Initiate a player booking payment
 *
 * Request body:
 * - clubId: string (UUID)
 * - courtId: string (UUID)
 * - startAt: string (ISO 8601 timestamp)
 * - endAt: string (ISO 8601 timestamp)
 * - paymentProvider: "WAYFORPAY" | "LIQPAY"
 *
 * Returns:
 * - checkoutUrl: string (URL to redirect player to for payment)
 * - bookingId: string (UUID)
 * - paymentIntentId: string (UUID)
 * - orderReference: string
 * - amount: number (in minor units, e.g., cents)
 * - currency: string
 *
 * Security:
 * - paymentAccountId is NOT accepted from frontend
 * - Backend resolves payment account automatically
 * - Only verified payment accounts are used
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const userId = authResult.userId;

    // Parse request body
    const body = (await request.json()) as PlayerBookingPaymentRequest;

    // Validate required fields
    if (!body.clubId || typeof body.clubId !== "string") {
      return NextResponse.json(
        { error: "clubId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.courtId || typeof body.courtId !== "string") {
      return NextResponse.json(
        { error: "courtId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.startAt || typeof body.startAt !== "string") {
      return NextResponse.json(
        { error: "startAt is required and must be an ISO 8601 timestamp" },
        { status: 400 }
      );
    }

    if (!body.endAt || typeof body.endAt !== "string") {
      return NextResponse.json(
        { error: "endAt is required and must be an ISO 8601 timestamp" },
        { status: 400 }
      );
    }

    if (!body.paymentProvider || !isPaymentProvider(body.paymentProvider)) {
      return NextResponse.json(
        {
          error:
            "paymentProvider is required and must be a valid payment provider (WAYFORPAY or LIQPAY)",
        },
        { status: 400 }
      );
    }

    // Reject if paymentAccountId is provided (security measure)
    if ("paymentAccountId" in body) {
      return NextResponse.json(
        {
          error:
            "paymentAccountId cannot be provided - it is resolved automatically by the backend",
        },
        { status: 400 }
      );
    }

    // Initiate payment
    const paymentResponse: PlayerBookingPaymentResponse =
      await initiatePlayerBookingPayment(
        userId,
        body.clubId,
        body.courtId,
        body.startAt,
        body.endAt,
        body.paymentProvider
      );

    return NextResponse.json(paymentResponse, { status: 200 });
  } catch (error) {
    console.error("[Player Booking Payment] Error:", error);

    if (error instanceof Error) {
      // Return specific error messages for known issues
      if (
        error.message.includes("not available") ||
        error.message.includes("not found") ||
        error.message.includes("Payment is not available")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }

      if (
        error.message.includes("Invalid") ||
        error.message.includes("Cannot book")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
