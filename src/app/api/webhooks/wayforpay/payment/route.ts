import { NextResponse } from "next/server";
import { handleBookingPaymentCallback } from "@/services/bookingPaymentService";

/**
 * POST /api/webhooks/wayforpay/payment
 *
 * WayForPay callback endpoint for booking payments.
 * This endpoint is called by WayForPay after a booking payment is processed.
 * It validates the signature and updates the payment intent and booking status.
 *
 * Access: Public (called by WayForPay)
 *
 * Security:
 * - Signature validation is performed to ensure the callback is authentic
 * - Idempotent handling to prevent double-confirmation
 * - All validation happens on the backend
 */
export async function POST(request: Request) {
  try {
    // Parse the callback data
    const callbackData = await request.json();

    console.log("[WayForPay Payment Callback] Received callback:", {
      orderReference: callbackData.orderReference,
      transactionStatus: callbackData.transactionStatus,
      merchantAccount: callbackData.merchantAccount,
    });

    // Handle the booking payment callback
    const result = await handleBookingPaymentCallback(callbackData);

    if (result.success) {
      console.log("[WayForPay Payment Callback] Success:", result.message);

      // WayForPay expects a specific response format
      return NextResponse.json({
        orderReference: callbackData.orderReference,
        status: "accept",
        time: Math.floor(Date.now() / 1000),
      });
    } else {
      console.error("[WayForPay Payment Callback] Failed:", result.message);

      // Return appropriate error status for genuine failures
      // but accept already-processed payments to prevent retries
      if (result.message.includes("already processed")) {
        return NextResponse.json({
          orderReference: callbackData.orderReference,
          status: "accept",
          time: Math.floor(Date.now() / 1000),
        });
      }

      // For validation failures, return decline to signal the error
      return NextResponse.json({
        orderReference: callbackData.orderReference,
        status: "decline",
        time: Math.floor(Date.now() / 1000),
      });
    }
  } catch (error) {
    console.error(
      "[WayForPay Payment Callback] Error processing callback:",
      error
    );

    // Return a 200 response even on error to prevent WayForPay from retrying
    // The error is logged and can be investigated
    return NextResponse.json({
      status: "accept",
      time: Math.floor(Date.now() / 1000),
    });
  }
}
