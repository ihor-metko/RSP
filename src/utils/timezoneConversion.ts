/**
 * Frontend timezone conversion utilities
 * 
 * IMPORTANT FRONTEND RULES:
 * 1. Frontend works with club local time for user input/display
 * 2. Frontend MUST convert to UTC before sending to backend
 * 3. Frontend MUST convert from UTC when displaying backend data
 * 4. Use club.timezone for all conversions (IANA format)
 * 
 * This file uses date-fns-tz for DST-safe timezone conversions.
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { getClubTimezone } from '@/constants/timezone';

/**
 * Convert a local datetime (in club timezone) to UTC
 * This is used when SENDING data to the backend
 * 
 * @param localDateTime - Date object representing time in club's local timezone
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns UTC Date object
 * 
 * @example
 * // User selects "2026-01-06 10:00" in Kyiv (UTC+2)
 * const localDate = new Date(2026, 0, 6, 10, 0, 0);
 * const utcDate = convertLocalToUTC(localDate, "Europe/Kyiv");
 * // Result: 2026-01-06T08:00:00.000Z
 */
export function convertLocalToUTC(
  localDateTime: Date,
  clubTimezone: string | null | undefined
): Date {
  const timezone = getClubTimezone(clubTimezone);
  return fromZonedTime(localDateTime, timezone);
}

/**
 * Convert a UTC datetime to local time (in club timezone)
 * This is used when RECEIVING data from the backend for DISPLAY
 * 
 * @param utcDateTime - UTC Date object from backend
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns Date object representing time in club's local timezone
 * 
 * @example
 * // Backend returns "2026-01-06T08:00:00.000Z"
 * const utcDate = new Date("2026-01-06T08:00:00.000Z");
 * const localDate = convertUTCToLocal(utcDate, "Europe/Kyiv");
 * // Result: Date representing 10:00 in Kyiv timezone
 */
export function convertUTCToLocal(
  utcDateTime: Date,
  clubTimezone: string | null | undefined
): Date {
  const timezone = getClubTimezone(clubTimezone);
  return toZonedTime(utcDateTime, timezone);
}

/**
 * Convert local date and time strings (in club timezone) to UTC ISO string
 * This is the PRIMARY function for frontend → backend conversion
 * 
 * @param dateString - Date in YYYY-MM-DD format (club local date)
 * @param timeString - Time in HH:MM format (club local time)
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns UTC ISO string (e.g., "2026-01-06T08:00:00.000Z")
 * 
 * @example
 * // User selects January 6, 2026 at 10:00 in Kyiv
 * const utcISO = convertLocalDateTimeToUTC("2026-01-06", "10:00", "Europe/Kyiv");
 * // Result: "2026-01-06T08:00:00.000Z"
 */
export function convertLocalDateTimeToUTC(
  dateString: string,
  timeString: string,
  clubTimezone: string | null | undefined
): string {
  const timezone = getClubTimezone(clubTimezone);
  
  // Parse date and time components
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a date object that represents the local time in the club's timezone
  // IMPORTANT: We create a "naive" date object first (no timezone info)
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  // Convert to UTC using the club's timezone
  const utcDate = fromZonedTime(localDate, timezone);
  
  // Return as ISO string with 'Z' suffix
  return utcDate.toISOString();
}

/**
 * Format a UTC date to local time string for display
 * 
 * @param utcDateTime - UTC Date object or ISO string from backend
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @param formatPattern - Format pattern (default: "yyyy-MM-dd HH:mm")
 * @returns Formatted string in club's local time
 * 
 * @example
 * // Backend returns "2026-01-06T08:00:00.000Z"
 * const formatted = formatUTCToLocal("2026-01-06T08:00:00.000Z", "Europe/Kyiv");
 * // Result: "2026-01-06 10:00"
 */
export function formatUTCToLocal(
  utcDateTime: Date | string,
  clubTimezone: string | null | undefined,
  formatPattern: string = 'yyyy-MM-dd HH:mm'
): string {
  const timezone = getClubTimezone(clubTimezone);
  const utcDate = typeof utcDateTime === 'string' ? new Date(utcDateTime) : utcDateTime;
  
  // Convert UTC to zoned time first
  const zonedDate = toZonedTime(utcDate, timezone);
  
  // Then format the zoned date
  return format(zonedDate, formatPattern);
}

/**
 * Extract date string (YYYY-MM-DD) in club local timezone from UTC datetime
 * 
 * @param utcDateTime - UTC Date object or ISO string from backend
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns Date string in YYYY-MM-DD format (club local date)
 * 
 * @example
 * // Backend returns "2026-01-06T22:00:00.000Z" (which is Jan 7 00:00 in Kyiv UTC+2)
 * const localDate = getLocalDateString("2026-01-06T22:00:00.000Z", "Europe/Kyiv");
 * // Result: "2026-01-07"
 */
export function getLocalDateString(
  utcDateTime: Date | string,
  clubTimezone: string | null | undefined
): string {
  return formatUTCToLocal(utcDateTime, clubTimezone, 'yyyy-MM-dd');
}

/**
 * Extract time string (HH:MM) in club local timezone from UTC datetime
 * 
 * @param utcDateTime - UTC Date object or ISO string from backend
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns Time string in HH:MM format (club local time)
 * 
 * @example
 * // Backend returns "2026-01-06T08:00:00.000Z"
 * const localTime = getLocalTimeString("2026-01-06T08:00:00.000Z", "Europe/Kyiv");
 * // Result: "10:00"
 */
export function getLocalTimeString(
  utcDateTime: Date | string,
  clubTimezone: string | null | undefined
): string {
  return formatUTCToLocal(utcDateTime, clubTimezone, 'HH:mm');
}

/**
 * Check if a date is in DST (Daylight Saving Time) for a given timezone
 * Useful for debugging and displaying timezone information
 * 
 * @param date - Date to check
 * @param timezone - IANA timezone (e.g., "Europe/Kyiv")
 * @returns true if date is in DST period
 */
export function isDST(date: Date, timezone: string): boolean {
  // Get the offset in January (standard time) and July (DST if applicable)
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  
  // Convert to zoned times to get the local representation
  const janZoned = toZonedTime(jan, timezone);
  const julZoned = toZonedTime(jul, timezone);
  const currentZoned = toZonedTime(date, timezone);
  
  // Get UTC offset by comparing UTC and zoned times
  const janOffset = janZoned.getTime() - jan.getTime();
  const julOffset = julZoned.getTime() - jul.getTime();
  const currentOffset = currentZoned.getTime() - date.getTime();
  
  // If offsets differ, DST is observed; check which period we're in
  if (janOffset !== julOffset) {
    return currentOffset === julOffset;
  }
  
  return false;
}

/**
 * Get current time in club's timezone
 * Useful for validation (e.g., preventing booking in the past)
 * 
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns Date object representing current time in club's timezone
 */
export function getCurrentTimeInClubTimezone(
  clubTimezone: string | null | undefined
): Date {
  const timezone = getClubTimezone(clubTimezone);
  return toZonedTime(new Date(), timezone);
}

/**
 * Get today's date string in club's timezone
 * 
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns Date string in YYYY-MM-DD format (club local date)
 */
export function getTodayInClubTimezone(
  clubTimezone: string | null | undefined
): string {
  const timezone = getClubTimezone(clubTimezone);
  return format(new Date(), 'yyyy-MM-dd', { timeZone: timezone });
}
