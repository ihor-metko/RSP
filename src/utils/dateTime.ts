/**
 * Date and time utilities for the application
 *
 * IMPORTANT: This file contains LEGACY timezone utilities.
 * For new backend code, use @/utils/utcDateTime instead.
 *
 * These utilities use PLATFORM_TIMEZONE which is club-specific.
 * Backend should operate on UTC only.
 */

import { DEFAULT_CLUB_TIMEZONE } from "@/constants/timezone";

// Platform timezone (Europe/Kyiv)
// @deprecated Use club.timezone instead for club-specific operations
export const PLATFORM_TIMEZONE = DEFAULT_CLUB_TIMEZONE;

/**
 * Create start and end of day Date objects for a given date string in platform timezone
 * Returns UTC Date objects that represent the start and end of the day in Europe/Kyiv
 * @param dateParam Date string in YYYY-MM-DD format
 * @returns Object with startOfDay and endOfDay Date objects (in UTC)
 *
 * Example: For date "2024-01-05" in Europe/Kyiv (UTC+2):
 * - startOfDay: 2024-01-04T22:00:00.000Z (which is 2024-01-05 00:00:00 in Kyiv)
 * - endOfDay: 2024-01-05T21:59:59.999Z (which is 2024-01-05 23:59:59.999 in Kyiv)
 */
