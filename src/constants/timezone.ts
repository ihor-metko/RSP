/**
 * Timezone constants for the ArenaOne platform
 * 
 * CRITICAL RULES:
 * 1. All database timestamps MUST be stored in UTC
 * 2. All backend logic operates on UTC timestamps ONLY
 * 3. Each club has a timezone property
 * 4. Timezone conversion happens ONLY on the frontend
 * 5. Backend MUST reject non-UTC datetime inputs
 */

/**
 * Default timezone for all clubs
 * Used when:
 * - Creating a new club
 * - Migrating existing clubs
 * - Timezone is missing (fallback)
 * 
 * IMPORTANT: Uses IANA timezone format (e.g., "Europe/Kyiv"), NOT offset (e.g., "UTC+2")
 * This ensures proper handling of daylight saving time (DST) transitions.
 */
export const DEFAULT_CLUB_TIMEZONE = "Europe/Kyiv" as const;

/**
 * Legacy platform timezone constant
 * @deprecated Use club.timezone instead. This constant is kept for backward compatibility only.
 */
export const PLATFORM_TIMEZONE = DEFAULT_CLUB_TIMEZONE;

/**
 * Validates if a given timezone string is a valid IANA timezone
 * @param timezone - Timezone string to validate
 * @returns true if valid IANA timezone, false otherwise
 */
export function isValidIANATimezone(timezone: string): boolean {
  try {
    // Try to create an Intl.DateTimeFormat with the timezone
    // This will throw if the timezone is invalid
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get timezone for a club, with fallback to default
 * @param clubTimezone - Timezone from club record (may be null/undefined)
 * @returns Valid IANA timezone string
 */
export function getClubTimezone(clubTimezone: string | null | undefined): string {
  if (!clubTimezone) {
    return DEFAULT_CLUB_TIMEZONE;
  }
  
  // Validate the timezone
  if (!isValidIANATimezone(clubTimezone)) {
    // Note: In production, consider using a proper logging service
    // to avoid log pollution from malicious requests
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Invalid club timezone: ${clubTimezone}, falling back to default: ${DEFAULT_CLUB_TIMEZONE}`);
    }
    return DEFAULT_CLUB_TIMEZONE;
  }
  
  return clubTimezone;
}
