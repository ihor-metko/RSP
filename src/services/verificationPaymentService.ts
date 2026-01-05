/**
 * Verification Payment Service
 *
 * Handles real payment verification for payment accounts.
 * Creates minimal payment intents (1 UAH) to verify merchant credentials
 * through actual payment processing, not sandbox APIs.
 */

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import crypto from "crypto";
import {
  PaymentProvider,
  VerificationPaymentIntent,
  PaymentAccountVerificationLevel,
} from "@/types/paymentAccount";

const VERIFICATION_AMOUNT = 100; // 1 UAH in kopiykas (minor units)
const VERIFICATION_CURRENCY = "UAH";

// Default phone number for verification payments when user doesn't have one
// Format: Ukrainian mobile number (380 country code + 9 zeros)
// This is required by WayForPay API but not validated for verification payments
const DEFAULT_VERIFICATION_PHONE = "380000000000";

// Default client info when user name is not available
const DEFAULT_CLIENT_FIRST_NAME = "Verification";
const DEFAULT_CLIENT_LAST_NAME = "User";

/**
 * Initiate a real payment verification for a payment account
 *
 * Creates a minimal payment intent (1 UAH) and returns a WayForPay checkout URL
 * for the owner to complete the verification payment.
 *
 * @param paymentAccountId - Payment account ID to verify
 * @param initiatedBy - User ID who initiated the verification
 * @returns Verification payment intent with checkout URL
 */