export function createDayRange(dateParam: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateParam)) {
    throw new Error(`Invalid date format: ${dateParam}. Expected YYYY-MM-DD format.`);
  }

  // Parse the date components
  const [year, month, day] = dateParam.split('-').map(Number);

  // Validate date values
  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date values in: ${dateParam}`);
  }

  // Create a date at noon on the target day to determine the timezone offset for that day
  // This handles DST transitions correctly
  const middayUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Validate that the date is valid (catches invalid dates like Feb 30)
  if (isNaN(middayUTC.getTime())) {
    throw new Error(`Invalid date: ${dateParam}`);
  }

  // Use formatToParts to reliably extract hour and minute in platform timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PLATFORM_TIMEZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(middayUTC);
  const hourPart = parts.find(p => p.type === 'hour');
  const minutePart = parts.find(p => p.type === 'minute');

  // Validate that we got the expected parts
  if (!hourPart || !minutePart) {
    throw new Error(`Failed to parse timezone offset for date ${dateParam}`);
  }

  const platformHour = parseInt(hourPart.value, 10);
  const platformMinute = parseInt(minutePart.value, 10);

  // Calculate the offset: how many hours ahead is platform timezone from UTC
  const offsetHours = platformHour - 12;
  const offsetMinutes = platformMinute;
  const offsetMs = (offsetHours * 60 + offsetMinutes) * 60 * 1000;

  // Now calculate UTC times that correspond to midnight and end-of-day in platform timezone
  // If platform is UTC+2, midnight in platform is 22:00 previous day UTC
  const startOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs);
  const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs);

  return { startOfDay: startOfDayUTC, endOfDay: endOfDayUTC };
}

/**
 * Extract date string (YYYY-MM-DD) from a Date object
 * @param date Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Validate date parameter format
 * @param dateParam Date string to validate
 * @returns true if valid YYYY-MM-DD format, false otherwise
 */
export function isValidDateFormat(dateParam: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateParam)) {
    return false;
  }
  const date = new Date(dateParam);
  return !isNaN(date.getTime());
}

/**
 * Validate time format
 * @param time Time string to validate
 * @returns true if valid HH:MM format, false otherwise
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(time)) {
    return false;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Parse opening hours string to get opening and closing hours
 * @param openingHours String in format "HH:MM-HH:MM" or "H:MM-H:MM"
 * @returns Object with opening and closing hours (0-23)
 */
export function parseOpeningHours(openingHours: string | null): {
  openingHour: number;
  closingHour: number;
} {
  const DEFAULT_OPENING = 9;
  const DEFAULT_CLOSING = 22;

  if (!openingHours) {
    return { openingHour: DEFAULT_OPENING, closingHour: DEFAULT_CLOSING };
  }

  // Match both single and double digit hours
  const match = openingHours.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
  if (!match) {
    return { openingHour: DEFAULT_OPENING, closingHour: DEFAULT_CLOSING };
  }

  const openingHour = parseInt(match[1], 10);
  const closingHour = parseInt(match[3], 10);

  // Validate hours are in reasonable range
  if (openingHour < 0 || openingHour > 23 || closingHour < 0 || closingHour > 23) {
    return { openingHour: DEFAULT_OPENING, closingHour: DEFAULT_CLOSING };
  }

  return { openingHour, closingHour };
}

/**
 * Format a Date object's time to HH:MM format
 * @param date Date object
 * @returns Time string in HH:MM format (24-hour)
 */
export function formatTimeHHMM(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Validates that startTime is before endTime
 * @param startTime Start time in HH:mm format
 * @param endTime End time in HH:mm format
 * @returns true if startTime < endTime
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  return startMinutes < endMinutes;
}

/**
 * Checks if two time ranges overlap
 * @param start1 Start time of first range in HH:mm format
 * @param end1 End time of first range in HH:mm format
 * @param start2 Start time of second range in HH:mm format
 * @param end2 End time of second range in HH:mm format
 * @returns true if the ranges overlap
 */
export function doTimesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const [s1h, s1m] = start1.split(":").map(Number);
  const [e1h, e1m] = end1.split(":").map(Number);
  const [s2h, s2m] = start2.split(":").map(Number);
  const [e2h, e2m] = end2.split(":").map(Number);

  const start1Minutes = s1h * 60 + s1m;
  const end1Minutes = e1h * 60 + e1m;
  const start2Minutes = s2h * 60 + s2m;
  const end2Minutes = e2h * 60 + e2m;

  return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
}

/**
 * Validates day of week (0-6, Sunday to Saturday)
 * @param day Value to validate
 * @returns true if valid day of week
 */
export function isValidDayOfWeek(day: unknown): day is number {
  return typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * Get today's date in the platform timezone (Europe/Kyiv)
 * This ensures consistent date calculations across the platform
 * @returns Date object representing today at midnight in the platform timezone
 */
export function getTodayInTimezone(): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PLATFORM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = formatter.format(new Date());
  return new Date(todayStr);
}

/**
 * Get today's date string in YYYY-MM-DD format using platform timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayStr(): string {
  return getDateString(getTodayInTimezone());
}

/**
 * Get dates starting from a given date for a specified number of days
 * @param startDate The starting date
 * @param numDays Number of days to generate
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDatesFromStart(startDate: Date, numDays: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
}

/**
 * Get the Monday of the week containing the given date
 * @param date The reference date
 * @returns Date object representing Monday of that week at midnight
 */
export function getWeekMonday(date: Date): Date {
  const dayOfWeek = date.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get current time in HH:MM format using platform timezone
 * @returns Current time string in HH:MM format
 */
export function getCurrentTimeInTimezone(): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: PLATFORM_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
}

/**
 * Check if a given date is today in the platform timezone
 * @param dateStr Date string in YYYY-MM-DD format
 * @param clubTimezone Optional club timezone (defaults to platform timezone)
 * @returns true if the date is today
 */
export function isToday(dateStr: string, clubTimezone?: string): boolean {
  if (clubTimezone) {
    return dateStr === getTodayInClubTimezone(clubTimezone);
  }
  return dateStr === getTodayStr();
}

/**
 * Filter time slots to exclude past times if the date is today
 * @param timeSlots Array of time strings in HH:MM format (in club local time)
 * @param dateStr Date string in YYYY-MM-DD format (in club local date)
 * @param clubTimezone Optional club timezone (defaults to platform timezone for backward compatibility)
 * @returns Filtered array of time strings
 */
export function filterPastTimeSlots(timeSlots: string[], dateStr: string, clubTimezone?: string): string[] {
  // Check if the date is today in the club's timezone
  if (!isToday(dateStr, clubTimezone)) {
    return timeSlots;
  }

  // Get current time in the club's timezone
  const currentTime = clubTimezone 
    ? getCurrentTimeInClubTimezone(clubTimezone)
    : getCurrentTimeInTimezone();
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  return timeSlots.filter((timeSlot) => {
    const [slotHour, slotMinute] = timeSlot.split(":").map(Number);
    const slotTotalMinutes = slotHour * 60 + slotMinute;
    return slotTotalMinutes > currentTotalMinutes;
  });
}

/**
 * Convert club-local date and time to UTC ISO string
 * Uses Intl.DateTimeFormat to properly handle timezone conversions and DST
 *
 * @param dateStr Date string in YYYY-MM-DD format (club local date)
 * @param timeStr Time string in HH:MM format (club local time)
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @returns UTC ISO string (e.g., "2026-01-06T08:00:00.000Z")
 *
 * @example
 * // User selects 10:00 in Kyiv timezone (UTC+2)
 * clubLocalToUTC("2026-01-06", "10:00", "Europe/Kyiv")
 * // Returns: "2026-01-06T08:00:00.000Z"
 */
export function clubLocalToUTC(
  dateStr: string,
  timeStr: string,
  clubTimezone: string
): string {
  // Parse components
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // Create a date-time string in ISO format without timezone (local interpretation)
  const localDateTimeStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

  // Create a formatter that will interpret this date in the club's timezone
  // and give us the parts as they would appear in that timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: clubTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // To find the UTC timestamp that corresponds to the local time in the club's timezone,
  // we use an iterative approach:
  // 1. Start with a guess (interpret as UTC)
  // 2. See what that time looks like in the club timezone
  // 3. Adjust and repeat until we find the right UTC time

  // Initial guess: assume the local time string is UTC
  const guessUTC = new Date(`${localDateTimeStr}Z`);

  // Check what this UTC time looks like in the club timezone
  const parts = formatter.formatToParts(guessUTC);
  const tzYear = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
  const tzMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
  const tzDay = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
  const tzHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const tzMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  // Calculate the difference
  const targetDate = new Date(year, month - 1, day, hours, minutes);
  const currentDate = new Date(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
  const diffMs = targetDate.getTime() - currentDate.getTime();

  // Adjust our guess
  const correctUTC = new Date(guessUTC.getTime() + diffMs);

  return correctUTC.toISOString();
}

/**
 * Extract UTC time in HH:MM format from a club-local date and time
 * This is a convenience function for API calls that expect UTC time as HH:MM
 *
 * @param dateStr Date string in YYYY-MM-DD format (club local date)
 * @param timeStr Time string in HH:MM format (club local time)
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @returns UTC time string in HH:MM format (e.g., "08:00")
 *
 * @example
 * // User selects 10:00 in Kyiv timezone (UTC+2)
 * clubLocalToUTCTime("2026-01-06", "10:00", "Europe/Kyiv")
 * // Returns: "08:00"
 */
export function clubLocalToUTCTime(
  dateStr: string,
  timeStr: string,
  clubTimezone: string
): string {
  const utcISOString = clubLocalToUTC(dateStr, timeStr, clubTimezone);
  const utcDate = new Date(utcISOString);
  
  const utcHours = utcDate.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = utcDate.getUTCMinutes().toString().padStart(2, '0');
  
  return `${utcHours}:${utcMinutes}`;
}

/**
 * Convert UTC ISO string to club-local time string (HH:MM format)
 *
 * @param utcISOString UTC ISO string (e.g., "2026-01-06T08:00:00.000Z")
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @returns Time string in HH:MM format in club's local timezone
 *
 * @example
 * // Convert UTC time to Kyiv timezone (UTC+2)
 * utcToClubLocalTime("2026-01-06T08:00:00.000Z", "Europe/Kyiv")
 * // Returns: "10:00"
 */
export function utcToClubLocalTime(
  utcISOString: string,
  clubTimezone: string
): string {
  const date = new Date(utcISOString);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: clubTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(date);
}

/**
 * Convert UTC ISO string to club-local date string (YYYY-MM-DD format)
 *
 * @param utcISOString UTC ISO string (e.g., "2026-01-06T22:00:00.000Z")
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @returns Date string in YYYY-MM-DD format in club's local timezone
 *
 * @example
 * // Convert UTC time to Kyiv timezone (UTC+2)
 * utcToClubLocalDate("2026-01-06T22:00:00.000Z", "Europe/Kyiv")
 * // Returns: "2026-01-07" (next day in Kyiv)
 */
export function utcToClubLocalDate(
  utcISOString: string,
  clubTimezone: string
): string {
  const date = new Date(utcISOString);

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: clubTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

/**
 * Get today's date in a specific timezone
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInClubTimezone(clubTimezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: clubTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Get current time in a specific timezone
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @returns Time string in HH:MM format
 */
export function getCurrentTimeInClubTimezone(clubTimezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: clubTimezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
}

/**
 * Get rolling 7 days starting from a given date (or today)
 * This is used for the "rolling" availability mode where the first day is always today
 * @param startDate Optional starting date (defaults to today in platform timezone)
 * @returns Array of date strings in YYYY-MM-DD format, starting from the given date
 */
export function getRolling7Days(startDate?: Date): string[] {
  const start = startDate || getTodayInTimezone();
  start.setHours(0, 0, 0, 0);
  return getDatesFromStart(start, 7);
}

/**
 * Get calendar week days (Monday to Sunday) for the week containing the given date
 * This is used for the "calendar" availability mode where days are shown in calendar week order
 * @param date Optional reference date (defaults to today in platform timezone)
 * @returns Array of date strings in YYYY-MM-DD format, from Monday to Sunday
 */
export function getCalendarWeekDays(date?: Date): string[] {
  const refDate = date || getTodayInTimezone();
  const monday = getWeekMonday(refDate);
  return getDatesFromStart(monday, 7);
}

/**
 * Check if a given date is in the past (before today)
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns true if the date is before today
 */
export function isPastDay(dateStr: string): boolean {
  const todayStr = getTodayStr();
  return dateStr < todayStr;
}

/**
 * Convert time-of-day from club local to UTC using a reference date
 * This is useful for recurring time patterns (like business hours)
 * 
 * @param timeStr Time string in HH:MM format (club local time)
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @param referenceDate Optional reference date for DST calculation (defaults to today)
 * @returns UTC time string in HH:MM format
 * 
 * @example
 * // Convert 10:00 Kyiv time to UTC (assuming UTC+2)
 * timeOfDayToUTC("10:00", "Europe/Kyiv")
 * // Returns: "08:00"
 */
export function timeOfDayToUTC(
  timeStr: string,
  clubTimezone: string,
  referenceDate?: string
): string {
  const refDate = referenceDate || getTodayInClubTimezone(clubTimezone);
  return clubLocalToUTCTime(refDate, timeStr, clubTimezone);
}

/**
 * Convert time-of-day from UTC to club local using a reference date
 * This is useful for displaying recurring time patterns (like business hours)
 * 
 * @param timeStr Time string in HH:MM format (UTC time)
 * @param clubTimezone IANA timezone string (e.g., "Europe/Kyiv")
 * @param referenceDate Optional reference date for DST calculation (defaults to today)
 * @returns Club local time string in HH:MM format
 * 
 * @example
 * // Convert 08:00 UTC to Kyiv time (assuming UTC+2)
 * timeOfDayFromUTC("08:00", "Europe/Kyiv")
 * // Returns: "10:00"
 */
export function timeOfDayFromUTC(
  timeStr: string,
  clubTimezone: string,
  referenceDate?: string
): string {
  const refDate = referenceDate || getTodayInClubTimezone(clubTimezone);
  // Create a UTC ISO string for the reference date and time
  const [hours, minutes] = timeStr.split(':').map(Number);
  const [year, month, day] = refDate.split('-').map(Number);
  
  // Create a UTC date
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  
  return utcToClubLocalTime(utcDate.toISOString(), clubTimezone);
}
