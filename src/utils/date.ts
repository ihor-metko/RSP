/**
 * Centralized date formatting utilities with i18n support
 * 
 * All date formatting functions automatically detect the current locale
 * from the browser or use a default locale if not available.
 */

/**
 * Get the current locale from browser or use default
 * @returns Locale code (e.g., "en", "uk")
 */
function getCurrentLocale(): string {
  // Try to get locale from browser navigator
  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    // Map common locale codes to supported locales
    if (lang.startsWith("uk")) return "uk";
    if (lang.startsWith("en")) return "en";
  }
  // Default to English
  return "en";
}

/**
 * Convert a date parameter to a Date object
 * @param date Date string or Date object
 * @returns Date object
 */
function toDate(date: string | Date): Date {
  return typeof date === "string" ? new Date(date) : date;
}

/**
 * Format date in short format (e.g., "Apr 2" in English, "квіт 2" in Ukrainian)
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date, locale?: string): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  return d.toLocaleDateString(currentLocale, { month: "short", day: "numeric" });
}

/**
 * Format date in long format with month and year (e.g., "April 2, 2024")
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @returns Formatted date string
 */
export function formatDateLong(date: string | Date, locale?: string): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  return d.toLocaleDateString(currentLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date with weekday, month, day, and year (e.g., "Mon, Apr 2, 2024")
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @returns Formatted date string
 */
export function formatDateWithWeekday(date: string | Date, locale?: string): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  return d.toLocaleDateString(currentLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time only (e.g., "2:30 PM" in English, "14:30" in 24-hour locales)
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @param use24Hour Whether to use 24-hour format (default: true)
 * @returns Formatted time string
 */
export function formatTime(
  date: string | Date,
  locale?: string,
  use24Hour: boolean = true
): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  return d.toLocaleTimeString(currentLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

/**
 * Format date and time together (e.g., "Apr 2, 2024, 2:30 PM")
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @param use24Hour Whether to use 24-hour format (default: true)
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: string | Date,
  locale?: string,
  use24Hour: boolean = true
): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  return d.toLocaleString(currentLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

/**
 * Format date and time with full details (e.g., "Monday, April 2, 2024 at 2:30 PM")
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @param use24Hour Whether to use 24-hour format (default: true)
 * @returns Formatted date and time string
 */
export function formatDateTimeFull(
  date: string | Date,
  locale?: string,
  use24Hour: boolean = true
): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  return d.toLocaleString(currentLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

/**
 * Format relative time from now (e.g., "2 hours ago", "Just now", "in 3 days")
 * Uses Intl.RelativeTimeFormat for proper i18n support
 * @param date Date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: string | Date, locale?: string): string {
  const d = toDate(date);
  const currentLocale = locale || getCurrentLocale();
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Use Intl.RelativeTimeFormat for proper i18n
  const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: "auto" });

  // Just now (less than 1 minute)
  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(0, "second");
  }

  // Minutes
  if (Math.abs(diffMins) < 60) {
    return rtf.format(-diffMins, "minute");
  }

  // Hours
  if (Math.abs(diffHours) < 24) {
    return rtf.format(-diffHours, "hour");
  }

  // Days (up to 7 days)
  if (Math.abs(diffDays) < 7) {
    return rtf.format(-diffDays, "day");
  }

  // Fall back to date with weekday for older/distant dates
  return formatDateWithWeekday(d, currentLocale);
}

/**
 * Format a date range (e.g., "Apr 2 - Apr 9")
 * @param startDate Start date string or Date object
 * @param endDate End date string or Date object
 * @param locale Optional locale code (auto-detected if not provided)
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: string | Date,
  endDate: string | Date,
  locale?: string
): string {
  const start = toDate(startDate);
  const end = toDate(endDate);
  const currentLocale = locale || getCurrentLocale();
  
  const dateFormat = new Intl.DateTimeFormat(currentLocale, { month: "short", day: "numeric" });
  const startFormatted = dateFormat.format(start);
  const endFormatted = dateFormat.format(end);
  
  return `${startFormatted} - ${endFormatted}`;
}