export async function initiateRealPaymentVerification(
  paymentAccountId: string,
  initiatedBy: string
): Promise<VerificationPaymentIntent> {
  // Get the payment account with decrypted credentials
  const account = await prisma.paymentAccount.findUnique({
    where: { id: paymentAccountId },
  });

  if (!account) {
    throw new Error("Payment account not found");
  }

  // Get the user who initiated the verification for buyer context
  const user = await prisma.user.findUnique({
    where: { id: initiatedBy },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Decrypt credentials
  const merchantId = decrypt(account.merchantId);
  const secretKey = decrypt(account.secretKey);

  // Generate unique order reference
  const orderReference = `verify_${paymentAccountId}_${Date.now()}`;

  // Create verification payment record
  const verificationPayment = await prisma.verificationPayment.create({
    data: {
      paymentAccountId,
      orderReference,
      amount: VERIFICATION_AMOUNT,
      currency: VERIFICATION_CURRENCY,
      status: "pending",
      initiatedBy,
    },
  });

  // Generate checkout URL based on provider
  let checkoutUrl: string;

  if (account.provider === PaymentProvider.WAYFORPAY) {
    checkoutUrl = await generateWayForPayCheckoutUrl(
      merchantId,
      secretKey,
      orderReference,
      verificationPayment.id,
      user
    );
  } else {
    throw new Error(`Unsupported payment provider: ${account.provider}`);
  }

  return {
    id: verificationPayment.id,
    orderReference,
    checkoutUrl,
    amount: VERIFICATION_AMOUNT,
    currency: VERIFICATION_CURRENCY,
  };
}

/**
 * Generate WayForPay checkout URL for verification payment
 */
async function generateWayForPayCheckoutUrl(
  merchantAccount: string,
  secretKey: string,
  orderReference: string,
  verificationPaymentId: string,
  user: {
    name: string | null;
    email: string;
  }
): Promise<string> {
  const orderDate = Math.floor(Date.now() / 1000);
  const amount = (VERIFICATION_AMOUNT / 100).toString(); // Convert to major units (UAH)
  const currency = VERIFICATION_CURRENCY;
  const productName = "Payment Account Verification";
  const productCount = "1";
  const productPrice = amount;

  // Get base URL for return/callback URLs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Parse user name into first and last name components
  // If user name is not available or empty, use default verification client info
  let clientFirstName = DEFAULT_CLIENT_FIRST_NAME;
  let clientLastName = DEFAULT_CLIENT_LAST_NAME;
  
  if (user.name && user.name.trim()) {
    const nameParts = user.name.trim().split(/\s+/);
    clientFirstName = nameParts[0];
    clientLastName = nameParts.slice(1).join(" ") || DEFAULT_CLIENT_LAST_NAME;
  }

  // Generate signature for PURCHASE request
  // Signature string: merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName;productCount;productPrice
  const signatureString = [
    merchantAccount,
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
    .createHmac("md5", secretKey)
    .update(signatureString)
    .digest("hex");

  // Create the payment request
  const paymentRequest = {
    merchantAccount,
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
    // Buyer context fields using actual user data for better fraud prevention
    clientFirstName,
    clientLastName,
    clientEmail: user.email,
    clientPhone: DEFAULT_VERIFICATION_PHONE, // User model doesn't have phone field
    // Return URLs
    returnUrl: `${baseUrl}/admin/payment-accounts/verification-return?id=${verificationPaymentId}`,
    serviceUrl: `${baseUrl}/api/webhooks/wayforpay/verification`,
  };

  // Use CREATE_INVOICE transaction type to generate a payment URL/invoice
  // This is preferred for verification as it creates a hosted payment page
  // without requiring direct card details in the API call
  const response = await fetch("https://api.wayforpay.com/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transactionType: "CREATE_INVOICE",
      ...paymentRequest,
    }),
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

  // If no direct URL was provided, the API response may contain error information
  // Log the error for debugging but don't expose sensitive data in the exception
  console.error("[WayForPay] Failed to get checkout URL. API response:", {
    reasonCode: data.reasonCode,
    reason: data.reason,
  });

  throw new Error(`Failed to generate WayForPay checkout URL. Please check your merchant credentials.`);
}

/**
 * Handle verification payment callback from WayForPay
 *
 * Validates the signature and updates the payment account status
 * based on the callback result.
 *
 * @param callbackData - Callback data from WayForPay
 * @returns Processing result
 */
export async function handleVerificationCallback(
  callbackData: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const orderReference = callbackData.orderReference as string;

  if (!orderReference) {
    return { success: false, message: "Missing orderReference" };
  }

  // Find the verification payment
  const verificationPayment = await prisma.verificationPayment.findUnique({
    where: { orderReference },
    include: {
      paymentAccount: true,
    },
  });

  if (!verificationPayment) {
    return { success: false, message: "Verification payment not found" };
  }

  // Decrypt secret key for signature validation
  const secretKey = decrypt(verificationPayment.paymentAccount.secretKey);

  // Validate signature
  const isSignatureValid = validateWayForPaySignature(callbackData, secretKey);

  // Update verification payment with callback data
  await prisma.verificationPayment.update({
    where: { id: verificationPayment.id },
    data: {
      signatureValid: isSignatureValid,
      callbackData: JSON.stringify(callbackData),
      status: isSignatureValid ? "completed" : "failed",
      completedAt: new Date(),
      transactionId: callbackData.transactionId as string | undefined,
      authCode: callbackData.authCode as string | undefined,
      cardPan: callbackData.cardPan as string | undefined,
      cardType: callbackData.cardType as string | undefined,
      errorMessage: isSignatureValid ? null : "Invalid signature",
    },
  });

  // If signature is valid and payment was approved, mark account as verified
  if (isSignatureValid) {
    const transactionStatus = callbackData.transactionStatus as string;

    if (transactionStatus === "Approved") {
      await prisma.paymentAccount.update({
        where: { id: verificationPayment.paymentAccountId },
        data: {
          status: "VERIFIED",
          verificationLevel: PaymentAccountVerificationLevel.VERIFIED,
          lastRealVerifiedAt: new Date(),
          verificationError: null,
        },
      });

      console.log(`[VerificationPaymentService] Payment account ${verificationPayment.paymentAccountId} marked as VERIFIED`);

      return { success: true, message: "Payment account verified successfully" };
    } else {
      // Payment was not approved (declined, failed, etc.)
      await prisma.verificationPayment.update({
        where: { id: verificationPayment.id },
        data: {
          status: "failed",
          errorMessage: `Transaction status: ${transactionStatus}`,
        },
      });

      return { success: false, message: `Payment not approved: ${transactionStatus}` };
    }
  }

  // Signature validation failed
  await prisma.paymentAccount.update({
    where: { id: verificationPayment.paymentAccountId },
    data: {
      status: "INVALID",
      verificationError: "Verification callback signature validation failed",
    },
  });

  console.error(`[VerificationPaymentService] Invalid callback signature for account ${verificationPayment.paymentAccountId}`);

  return { success: false, message: "Invalid signature" };
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
  // For payment callback: merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
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
 * Get verification payment by ID
 *
 * @param id - Verification payment ID
 * @returns Verification payment or null
 */
export async function getVerificationPayment(id: string) {
  return prisma.verificationPayment.findUnique({
    where: { id },
    include: {
      paymentAccount: {
        select: {
          id: true,
          displayName: true,
          provider: true,
          scope: true,
          verificationLevel: true,
        },
      },
    },
  });
}

/**
 * Get verification payments for a payment account
 *
 * @param paymentAccountId - Payment account ID
 * @returns List of verification payments
 */
export async function getVerificationPaymentsByAccount(paymentAccountId: string) {
  return prisma.verificationPayment.findMany({
    where: { paymentAccountId },
    orderBy: { createdAt: "desc" },
  });
}
