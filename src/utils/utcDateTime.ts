/**
 * UTC-based date and time utilities for backend logic
 * 
 * CRITICAL BACKEND RULES:
 * 1. All functions in this file work EXCLUSIVELY with UTC timestamps
 * 2. NO local timezone conversions should happen in backend
 * 3. Frontend is responsible for converting club timezone to UTC before sending
 * 4. Backend is responsible for returning UTC timestamps to frontend
 * 
 * FORBIDDEN in backend:
 * - new Date("2026-01-06 10:00") without explicit UTC marker
 * - Any implicit timezone parsing
 * - Using server local timezone
 * 
 * REQUIRED in backend:
 * - All comparisons operate on UTC timestamps only
 * - All incoming datetimes are assumed to be UTC (ISO 8601 format)
 * - Validate UTC format before processing
 */

/**
 * Validates if a date string is in valid ISO 8601 UTC format
 * Accepts formats like:
 * - "2026-01-06T10:00:00.000Z"
 * - "2026-01-06T10:00:00Z"
 * - "2026-01-06T10:00:00.123Z"
 * 
 * @param dateString - Date string to validate
 * @returns true if valid UTC ISO 8601 format
 */
export function isValidUTCString(dateString: string): boolean {
  // Check if string ends with 'Z' (UTC marker)
  if (!dateString.endsWith('Z')) {
    return false;
  }
  
  // Try to parse the date
  const date = new Date(dateString);
  
  // Check if parsing was successful
  if (isNaN(date.getTime())) {
    return false;
  }
  
  // Verify the ISO string round-trips correctly
  // This catches edge cases like "2026-13-45T10:00:00Z"
  return date.toISOString() === dateString || 
         // Also accept strings without milliseconds at the end
         date.toISOString().replace(/\.\d{3}Z$/, 'Z') === dateString;
}

/**
 * Validates if a date string is in YYYY-MM-DD format
 * @param dateString - Date string to validate
 * @returns true if valid format
 */
export function isValidDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString + 'T00:00:00.000Z');
  return !isNaN(date.getTime());
}

/**
 * Validates if a time string is in HH:MM format
 * @param timeString - Time string to validate
 * @returns true if valid format
 */
export function isValidTimeString(timeString: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Creates a UTC Date object from date and time strings
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:MM format
 * @returns UTC Date object
 * @throws Error if invalid format
 */
export function createUTCDate(dateString: string, timeString: string): Date {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  if (!isValidTimeString(timeString)) {
    throw new Error(`Invalid time format: ${timeString}. Expected HH:MM`);
  }
  
  // Create UTC date by appending 'Z' to ensure UTC interpretation
  return new Date(`${dateString}T${timeString}:00.000Z`);
}

/**
 * Check if two UTC date ranges overlap
 * Uses standard interval overlap logic: (start1 < end2) AND (start2 < end1)
 * 
 * @param start1 - Start of first range (UTC)
 * @param end1 - End of first range (UTC)
 * @param start2 - Start of second range (UTC)
 * @param end2 - End of second range (UTC)
 * @returns true if ranges overlap
 */
export function doUTCRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Extract date string (YYYY-MM-DD) from a UTC Date object
 * @param date - UTC Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function getUTCDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Extract time string (HH:MM) from a UTC Date object
 * @param date - UTC Date object
 * @returns Time string in HH:MM format
 */
export function getUTCTimeString(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get start and end of day in UTC for a given date string
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Object with startOfDay and endOfDay UTC Date objects
 */
export function getUTCDayBounds(dateString: string): {
  startOfDay: Date;
  endOfDay: Date;
} {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`);
  
  return { startOfDay, endOfDay };
}

/**
 * Add minutes to a UTC date
 * @param date - UTC Date object
 * @param minutes - Number of minutes to add
 * @returns New UTC Date object
 */
export function addMinutesUTC(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Get duration in minutes between two UTC dates
 * @param start - Start UTC Date
 * @param end - End UTC Date
 * @returns Duration in minutes
 */
export function getDurationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Validates that end time is after start time
 * @param start - Start UTC Date
 * @param end - End UTC Date
 * @returns true if end > start
 */
export function isValidUTCRange(start: Date, end: Date): boolean {
  return end > start;
}

/**
 * Get current UTC timestamp
 * @returns Current UTC Date object
 */
export function getNowUTC(): Date {
  return new Date();
}

/**
 * Get today's date in YYYY-MM-DD format (UTC-based)
 * @returns Today's date string in YYYY-MM-DD format
 */
export function getTodayUTC(): string {
  return getUTCDateString(getNowUTC());
}

/**
 * Get dates starting from a given date for a specified number of days (UTC-based)
 * @param startDateString - Starting date in YYYY-MM-DD format
 * @param numDays - Number of days to generate
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDatesFromStartUTC(startDateString: string, numDays: number): string[] {
  if (!isValidDateString(startDateString)) {
    throw new Error(`Invalid date format: ${startDateString}. Expected YYYY-MM-DD`);
  }
  
  const dates: string[] = [];
  const startDate = new Date(startDateString + 'T00:00:00.000Z');
  
  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + i);
    dates.push(getUTCDateString(date));
  }
  
  return dates;
}

/**
 * Get the Monday of the week containing the given date (UTC-based)
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format representing Monday of that week
 */
export function getWeekMondayUTC(dateString: string): string {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const date = new Date(dateString + 'T00:00:00.000Z');
  const dayOfWeek = date.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return getUTCDateString(date);
}
