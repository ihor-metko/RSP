/**
 * Reactive Statistics Service
 * 
 * Provides functions to reactively update statistics when bookings change.
 * This ensures real-time accurate statistics without waiting for cron jobs.
 */

import { calculateAndStoreDailyStatistics } from "./statisticsService";

/**
 * Extract unique dates affected by a booking
 * 
 * A booking may span multiple days, so we need to update statistics
 * for all affected dates.
 * 
 * @param start - Booking start time
 * @param end - Booking end time
 * @returns Array of dates (normalized to start of day)
 */
function getAffectedDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Reactively update daily statistics for a booking change
 * 
 * This function calculates affected dates and updates statistics for each.
 * It runs asynchronously and does not block the booking operation.
 * Errors are logged but do not throw to prevent blocking booking operations.
 * 
 * @param clubId - The club ID
 * @param start - Booking start time
 * @param end - Booking end time
 */
export async function updateStatisticsForBooking(
  clubId: string,
  start: Date,
  end: Date
): Promise<void> {
  try {
    const affectedDates = getAffectedDates(start, end);
    
    // Update statistics for each affected date
    const updatePromises = affectedDates.map(date =>
      calculateAndStoreDailyStatistics(clubId, date)
        .catch(error => {
          // Log error but don't throw - statistics update should not block booking
          if (process.env.NODE_ENV === "development") {
            console.error(
              `[Reactive Statistics] Failed to update statistics for club ${clubId} on ${date.toISOString()}:`,
              error
            );
          }
        })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    // Catch-all error handler - log but don't throw
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[Reactive Statistics] Error updating statistics for club ${clubId}:`,
        error
      );
    }
  }
}

/**
 * Reactively update statistics when a booking time changes
 * 
 * When a booking is updated and the time changes, we need to recalculate
 * statistics for both the old and new date ranges.
 * 
 * @param clubId - The club ID
 * @param oldStart - Old booking start time
 * @param oldEnd - Old booking end time
 * @param newStart - New booking start time
 * @param newEnd - New booking end time
 */
export async function updateStatisticsForBookingChange(
  clubId: string,
  oldStart: Date,
  oldEnd: Date,
  newStart: Date,
  newEnd: Date
): Promise<void> {
  try {
    const oldDates = getAffectedDates(oldStart, oldEnd);
    const newDates = getAffectedDates(newStart, newEnd);
    
    // Combine and deduplicate dates
    const allDates = Array.from(
      new Set([...oldDates, ...newDates].map(d => d.getTime()))
    ).map(t => new Date(t));
    
    // Update statistics for all affected dates
    const updatePromises = allDates.map(date =>
      calculateAndStoreDailyStatistics(clubId, date)
        .catch(error => {
          if (process.env.NODE_ENV === "development") {
            console.error(
              `[Reactive Statistics] Failed to update statistics for club ${clubId} on ${date.toISOString()}:`,
              error
            );
          }
        })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[Reactive Statistics] Error updating statistics for booking change in club ${clubId}:`,
        error
      );
    }
  }
}
