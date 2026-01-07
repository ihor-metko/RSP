import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import {
  PaymentProvider,
  isPaymentProvider,
} from "@/types/paymentAccount";
import { resolvePaymentAccountForBooking } from "@/services/paymentAccountService";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/types/booking";

/**
 * POST /api/bookings/[id]/pay
 *
 * Initiate payment for an existing unpaid booking (reservation)
 * This endpoint is used in the quick booking flow where:
 * 1. A reservation is created first (Step 2.5)
 * 2. User selects payment provider (Step 3)
 * 3. This endpoint creates a payment intent and returns checkout URL
 *
 * Request body:
 * - paymentProvider: "WAYFORPAY" | "LIQPAY"
 *
 * Returns:
 * - checkoutUrl: string (URL to redirect player to for payment)
 * - bookingId: string (UUID)
 * - paymentIntentId: string (UUID)
 * - orderReference: string
 * - amount: number (in minor units, e.g., cents)
 * - currency: string
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const userId = authResult.userId;
    const params = await context.params;
    const bookingId = params.id;

    // Parse request body
    const body = await request.json();

    // Validate payment provider
    if (!body.paymentProvider || !isPaymentProvider(body.paymentProvider)) {
      return NextResponse.json(
        {
          error:
            "paymentProvider is required and must be a valid payment provider",
        },
        { status: 400 }
      );
    }

    const paymentProvider: PaymentProvider = body.paymentProvider;

    // Fetch the booking with related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: {
          include: {
            club: {
              select: {
                id: true,
                name: true,
                defaultCurrency: true,
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Validate booking exists
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Validate booking belongs to user
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to access this booking" },
        { status: 403 }
      );
    }

    // Validate booking is not cancelled
    if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
      return NextResponse.json(
        { error: "This booking has been cancelled" },
        { status: 400 }
      );
    }

    // Validate booking is not already paid
    if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    // Validate booking hasn't started yet
    const now = new Date();
    if (booking.start <= now) {
      return NextResponse.json(
        { error: "This booking slot has already passed" },
        { status: 400 }
      );
    }

    // Resolve payment account
    const paymentAccount = await resolvePaymentAccountForBooking(
      booking.court.clubId,
      paymentProvider
    );

    if (!paymentAccount) {
      return NextResponse.json(
        { error: "Payment is not available for this club" },
        { status: 409 }
      );
    }

    // Create PaymentIntent
    const orderReference = `booking_${booking.id}_${Date.now()}`;
    // const currency = booking.court.club.defaultCurrency || "UAH";
    const currency = "UAH";

    const paymentIntent = await prisma.paymentIntent.create({
      data: {
        bookingId: booking.id,
        paymentAccountId: paymentAccount.id,
        provider: paymentProvider,
        orderReference,
        amount: booking.price,
        currency,
        status: "pending",
      },
    });

    // Generate checkout URL based on provider
    let checkoutUrl: string;

    if (paymentProvider === PaymentProvider.WAYFORPAY) {
      checkoutUrl = await generateWayForPayCheckoutUrl(
        paymentAccount,
        orderReference,
        booking.price,
        currency,
        booking.user,
        booking.court.name,
        booking.court.club.name
      );
    } else {
      return NextResponse.json(
        { error: `Unsupported payment provider: ${paymentProvider}` },
        { status: 400 }
      );
    }

    // Return checkout URL
    return NextResponse.json(
      {
        checkoutUrl,
        bookingId: booking.id,
        paymentIntentId: paymentIntent.id,
        orderReference,
        amount: booking.price,
        currency,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Booking Payment] Error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate WayForPay checkout URL for booking payment
 */
async function generateWayForPayCheckoutUrl(
  paymentAccount: { merchantId: string; secretKey: string },
  orderReference: string,
  amountCents: number,
  currency: string,
  user: {
    name: string | null;
    email: string;
  },
  courtName: string,
  clubName: string
): Promise<string> {
  const orderDate = Math.floor(Date.now() / 1000);
  const amount = (amountCents / 100).toFixed(2); // Convert to major units
  const productName = `Court Booking - ${courtName} at ${clubName}`;
  const productCount = "1";
  const productPrice = amount;

  // Get base URL for return/callback URLs
  const baseUrl =
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Default phone number for bookings
  const DEFAULT_BOOKING_PHONE =
    process.env.DEFAULT_BOOKING_PHONE || "380000000000";

  // Parse user name
  let clientFirstName = "Player";
  let clientLastName = "User";

  if (user.name && user.name.trim()) {
    const nameParts = user.name.trim().split(/\s+/);
    clientFirstName = nameParts[0];
    clientLastName = nameParts.slice(1).join(" ") || "User";
  }

  // Generate signature
  const signatureString = [
    paymentAccount.merchantId,
    baseUrl,
    orderReference,
    orderDate,
    amount,
    currency,
    productName,
    productCount,
    productPrice,
  ].join(";");

  const signature = crypto
    .createHmac("md5", paymentAccount.secretKey)
    .update(signatureString)
    .digest("hex");

  // Create payment request
  const paymentRequest = {
    merchantAccount: paymentAccount.merchantId,
    merchantAuthType: "SimpleSignature",
    merchantDomainName: baseUrl,
    merchantTransactionSecureType: "AUTO",
    orderReference,
    orderDate,
    amount,
    currency,
    productName: [productName],
    productCount: [productCount],
    productPrice: [productPrice],
    merchantSignature: signature,
    apiVersion: 1,
    clientFirstName,
    clientLastName,
    clientEmail: user.email,
    clientPhone: DEFAULT_BOOKING_PHONE,
    returnUrl: `${baseUrl}/player/bookings?payment=return`,
    serviceUrl: `${baseUrl}/api/webhooks/wayforpay/payment`,
  };

  // Call WayForPay API
  const response = await fetch("https://api.wayforpay.com/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionType: "CREATE_INVOICE",
      ...paymentRequest,
    }),
    signal: AbortSignal.timeout(15000), // 15 second timeout for external API
  });

  if (!response.ok) {
    throw new Error(`WayForPay API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.invoiceUrl) {
    return data.invoiceUrl;
  }

  if (data.paymentURL) {
    return data.paymentURL;
  }

  console.error(
    "[WayForPay] Failed to get checkout URL. Response:",
    JSON.stringify(data)
  );

  throw new Error("Failed to generate WayForPay checkout URL. Please try again later.");
}
