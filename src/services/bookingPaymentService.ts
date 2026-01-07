/**
 * Booking Payment Service
 *
 * Handles player-side booking payment flow.
 * Creates payment intents, generates checkout URLs, and processes callbacks.
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import crypto from "crypto";
import {
  PaymentProvider,
  ResolvedPaymentAccount,
} from "@/types/paymentAccount";
import {
  PlayerBookingPaymentResponse,
  PaymentIntentStatus,
} from "@/types/paymentIntent";
import { resolvePaymentAccountForBooking } from "./paymentAccountService";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/types/booking";

/**
 * Initiate a player booking payment
 *
 * 1. Validates booking availability
 * 2. Resolves payment account (club-level → organization-level)
 * 3. Creates PaymentIntent entity
 * 4. Generates checkout URL
 * 5. Returns checkout URL to frontend
 *
 * @param userId - User ID initiating the payment
 * @param clubId - Club ID for the booking
 * @param courtId - Court ID for the booking
 * @param startAt - Booking start time (ISO 8601)
 * @param endAt - Booking end time (ISO 8601)
 * @param paymentProvider - Payment provider (e.g., WAYFORPAY)
 * @returns Payment response with checkout URL
 */
export async function initiatePlayerBookingPayment(
  userId: string,
  clubId: string,
  courtId: string,
  startAt: string,
  endAt: string,
  paymentProvider: PaymentProvider
): Promise<PlayerBookingPaymentResponse> {
  // Step 1: Parse and validate dates
  const startTime = new Date(startAt);
  const endTime = new Date(endAt);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error("Invalid date format");
  }

  if (startTime >= endTime) {
    throw new Error("Start time must be before end time");
  }

  // Compare with current time using UTC to avoid timezone issues
  const now = new Date();
  if (startTime <= now) {
    throw new Error("Cannot book in the past");
  }

  // Step 2: Validate court exists and belongs to the club
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          defaultCurrency: true,
        },
      },
    },
  });

  if (!court) {
    throw new Error("Court not found");
  }

  if (court.clubId !== clubId) {
    throw new Error("Court does not belong to the specified club");
  }

  // Step 3: Check booking availability (no overlapping bookings)
  const overlappingBooking = await prisma.booking.findFirst({
    where: {
      courtId,
      OR: [
        {
          start: { lt: endTime },
          end: { gt: startTime },
        },
      ],
      bookingStatus: {
        notIn: [BOOKING_STATUS.CANCELLED],
      },
    },
  });

  if (overlappingBooking) {
    throw new Error("Time slot is not available");
  }

  // Step 4: Calculate price (use court's default price for now - can be enhanced with pricing rules)
  const priceCents = court.defaultPriceCents;

  // Step 5: Resolve payment account
  const paymentAccount = await resolvePaymentAccountForBooking(
    clubId,
    paymentProvider
  );

  if (!paymentAccount) {
    throw new Error("Payment is not available for this club");
  }

  // Step 6: Create booking with Confirmed status and Unpaid payment status
  const booking = await prisma.booking.create({
    data: {
      userId,
      courtId,
      start: startTime,
      end: endTime,
      price: priceCents,
      sportType: court.sportType,
      status: "pending", // Legacy field
      bookingStatus: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.UNPAID,
    },
  });

  // Step 7: Create PaymentIntent
  const orderReference = `booking_${booking.id}_${Date.now()}`;
  const currency = "UAH";

  const paymentIntent = await prisma.paymentIntent.create({
    data: {
      bookingId: booking.id,
      paymentAccountId: paymentAccount.id,
      provider: paymentProvider,
      orderReference,
      amount: priceCents,
      currency,
      status: "pending",
    },
  });

  // Step 8: Generate checkout URL based on provider
  let checkoutUrl: string;

  if (paymentProvider === PaymentProvider.WAYFORPAY) {
    // Get user for buyer context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    checkoutUrl = await generateWayForPayCheckoutUrl(
      paymentAccount,
      orderReference,
      priceCents,
      currency,
      user,
      court.name,
      court.club.name
    );
  } else {
    throw new Error(`Unsupported payment provider: ${paymentProvider}`);
  }

  // Step 9: Return checkout URL
  return {
    checkoutUrl,
    bookingId: booking.id,
    paymentIntentId: paymentIntent.id,
    orderReference,
    amount: priceCents,
    currency,
  };
}

