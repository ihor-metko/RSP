/**
 * Type definitions for Payment Intent entities
 * 
 * Payment Intents track payment processing for bookings,
 * providing idempotency, audit trail, and safe callback handling.
 */

import { PaymentProvider } from "./paymentAccount";

/**
 * Payment Intent status
 */
export type PaymentIntentStatus = "pending" | "paid" | "failed" | "cancelled";

/**
 * Core PaymentIntent entity
 */
export interface PaymentIntent {
  id: string;
  bookingId: string;
  paymentAccountId: string;
  provider: PaymentProvider;
  orderReference: string;
  amount: number;
  currency: string;
  status: PaymentIntentStatus;
  transactionId: string | null;
  authCode: string | null;
  cardPan: string | null;
  cardType: string | null;
  signatureValid: boolean | null;
  callbackData: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

/**
 * Request payload for initiating a player booking payment
 */
export interface PlayerBookingPaymentRequest {
  clubId: string;
  courtId: string;
  startAt: string; // ISO 8601 timestamp
  endAt: string; // ISO 8601 timestamp
  paymentProvider: PaymentProvider;
}

/**
 * Response from initiating a player booking payment
 */
export interface PlayerBookingPaymentResponse {
  checkoutUrl: string;
  bookingId: string;
  paymentIntentId: string;
  orderReference: string;
  amount: number;
  currency: string;
}

/**
 * Booking status response for polling
 */
export interface BookingStatusResponse {
  bookingId: string;
  bookingStatus: string;
  paymentStatus: string;
  paymentIntentStatus?: PaymentIntentStatus;
  courtName: string;
  clubName: string;
  startTime: string;
  endTime: string;
  price: number;
}
