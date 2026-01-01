/**
 * Booking formatting utility functions
 * Shared utilities for formatting booking data across the application
 */

/**
 * Format date to display format
 * @param isoString - ISO date string
 * @returns Formatted date string
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Calculate duration in minutes between two dates
 * @param start - Start date (ISO string or Date)
 * @param end - End date (ISO string or Date)
 * @returns Duration in minutes
 */
export function calculateDuration(start: string | Date, end: string | Date): number {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Math.round((endTime - startTime) / (1000 * 60));
}

/**
 * Get user initials from name for avatar display
 * @param name - User's full name
 * @param email - User's email (fallback for initial)
 * @returns Initials string (1-2 characters)
 */
export function getInitials(name: string | null | undefined, email: string | null): string {
  const getEmailInitial = () => {
    return email && email.length > 0 ? email.charAt(0).toUpperCase() : "?";
  };

  if (!name) {
    return getEmailInitial();
  }
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) {
    return getEmailInitial();
  }
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
