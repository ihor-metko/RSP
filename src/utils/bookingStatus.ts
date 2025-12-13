import type { BookingStatus, DynamicBookingStatus } from "@/types/booking";

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
  persistentStatus: BookingStatus,
  now: Date = new Date()
): BookingStatus {
  // If booking has a persistent terminal status, return it
  if (isTerminalStatus(persistentStatus)) {
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
 * Check if a status is terminal (cannot be changed by time-based logic)
 * 
 * @param status - Booking status to check
 * @returns true if status is terminal
 */
export function isTerminalStatus(status: BookingStatus): boolean {
  return status === "cancelled" || status === "no-show" || status === "completed";
}

/**
 * Check if a booking should be marked as completed (for batch processing)
 * Returns true if the booking has ended and is not already in a terminal state
 * 
 * @param end - Booking end time
 * @param persistentStatus - The current status in database
 * @param now - Current time for comparison
 * @returns true if booking should be marked as completed
 */
export function shouldMarkAsCompleted(
  end: string | Date,
  persistentStatus: BookingStatus,
  now: Date = new Date()
): boolean {
  const endTime = new Date(end).getTime();
  const currentTime = now.getTime();

  // Only mark as completed if:
  // 1. The booking has ended
  // 2. It's not already in a terminal state
  return currentTime >= endTime && !isTerminalStatus(persistentStatus);
}

/**
 * Get human-readable status label
 * 
 * @param status - Booking status
 * @returns Human-readable label
 */
export function getStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    pending: "Pending",
    paid: "Paid",
    reserved: "Reserved",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled",
    "no-show": "No-show",
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
    pending: "warning",
    paid: "success",
    reserved: "info",
    ongoing: "active",
    completed: "neutral",
    cancelled: "danger",
    "no-show": "danger",
  };
  return colorMap[status] || "neutral";
}

/**
 * Type guard to safely cast string to BookingStatus
 * 
 * @param status - Status string from database
 * @returns The status as BookingStatus type
 */
export function toBookingStatus(status: string): BookingStatus {
  const validStatuses: BookingStatus[] = [
    "pending",
    "paid",
    "reserved",
    "ongoing",
    "cancelled",
    "no-show",
    "completed",
  ];
  
  if (validStatuses.includes(status as BookingStatus)) {
    return status as BookingStatus;
  }
  
  // Default to reserved for unknown statuses
  return "reserved";
}