/**
 * Generate WayForPay checkout URL for booking payment
 */
async function generateWayForPayCheckoutUrl(
  paymentAccount: ResolvedPaymentAccount,
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
  // Use APP_URL (server-only) if available, fallback to NEXT_PUBLIC_APP_URL
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Default phone number for bookings when user doesn't have one
  // This could be made configurable via club settings in the future
  const DEFAULT_BOOKING_PHONE = process.env.DEFAULT_BOOKING_PHONE || "380000000000";

  // Parse user name into first and last name components
  let clientFirstName = "Player";
  let clientLastName = "User";

  if (user.name && user.name.trim()) {
    const nameParts = user.name.trim().split(/\s+/);
    clientFirstName = nameParts[0];
    clientLastName = nameParts.slice(1).join(" ") || "User";
  }

  // Generate signature for PURCHASE request
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

  // Create the payment request
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
    // Buyer context fields
    clientFirstName,
    clientLastName,
    clientEmail: user.email,
    clientPhone: DEFAULT_BOOKING_PHONE,
    // Return URLs
    returnUrl: `${baseUrl}/player/bookings?payment=return`,
    serviceUrl: `${baseUrl}/api/webhooks/wayforpay/payment`,
  };

  // Use CREATE_INVOICE transaction type to generate a payment URL
  const response = await fetch("https://api.wayforpay.com/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionType: "CREATE_INVOICE",
      ...paymentRequest,
    }),
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`WayForPay API error: ${response.status}`);
  }

  const data = await response.json();

  // Check if we got an invoice URL
  if (data.invoiceUrl) {
    return data.invoiceUrl;
  }

  if (data.paymentURL) {
    return data.paymentURL;
  }

  // If no direct URL was provided, log error and throw
  console.error("[WayForPay] Failed to get checkout URL. Reason code:", data.reasonCode || "N/A");

  throw new Error(
    `Failed to generate WayForPay checkout URL. Please try again later.`
  );
}

/**
 * Handle booking payment callback from payment provider
 *
 * Validates the signature and updates the payment intent and booking status
 * based on the callback result. This function is idempotent.
 *
 * @param callbackData - Callback data from payment provider
 * @returns Processing result
 */
