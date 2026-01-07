/**
 * Centralized date formatting utilities with i18n support
 * 
 * This module provides consistent date formatting across the application.
 * All functions support both string and Date inputs and use the current locale
 * for proper internationalization.
 */

/**
 * Convert input to Date object
 * @param date Date string (ISO format) or Date object
 * @returns Date object
 */
function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date;
}

/**
 * Get locale string for Intl API
 * @param locale Application locale ('en' or 'uk')
 * @returns Locale string for Intl API ('en-US' or 'uk-UA')
 */
function getIntlLocale(locale: string): string {
  return locale === 'uk' ? 'uk-UA' : 'en-US';
}

/**
 * Format date in short format (e.g., "Apr 2" in English, "квіт 2" in Ukrainian)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date string
 */
export function formatDateShort(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  const month = dateObj.toLocaleDateString(intlLocale, { month: 'short' });
  const day = dateObj.getDate();
  
  return `${month} ${day}`;
}

/**
 * Format date in long format with month and year (e.g., "April 2, 2024" in English)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date string
 */
export function formatDateLong(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date with day, month, and year (e.g., "Apr 2, 2024" in English)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date string
 */
export function formatDateMedium(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleDateString(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with weekday, month, and day (e.g., "Mon, Apr 2" in English)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date string
 */
export function formatDateWithWeekday(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleDateString(intlLocale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time (e.g., "Apr 2, 2024, 14:30" in English)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleString(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format date and time with full month name
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date and time string
 */
export function formatDateTimeLong(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleString(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format time only (e.g., "14:30")
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted time string
 */
export function formatTime(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleTimeString(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format weekday name (e.g., "Monday" in English, "понеділок" in Ukrainian)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Weekday name
 */
export function formatWeekday(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleDateString(intlLocale, { weekday: 'long' });
}

/**
 * Format weekday name (short) (e.g., "Mon" in English, "пн" in Ukrainian)
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Short weekday name
 */
export function formatWeekdayShort(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleDateString(intlLocale, { weekday: 'short' });
}

/**
 * Format only date without year (e.g., "Apr 2" in English)
 * Alias for formatDateShort for backward compatibility
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date string without year
 */
export function formatDateNoYear(date: string | Date, locale: string): string {
  return formatDateShort(date, locale);
}

/**
 * Format date in simple format (e.g., "4/2/2024" in English)
 * This is useful for compact displays
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted date string
 */
export function formatDateSimple(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  const intlLocale = getIntlLocale(locale);
  
  return dateObj.toLocaleDateString(intlLocale);
}

/**
 * Format payment deadline with time and date
 * Used for displaying payment deadlines in a concise format
 * @param date Date string or Date object
 * @param locale Current application locale
 * @returns Formatted deadline string with time and date in "HH:MM DD.MM.YYYY" format
 * @example
 * formatPaymentDeadline('2026-01-07T15:30:00Z', 'en') // "15:30 07.01.2026"
 * formatPaymentDeadline('2026-01-07T15:30:00Z', 'uk') // "15:30 07.01.2026"
 * Note: Time is formatted using locale-specific conventions, but date always uses DD.MM.YYYY format
 */
export function formatPaymentDeadline(date: string | Date, locale: string): string {
  const dateObj = toDate(date);
  
  // Reuse existing formatTime function for consistency
  const time = formatTime(date, locale);
  
  // Format date in DD.MM.YYYY format
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${time} ${day}.${month}.${year}`;
}
