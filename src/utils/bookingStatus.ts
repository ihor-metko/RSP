import type { BookingStatus, PaymentStatus, LegacyBookingStatus, DynamicBookingStatus } from "@/types/booking";

/**
 * Calculate the dynamic status of a booking based on current time
 *
 * Dynamic status rules:
 * - If booking is cancelled or no-show, return the persistent status
 * - Reserved: now < startAt (booking hasn't started yet)
 * - Ongoing: startAt <= now < endAt (booking is currently happening)
 * - Completed: now >= endAt (booking has finished)
 *
 * @param start - Booking start time (ISO string or Date)
 * @param end - Booking end time (ISO string or Date)
 * @param persistentStatus - The status stored in the database
 * @param now - Current time for comparison (defaults to Date.now(), useful for testing)
 * @returns The calculated display status
 */
export function calculateBookingStatus(
  start: string | Date,
  end: string | Date,
  persistentStatus: LegacyBookingStatus,
  now: Date = new Date()
): LegacyBookingStatus {
  // If booking has a persistent terminal status, return it
  if (isTerminalLegacyStatus(persistentStatus)) {
    return persistentStatus;
  }

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const currentTime = now.getTime();

  // Calculate dynamic status
  if (currentTime < startTime) {
    // Booking hasn't started yet
    return "reserved";
  } else if (currentTime >= startTime && currentTime < endTime) {
    // Booking is currently in progress
    return "ongoing";
  } else {
    // Booking has ended
    return "completed";
  }
}

/**
 * Get the dynamic status only (without considering persistent statuses)
 * Useful for determining if a booking should be marked as completed/no-show
 *
 * @param start - Booking start time
 * @param end - Booking end time
 * @param now - Current time for comparison
 * @returns The dynamic status
 */
export function getDynamicStatus(
  start: string | Date,
  end: string | Date,
  now: Date = new Date()
): DynamicBookingStatus {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const currentTime = now.getTime();

  if (currentTime < startTime) {
    return "reserved";
  } else if (currentTime >= startTime && currentTime < endTime) {
    return "ongoing";
  } else {
    return "completed";
  }
}

/**
 * Check if a legacy status is terminal (cannot be changed by time-based logic)
 *
 * @param status - Legacy booking status to check
 * @returns true if status is terminal
 */
export function isTerminalLegacyStatus(status: LegacyBookingStatus): boolean {
  return status === "cancelled" || status === "no-show" || status === "completed";
}

/**
 * Check if a status is terminal (cannot be changed by time-based logic)
 *
 * @param status - Booking status to check
 * @returns true if status is terminal
 */
export function isTerminalStatus(status: BookingStatus): boolean {
  return status === "Cancelled" || status === "No-show" || status === "Completed";
}

/**
 * Check if a booking should be marked as completed (for batch processing)
 * Returns true if the booking has ended and is not already in a terminal state
 *
 * @param end - Booking end time
 * @param persistentStatus - The current status in database (supports both legacy and new statuses)
 * @param now - Current time for comparison
 * @returns true if booking should be marked as completed
 */
export function shouldMarkAsCompleted(
  end: string | Date,
  persistentStatus: BookingStatus | LegacyBookingStatus | string,
  now: Date = new Date()
): boolean {
  const endTime = new Date(end).getTime();
  const currentTime = now.getTime();

  // Check if it's a legacy status
  const legacyStatuses: LegacyBookingStatus[] = ["pending", "paid", "reserved", "ongoing", "cancelled", "no-show", "completed"];
  if (legacyStatuses.includes(persistentStatus as LegacyBookingStatus)) {
    return currentTime >= endTime && !isTerminalLegacyStatus(persistentStatus as LegacyBookingStatus);
  }

  // Otherwise treat as new status
  return currentTime >= endTime && !isTerminalStatus(persistentStatus as BookingStatus);
}

/**
 * Check if a booking should be cancelled due to payment timeout
 * Returns true if the booking is Confirmed with Unpaid status and the reservation has expired
 *
 * @param bookingStatus - The booking status
 * @param paymentStatus - The payment status
 * @param reservationExpiresAt - When the reservation expires (null if not set)
 * @param now - Current time for comparison
 * @returns true if booking should be cancelled due to payment timeout
 */
export function shouldCancelUnpaidBooking(
  bookingStatus: BookingStatus | string,
  paymentStatus: PaymentStatus | string,
  reservationExpiresAt: string | Date | null,
  now: Date = new Date()
): boolean {
  // Only cancel if booking is Confirmed and payment is Unpaid
  if (bookingStatus !== "Confirmed" || paymentStatus !== "Unpaid") {
    return false;
  }

  // If reservationExpiresAt is not set, don't cancel (backwards compatibility)
  if (!reservationExpiresAt) {
    return false;
  }

  const expiryTime = new Date(reservationExpiresAt).getTime();
  
  // Validate date parsing
  if (isNaN(expiryTime)) {
    console.error(`[shouldCancelUnpaidBooking] Invalid reservationExpiresAt date: ${reservationExpiresAt}`);
    return false;
  }
  
  const currentTime = now.getTime();

  return currentTime >= expiryTime;
}

/**
 * Get human-readable status label
 *
 * @param status - Booking status
 * @returns Human-readable label
 */
export function getStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    "UPCOMING": "Upcoming",
    "Confirmed": "Confirmed",
    "Completed": "Completed",
    "Cancelled": "Cancelled",
    "No-show": "No-show",
  };
  return labels[status] || status;
}

