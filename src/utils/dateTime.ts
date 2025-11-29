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
