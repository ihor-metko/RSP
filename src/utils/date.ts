/**
 * Centralized date formatting utilities with i18n support
 * 
 * All date formatting functions accept a locale parameter to ensure
 * consistent formatting across the application with proper localization.
 */

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
 * @param locale Locale code (e.g., "en", "uk")
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date, locale: string): string {
  const d = toDate(date);
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

/**
 * Format date in long format with month and year (e.g., "April 2, 2024")
 * @param date Date string or Date object
 * @param locale Locale code (e.g., "en", "uk")
 * @returns Formatted date string
 */
export function formatDateLong(date: string | Date, locale: string): string {
  const d = toDate(date);
  return d.toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date with weekday, month, day, and year (e.g., "Mon, Apr 2, 2024")
 * @param date Date string or Date object
 * @param locale Locale code (e.g., "en", "uk")
 * @returns Formatted date string
 */
export function formatDateWithWeekday(date: string | Date, locale: string): string {
  const d = toDate(date);
  return d.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time only (e.g., "2:30 PM" in English, "14:30" in 24-hour locales)
 * @param date Date string or Date object
 * @param locale Locale code (e.g., "en", "uk")
 * @param use24Hour Whether to use 24-hour format (default: true)
 * @returns Formatted time string
 */
export function formatTime(
  date: string | Date,
  locale: string,
  use24Hour: boolean = true
): string {
  const d = toDate(date);
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

/**
 * Format date and time together (e.g., "Apr 2, 2024, 2:30 PM")
 * @param date Date string or Date object
 * @param locale Locale code (e.g., "en", "uk")
 * @param use24Hour Whether to use 24-hour format (default: true)
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: string | Date,
  locale: string,
  use24Hour: boolean = true
): string {
  const d = toDate(date);
  return d.toLocaleString(locale, {
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
 * @param locale Locale code (e.g., "en", "uk")
 * @param use24Hour Whether to use 24-hour format (default: true)
 * @returns Formatted date and time string
 */
export function formatDateTimeFull(
  date: string | Date,
  locale: string,
  use24Hour: boolean = true
): string {
  const d = toDate(date);
  return d.toLocaleString(locale, {
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
 * Format relative time from now (e.g., "2h ago", "Just now", "in 3 days")
 * @param date Date string or Date object
 * @param locale Locale code (e.g., "en", "uk")
 * @returns Formatted relative time string
 */
export function formatRelativeTime(date: string | Date, locale: string): string {
  const d = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Just now (less than 1 minute)
  if (diffMins < 1 && diffMins >= 0) {
    return locale === "uk" ? "Щойно" : "Just now";
  }

  // Minutes ago
  if (diffMins < 60 && diffMins >= 0) {
    return locale === "uk" ? `${diffMins}хв тому` : `${diffMins}m ago`;
  }

  // Hours ago
  if (diffHours < 24 && diffHours >= 0) {
    return locale === "uk" ? `${diffHours}г тому` : `${diffHours}h ago`;
  }

  // Days ago
  if (diffDays < 7 && diffDays >= 0) {
    return locale === "uk" ? `${diffDays}д тому` : `${diffDays}d ago`;
  }

  // Future dates (in X time)
  if (diffMs < 0) {
    const absDiffMins = Math.abs(diffMins);
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffMins < 60) {
      return locale === "uk" ? `через ${absDiffMins}хв` : `in ${absDiffMins}m`;
    }
    if (absDiffHours < 24) {
      return locale === "uk" ? `через ${absDiffHours}г` : `in ${absDiffHours}h`;
    }
    if (absDiffDays < 7) {
      return locale === "uk" ? `через ${absDiffDays}д` : `in ${absDiffDays}d`;
    }
  }

  // Fall back to date with weekday for older/future dates
  return formatDateWithWeekday(d, locale);
}

/**
 * Format a date range (e.g., "Apr 2 - Apr 9")
 * @param startDate Start date string or Date object
 * @param endDate End date string or Date object
 * @param locale Locale code (e.g., "en", "uk")
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: string | Date,
  endDate: string | Date,
  locale: string
): string {
  const start = toDate(startDate);
  const end = toDate(endDate);
  
  const dateFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const startFormatted = dateFormat.format(start);
  const endFormatted = dateFormat.format(end);
  
  return `${startFormatted} - ${endFormatted}`;
}
