import { SportType } from "@/constants/sports";

/**
 * Booking status - represents the state of the reservation
 * - UPCOMING: Booking is confirmed and scheduled for the future
 * - Cancelled: Booking has been cancelled
 * - Completed: Booking has been completed
 * - No-show: User did not show up for the booking
 * - Confirmed: Booking is confirmed and awaiting payment
 */
export type BookingStatus = "UPCOMING" | "Cancelled" | "Completed" | "No-show" | "Confirmed";

/**
 * Payment status - represents the financial state of the booking
 * - Paid: Payment has been completed
 * - Unpaid: Payment has not been made
 * - Refunded: Payment has been fully refunded
 */
export type PaymentStatus = "Paid" | "Unpaid" | "Refunded";

/**
 * Payment status constants
 */
export const PAYMENT_STATUS = {
  PAID: "Paid" as const,
  UNPAID: "Unpaid" as const,
  REFUNDED: "Refunded" as const,
} as const;

/**
 * Booking status constants
 */
export const BOOKING_STATUS = {
  UPCOMING: "UPCOMING" as const,
  CANCELLED: "Cancelled" as const,
  COMPLETED: "Completed" as const,
  NO_SHOW: "No-show" as const,
  CONFIRMED: "Confirmed" as const,
} as const;

/**
 * Reservation expiration time in milliseconds (5 minutes)
 */
export const RESERVATION_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Legacy status types (for backward compatibility during migration)
 */
export type LegacyBookingStatus = "pending" | "paid" | "cancelled" | "reserved" | "no-show" | "completed" | "ongoing";

/**
 * Legacy status constants (for backward compatibility)
 */
export const LEGACY_STATUS = {
  PENDING: "pending" as const,
  PAID: "paid" as const,
  CANCELLED: "cancelled" as const,
  RESERVED: "reserved" as const,
  NO_SHOW: "no-show" as const,
  COMPLETED: "completed" as const,
  ONGOING: "ongoing" as const,
} as const;

/**
 * Dynamic booking status types (calculated on the fly)
 * - reserved: booking exists but now < startAt
 * - ongoing: startAt <= now < endAt
 * - completed: now >= endAt
 */
export type DynamicBookingStatus = "reserved" | "ongoing" | "completed";

/**
 * Basic booking type
 */
export interface Booking {
  id: string;
  userId: string;
  courtId: string;
  coachId: string | null;
  start: string;
  end: string;
  price: number;
  sportType: SportType;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentId: string | null;
  createdAt: string;
}

/**
 * Booking with user and court information for display
 */
export interface BookingWithDetails extends Booking {
  userName: string | null;
  userEmail: string;
  courtName: string;
  clubId: string;
  clubName: string;
}

/**
 * Booking for operations calendar view
 */
export interface OperationsBooking {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  courtId: string;
  courtName: string;
  start: string;
  end: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  price: number;
  sportType: SportType;
  coachId: string | null;
  coachName: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request payload for creating a booking
 */
export interface CreateBookingPayload {
  userId: string;
  courtId: string;
  startTime: string;
  endTime: string;
  clubId?: string;
  coachId?: string;
}

/**
 * Response from creating a booking
 */
export interface CreateBookingResponse {
  bookingId: string;
  courtId: string;
  courtName: string;
  clubName: string;
  userName: string | null;
  userEmail: string;
  startTime: string;
  endTime: string;
  price: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
}

/**
 * Request payload for updating a booking
 */
export interface UpdateBookingPayload {
  bookingStatus?: BookingStatus;
  paymentStatus?: PaymentStatus;
}