/**
 * Get status color class for UI
 *
 * @param status - Booking status
 * @returns CSS class suffix for status styling
 */
export function getStatusColorClass(status: BookingStatus): string {
  const colorMap: Record<BookingStatus, string> = {
    "UPCOMING": "active",
    "Confirmed": "warning",
    "Completed": "neutral",
    "Cancelled": "danger",
    "No-show": "danger",
  };
  return colorMap[status] || "neutral";
}

/**
 * Type guard to safely cast string to LegacyBookingStatus
 * This is for backward compatibility with the old single-status system.
 *
 * @param status - Status string from database
 * @returns The status as LegacyBookingStatus type
 */
export function toBookingStatus(status: string): LegacyBookingStatus {
  const validStatuses: LegacyBookingStatus[] = [
    "pending",
    "paid",
    "reserved",
    "ongoing",
    "cancelled",
    "no-show",
    "completed",
  ];

  if (validStatuses.includes(status as LegacyBookingStatus)) {
    return status as LegacyBookingStatus;
  }

  // Default to reserved for unknown statuses
  return "reserved";
}

// ============================================================================
// NEW DUAL-STATUS SYSTEM UTILITIES
// ============================================================================

/**
 * Type guard to safely cast string to new BookingStatus
 * Includes backward compatibility for legacy status names
 *
 * @param status - Status string from database
 * @returns The status as BookingStatus type
 */
export function toNewBookingStatus(status: string): BookingStatus {
  const validStatuses: BookingStatus[] = [
    "UPCOMING",
    "Cancelled",
    "Completed",
    "No-show",
    "Confirmed",
  ];

  if (validStatuses.includes(status as BookingStatus)) {
    return status as BookingStatus;
  }

  // Backward compatibility: map old status names to new ones
  const legacyMapping: Record<string, BookingStatus> = {
    "Active": "UPCOMING",
    "Pending": "Confirmed",
  };

  if (legacyMapping[status]) {
    return legacyMapping[status];
  }

  // Default to Confirmed for unknown statuses
  return "Confirmed";
}

/**
 * Type guard to safely cast string to PaymentStatus
 *
 * @param status - Status string from database
 * @returns The status as PaymentStatus type
 */
export function toPaymentStatus(status: string): PaymentStatus {
  const validStatuses: PaymentStatus[] = [
    "Paid",
    "Unpaid",
    "Refunded",
  ];

  if (validStatuses.includes(status as PaymentStatus)) {
    return status as PaymentStatus;
  }

  // Default to Unpaid for unknown statuses
  return "Unpaid";
}

/**
 * Get human-readable label for new BookingStatus
 *
 * @param status - Booking status
 * @returns Human-readable label
 */
export function getBookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    UPCOMING: "Upcoming",
    Cancelled: "Cancelled",
    Completed: "Completed",
    "No-show": "No-show",
    Confirmed: "Confirmed",
  };
  return labels[status] || status;
}

/**
 * Get human-readable label for PaymentStatus
 *
 * @param status - Payment status
 * @returns Human-readable label
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    Paid: "Paid",
    Unpaid: "Unpaid",
    Refunded: "Refunded",
  };
  return labels[status] || status;
}

/**
 * Get status color class for new BookingStatus
 *
 * @param status - Booking status
 * @returns CSS class suffix for status styling
 */
export function getBookingStatusColorClass(status: BookingStatus): string {
  const colorMap: Record<BookingStatus, string> = {
    UPCOMING: "success",
    Cancelled: "danger",
    Completed: "neutral",
    "No-show": "danger",
    Confirmed: "warning",
  };
  return colorMap[status] || "neutral";
}

/**
 * Get status color class for PaymentStatus
 *
 * @param status - Payment status
 * @returns CSS class suffix for status styling
 */
export function getPaymentStatusColorClass(status: PaymentStatus): string {
  const colorMap: Record<PaymentStatus, string> = {
    Paid: "success",
    Unpaid: "warning",
    Refunded: "info",
  };
  return colorMap[status] || "neutral";
}

/**
 * Check if a booking status allows cancellation
 *
 * @param status - Booking status to check
 * @returns true if booking can be cancelled
 */
export function canCancelBooking(status: BookingStatus): boolean {
  return status === "UPCOMING" || status === "Confirmed";
}

/**
 * Migrate legacy status to new dual-status system
 *
 * @param legacyStatus - Old status string
 * @returns Object with bookingStatus and paymentStatus
 */
export function migrateLegacyStatus(legacyStatus: string): {
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
} {
  const mappings: Record<string, { bookingStatus: BookingStatus; paymentStatus: PaymentStatus }> = {
    paid: { bookingStatus: "UPCOMING", paymentStatus: "Paid" },
    pending: { bookingStatus: "Confirmed", paymentStatus: "Unpaid" },
    cancelled: { bookingStatus: "Cancelled", paymentStatus: "Unpaid" },
    reserved: { bookingStatus: "UPCOMING", paymentStatus: "Unpaid" },
    completed: { bookingStatus: "Completed", paymentStatus: "Paid" },
    "no-show": { bookingStatus: "No-show", paymentStatus: "Unpaid" },
    ongoing: { bookingStatus: "UPCOMING", paymentStatus: "Paid" },
    // Support for old status names (backward compatibility)
    Active: { bookingStatus: "UPCOMING", paymentStatus: "Paid" },
    Pending: { bookingStatus: "Confirmed", paymentStatus: "Unpaid" },
  };

  return mappings[legacyStatus] || { bookingStatus: "Confirmed", paymentStatus: "Unpaid" };
}
