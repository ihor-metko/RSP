/**
 * Timezone conversion utilities for frontend
 * 
 * CRITICAL FRONTEND RULES:
 * 1. User-selected dates/times are interpreted as club local time
 * 2. Data sent to backend MUST be in UTC (ISO 8601 format)
 * 3. Data received from backend (UTC) MUST be converted to club timezone for display
 * 4. Always use these utilities - NEVER use new Date() with local time strings
 * 
 * ARCHITECTURE:
 * - Backend stores and operates on UTC only
 * - Each club has a timezone property (IANA format, e.g., "Europe/Kyiv")
 * - Frontend handles all timezone conversions using club.timezone
 */

import { getClubTimezone } from "@/constants/timezone";

/**
 * Convert a date and time from club local timezone to UTC
 * 
 * @param dateString - Date in YYYY-MM-DD format (club local date)
 * @param timeString - Time in HH:MM format (club local time)
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns UTC Date object
 * 
 * @example
 * // Club in Europe/Kyiv (UTC+2 in summer), user selects "2026-01-06" at "10:00"
 * toUtcFromClubTime("2026-01-06", "10:00", "Europe/Kyiv")
 * // Returns: Date object for "2026-01-06T08:00:00.000Z" (10:00 Kyiv = 08:00 UTC)
 */
export function toUtcFromClubTime(
  dateString: string,
  timeString: string,
  clubTimezone: string | null | undefined
): Date {
  const timezone = getClubTimezone(clubTimezone);
  
  // Validate inputs
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) {
    throw new Error(`Invalid time format: ${timeString}. Expected HH:MM`);
  }
  
  // Create a date-time string in ISO 8601 format without timezone
  // This represents the LOCAL time in the club's timezone
  const localDateTimeString = `${dateString}T${timeString}:00`;
  
  // Parse the local date-time using Intl API to get UTC timestamp
  // We create a formatter for the club timezone and parse the components
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a date in the club's timezone
  // Strategy: We'll create a UTC date and adjust for the timezone offset
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // Get the offset by comparing a known UTC time with how it appears in the target timezone
  // We'll use a reference date to calculate the offset
  const refDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  // Format the reference date in the club timezone
  const parts = formatter.formatToParts(refDate);
  const getPartValue = (type: string) => parts.find(p => p.type === type)?.value || '0';
  
  const tzYear = parseInt(getPartValue('year'), 10);
  const tzMonth = parseInt(getPartValue('month'), 10);
  const tzDay = parseInt(getPartValue('day'), 10);
  const tzHour = parseInt(getPartValue('hour'), 10);
  const tzMinute = parseInt(getPartValue('minute'), 10);
  const tzSecond = parseInt(getPartValue('second'), 10);
  
  // Calculate the offset between what we wanted and what we got
  const wantedTime = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const gotTime = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond, 0);
  const offset = gotTime - wantedTime;
  
  // Apply the offset to get the correct UTC time
  return new Date(wantedTime - offset);
}

/**
 * Convert a UTC date to club local timezone
 * 
 * @param utcDate - UTC Date object or ISO string
 * @param clubTimezone - Club's IANA timezone (e.g., "Europe/Kyiv")
 * @returns Object with date and time in club timezone
 * 
 * @example
 * // Backend returns "2026-01-06T08:00:00.000Z", club is in Europe/Kyiv (UTC+2)
 * toClubTimeFromUtc(new Date("2026-01-06T08:00:00.000Z"), "Europe/Kyiv")
 * // Returns: { date: "2026-01-06", time: "10:00", dateTime: "2026-01-06T10:00:00" }
 */
