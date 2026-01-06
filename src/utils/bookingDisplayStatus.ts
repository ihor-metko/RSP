import type { BookingStatus, PaymentStatus } from "@/types/booking";

/**
 * Get the display status for a booking from the player's perspective
 * Combines booking and payment status into a single, user-friendly string
 * 
 * @param bookingStatus - The booking status
 * @param paymentStatus - The payment status
 * @returns User-friendly display string for the player
 * 
 * @example
 * getPlayerBookingDisplayStatus("Confirmed", "Unpaid") // "Confirmed, awaiting payment"
 * getPlayerBookingDisplayStatus("UPCOMING", "Paid") // "Booked"
 * getPlayerBookingDisplayStatus("Cancelled", "Paid") // "Cancelled"
 * getPlayerBookingDisplayStatus("Completed", "Paid") // "Completed"
 * getPlayerBookingDisplayStatus("Completed", "Unpaid") // "Missed / Not paid"
 */
export function getPlayerBookingDisplayStatus(
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): string {
  // Cancelled with refunded
  if (bookingStatus === "Cancelled" && paymentStatus === "Refunded") {
    return "Cancelled (Refunded)";
  }

  // Terminal statuses take precedence
  if (bookingStatus === "Cancelled") {
    return "Cancelled";
  }

  if (bookingStatus === "No-show") {
    return "No-show";
  }

  // Confirmed with unpaid -> awaiting payment
  if (bookingStatus === "Confirmed" && paymentStatus === "Unpaid") {
    return "Confirmed, awaiting payment";
  }

  // Confirmed with paid -> just confirmed (unusual case)
  if (bookingStatus === "Confirmed" && paymentStatus === "Paid") {
    return "Confirmed";
  }

  // UPCOMING with paid -> Booked
  if (bookingStatus === "UPCOMING" && paymentStatus === "Paid") {
    return "Booked";
  }

  // UPCOMING with unpaid -> Reserved, payment pending
  if (bookingStatus === "UPCOMING" && paymentStatus === "Unpaid") {
    return "Reserved, payment pending";
  }

  // Completed with paid -> Completed
  if (bookingStatus === "Completed" && paymentStatus === "Paid") {
    return "Completed";
  }

  // Completed with unpaid -> Missed / Not paid
  if (bookingStatus === "Completed" && paymentStatus === "Unpaid") {
    return "Missed / Not paid";
  }

  // Refunded cases
  if (paymentStatus === "Refunded") {
    return "Refunded";
  }

  // Default fallback - show both statuses
  return `${bookingStatus} - ${paymentStatus}`;
}

/**
 * Get the display status for a booking from the admin's perspective
 * Combines booking and payment status into a single, clear string
 * 
 * @param bookingStatus - The booking status
 * @param paymentStatus - The payment status
 * @returns Clear display string for the admin
 * 
 * @example
 * getAdminBookingDisplayStatus("Confirmed", "Unpaid") // "Reserved, pending payment"
 * getAdminBookingDisplayStatus("UPCOMING", "Paid") // "Paid"
 * getAdminBookingDisplayStatus("Cancelled", "Paid") // "Cancelled"
 * getAdminBookingDisplayStatus("Completed", "Paid") // "Completed"
 * getAdminBookingDisplayStatus("Completed", "Unpaid") // "Missed / Not paid"
 */
export function getAdminBookingDisplayStatus(
  bookingStatus: BookingStatus,
  paymentStatus: PaymentStatus
): string {
  // Terminal statuses take precedence
  if (bookingStatus === "Cancelled") {
    if (paymentStatus === "Refunded") {
      return "Cancelled (Refunded)";
    }
    return "Cancelled";
  }

  if (bookingStatus === "No-show") {
    return "No-show";
  }

  // Confirmed with unpaid -> Reserved, pending payment
  if (bookingStatus === "Confirmed" && paymentStatus === "Unpaid") {
    return "Reserved, pending payment";
  }

  // Confirmed with paid -> Reserved (paid)
  if (bookingStatus === "Confirmed" && paymentStatus === "Paid") {
    return "Reserved (paid)";
  }

  // UPCOMING with paid -> Paid
  if (bookingStatus === "UPCOMING" && paymentStatus === "Paid") {
    return "Paid";
  }

  // UPCOMING with unpaid -> Reserved, pending payment
  if (bookingStatus === "UPCOMING" && paymentStatus === "Unpaid") {
    return "Reserved, pending payment";
  }

  // Completed with paid -> Completed
  if (bookingStatus === "Completed" && paymentStatus === "Paid") {
    return "Completed";
  }

  // Completed with unpaid -> Missed / Not paid
  if (bookingStatus === "Completed" && paymentStatus === "Unpaid") {
    return "Missed / Not paid";
  }

  // Refunded cases
  if (paymentStatus === "Refunded") {
    return `${bookingStatus} (Refunded)`;
  }

  // Default fallback - show both statuses
  return `${bookingStatus} - ${paymentStatus}`;
}
