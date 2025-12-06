/**
 * Date and time utilities for the application
 */

/**
 * Create start and end of day Date objects for a given date string
 * @param dateParam Date string in YYYY-MM-DD format
 * @returns Object with startOfDay and endOfDay Date objects
 */
export function createDayRange(dateParam: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const startOfDay = new Date(dateParam);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dateParam);
  endOfDay.setHours(23, 59, 59, 999);
  return { startOfDay, endOfDay };
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

// Platform timezone (Europe/Kyiv)
export const PLATFORM_TIMEZONE = "Europe/Kyiv";

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
  return getTodayInTimezone().toISOString().split("T")[0];
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