export function toClubTimeFromUtc(
  utcDate: Date | string,
  clubTimezone: string | null | undefined
): {
  date: string;
  time: string;
  dateTime: string;
  hour: number;
  minute: number;
} {
  const timezone = getClubTimezone(clubTimezone);
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${utcDate}`);
  }
  
  // Use Intl.DateTimeFormat to get the date/time in the club timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const getPartValue = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  const year = getPartValue('year');
  const month = getPartValue('month');
  const day = getPartValue('day');
  let hour = getPartValue('hour');
  const minute = getPartValue('minute');
  const second = getPartValue('second');
  
  // Handle edge case: some formatters return "24" for midnight instead of "00"
  if (hour === '24') {
    hour = '00';
  }
  
  const dateString = `${year}-${month}-${day}`;
  const timeString = `${hour}:${minute}`;
  const dateTimeString = `${dateString}T${hour}:${minute}:${second}`;
  
  return {
    date: dateString,
    time: timeString,
    dateTime: dateTimeString,
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
  };
}

/**
 * Get current date in club timezone
 * 
 * @param clubTimezone - Club's IANA timezone
 * @returns Current date string in YYYY-MM-DD format in club timezone
 * 
 * @example
 * // If it's 2026-01-06 23:30 UTC and club is in Asia/Tokyo (UTC+9)
 * getCurrentDateInClubTimezone("Asia/Tokyo")
 * // Returns: "2026-01-07" (next day in Tokyo)
 */
export function getCurrentDateInClubTimezone(
  clubTimezone: string | null | undefined
): string {
  const { date } = toClubTimeFromUtc(new Date(), clubTimezone);
  return date;
}

/**
 * Get current time in club timezone
 * 
 * @param clubTimezone - Club's IANA timezone
 * @returns Current time string in HH:MM format in club timezone
 */
export function getCurrentTimeInClubTimezone(
  clubTimezone: string | null | undefined
): string {
  const { time } = toClubTimeFromUtc(new Date(), clubTimezone);
  return time;
}

/**
 * Format a UTC date for display in club timezone
 * 
 * @param utcDate - UTC Date object or ISO string
 * @param clubTimezone - Club's IANA timezone
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date/time string in club timezone
 * 
 * @example
 * formatDateInClubTimezone(
 *   "2026-01-06T08:00:00.000Z",
 *   "Europe/Kyiv",
 *   { dateStyle: 'medium', timeStyle: 'short' }
 * )
 * // Returns: "Jan 6, 2026, 10:00" (in user's locale)
 */
export function formatDateInClubTimezone(
  utcDate: Date | string,
  clubTimezone: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
  },
  locale: string = 'en-US'
): string {
  const timezone = getClubTimezone(clubTimezone);
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${utcDate}`);
  }
  
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: timezone,
  }).format(date);
}

/**
 * Create a UTC ISO string from club local date and time
 * This is the primary function to use when sending data to the backend
 * 
 * @param dateString - Date in YYYY-MM-DD format (club local date)
 * @param timeString - Time in HH:MM format (club local time)
 * @param clubTimezone - Club's IANA timezone
 * @returns ISO 8601 UTC string (e.g., "2026-01-06T08:00:00.000Z")
 * 
 * @example
 * // User selects "2026-01-06" at "10:00" in Europe/Kyiv timezone
 * toUtcISOString("2026-01-06", "10:00", "Europe/Kyiv")
 * // Returns: "2026-01-06T08:00:00.000Z"
 */
export function toUtcISOString(
  dateString: string,
  timeString: string,
  clubTimezone: string | null | undefined
): string {
  return toUtcFromClubTime(dateString, timeString, clubTimezone).toISOString();
}

/**
 * Check if a date/time in club timezone is in the past
 * 
 * @param dateString - Date in YYYY-MM-DD format (club local date)
 * @param timeString - Time in HH:MM format (club local time)
 * @param clubTimezone - Club's IANA timezone
 * @returns true if the date/time is in the past
 */
export function isInPastInClubTimezone(
  dateString: string,
  timeString: string,
  clubTimezone: string | null | undefined
): boolean {
  const selectedTime = toUtcFromClubTime(dateString, timeString, clubTimezone);
  return selectedTime.getTime() < Date.now();
}

/**
 * Check if a date in club timezone is today
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param clubTimezone - Club's IANA timezone
 * @returns true if the date is today in the club timezone
 */
export function isTodayInClubTimezone(
  dateString: string,
  clubTimezone: string | null | undefined
): boolean {
  const today = getCurrentDateInClubTimezone(clubTimezone);
  return dateString === today;
}

/**
 * Add minutes to a club local time and return new UTC date
 * Handles timezone transitions (e.g., DST changes) correctly
 * 
 * @param dateString - Date in YYYY-MM-DD format (club local date)
 * @param timeString - Time in HH:MM format (club local time)
 * @param minutes - Number of minutes to add
 * @param clubTimezone - Club's IANA timezone
 * @returns UTC Date object
 */
export function addMinutesInClubTimezone(
  dateString: string,
  timeString: string,
  minutes: number,
  clubTimezone: string | null | undefined
): Date {
  const utcDate = toUtcFromClubTime(dateString, timeString, clubTimezone);
  return new Date(utcDate.getTime() + minutes * 60 * 1000);
}