export async function handleBookingPaymentCallback(
  callbackData: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const orderReference = callbackData.orderReference as string;

  if (!orderReference) {
    return { success: false, message: "Missing orderReference" };
  }

  // Find the payment intent
  const paymentIntent = await prisma.paymentIntent.findUnique({
    where: { orderReference },
    include: {
      paymentAccount: true,
      booking: {
        include: {
          court: {
            include: {
              club: true,
            },
          },
        },
      },
    },
  });

  if (!paymentIntent) {
    return { success: false, message: "Payment intent not found" };
  }

  // Idempotency check: if already processed, return success
  if (paymentIntent.status === "paid" || paymentIntent.status === "failed") {
    console.log(
      `[BookingPaymentService] Payment intent ${paymentIntent.id} already processed with status: ${paymentIntent.status}`
    );
    return {
      success: paymentIntent.status === "paid",
      message: `Payment already processed as ${paymentIntent.status}`,
    };
  }

  // Decrypt secret key for signature validation
  const secretKey = decrypt(paymentIntent.paymentAccount.secretKey);

  // Validate signature based on provider
  let isSignatureValid = false;
  if (paymentIntent.provider === PaymentProvider.WAYFORPAY) {
    isSignatureValid = validateWayForPaySignature(callbackData, secretKey);
  }

  // Update payment intent with callback data
  const transactionStatus = callbackData.transactionStatus as string;
  const isPaymentApproved =
    isSignatureValid && transactionStatus === "Approved";

  await prisma.paymentIntent.update({
    where: { id: paymentIntent.id },
    data: {
      signatureValid: isSignatureValid,
      callbackData: JSON.stringify(callbackData),
      status: isPaymentApproved
        ? "paid"
        : isSignatureValid
          ? "failed"
          : "failed",
      completedAt: new Date(),
      transactionId: callbackData.transactionId as string | undefined,
      authCode: callbackData.authCode as string | undefined,
      cardPan: callbackData.cardPan as string | undefined,
      cardType: callbackData.cardType as string | undefined,
      errorMessage: !isSignatureValid
        ? "Invalid signature"
        : !isPaymentApproved
          ? `Transaction status: ${transactionStatus}`
          : null,
    },
  });

  // If signature is valid and payment was approved, update booking
  if (isPaymentApproved) {
    await prisma.booking.update({
      where: { id: paymentIntent.bookingId },
      data: {
        status: "paid", // Legacy field
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PAID,
        paymentId: paymentIntent.id,
      },
    });

    console.log(
      `[BookingPaymentService] Booking ${paymentIntent.bookingId} marked as PAID`
    );

    return { success: true, message: "Booking payment confirmed successfully" };
  } else if (isSignatureValid) {
    // Payment was not approved (declined, failed, etc.)
    await prisma.booking.update({
      where: { id: paymentIntent.bookingId },
      data: {
        status: "cancelled", // Legacy field
        bookingStatus: BOOKING_STATUS.CANCELLED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
      },
    });

    return {
      success: false,
      message: `Payment not approved: ${transactionStatus}`,
    };
  } else {
    // Signature validation failed
    await prisma.booking.update({
      where: { id: paymentIntent.bookingId },
      data: {
        status: "cancelled", // Legacy field
        bookingStatus: BOOKING_STATUS.CANCELLED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
      },
    });

    console.error(
      `[BookingPaymentService] Invalid callback signature for payment intent ${paymentIntent.id}`
    );

    return { success: false, message: "Invalid signature" };
  }
}

/**
 * Validate WayForPay callback signature
 *
 * @param callbackData - Callback data from WayForPay
 * @param secretKey - Merchant secret key
 * @returns True if signature is valid
 */
function validateWayForPaySignature(
  callbackData: Record<string, unknown>,
  secretKey: string
): boolean {
  const merchantSignature = callbackData.merchantSignature as string;

  if (!merchantSignature) {
    return false;
  }

  // Build signature string according to WayForPay docs
  const signatureFields = [
    callbackData.merchantAccount,
    callbackData.orderReference,
    callbackData.amount,
    callbackData.currency,
    callbackData.authCode || "",
    callbackData.cardPan || "",
    callbackData.transactionStatus,
    callbackData.reasonCode || "",
  ];

  const signatureString = signatureFields.join(";");

  const expectedSignature = crypto
    .createHmac("md5", secretKey)
    .update(signatureString)
    .digest("hex");

  return expectedSignature === merchantSignature;
}

/**
 * Get booking status for frontend polling
 *
 * @param bookingId - Booking ID
 * @param userId - User ID (for authorization)
 * @returns Booking status response
 */
export async function getBookingStatus(bookingId: string, userId: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId, // Ensure user owns this booking
    },
    include: {
      court: {
        include: {
          club: true,
        },
      },
      paymentIntents: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!booking) {
    return null;
  }

  return {
    bookingId: booking.id,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    paymentIntentStatus: booking.paymentIntents[0]?.status as
      | PaymentIntentStatus
      | undefined,
    courtName: booking.court.name,
    clubName: booking.court.club.name,
    startTime: booking.start.toISOString(),
    endTime: booking.end.toISOString(),
    price: booking.price,
  };
}
