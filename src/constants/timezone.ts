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

/**
 * Common IANA timezones for club selection
 * Organized by region for better UX
 */
export const COMMON_TIMEZONES = [
  // UTC
  { value: "UTC", label: "UTC (Coordinated Universal Time)", region: "UTC" },
  
  // Europe
  { value: "Europe/London", label: "Europe/London (GMT/BST)", region: "Europe" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)", region: "Europe" },
  { value: "Europe/Berlin", label: "Europe/Berlin (CET/CEST)", region: "Europe" },
  { value: "Europe/Madrid", label: "Europe/Madrid (CET/CEST)", region: "Europe" },
  { value: "Europe/Rome", label: "Europe/Rome (CET/CEST)", region: "Europe" },
  { value: "Europe/Warsaw", label: "Europe/Warsaw (CET/CEST)", region: "Europe" },
  { value: "Europe/Kyiv", label: "Europe/Kyiv (EET/EEST)", region: "Europe" },
  { value: "Europe/Athens", label: "Europe/Athens (EET/EEST)", region: "Europe" },
  { value: "Europe/Bucharest", label: "Europe/Bucharest (EET/EEST)", region: "Europe" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (EET/EEST)", region: "Europe" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (TRT)", region: "Europe" },
  { value: "Europe/Moscow", label: "Europe/Moscow (MSK)", region: "Europe" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (CET/CEST)", region: "Europe" },
  { value: "Europe/Brussels", label: "Europe/Brussels (CET/CEST)", region: "Europe" },
  { value: "Europe/Vienna", label: "Europe/Vienna (CET/CEST)", region: "Europe" },
  { value: "Europe/Prague", label: "Europe/Prague (CET/CEST)", region: "Europe" },
  { value: "Europe/Stockholm", label: "Europe/Stockholm (CET/CEST)", region: "Europe" },
  { value: "Europe/Copenhagen", label: "Europe/Copenhagen (CET/CEST)", region: "Europe" },
  { value: "Europe/Oslo", label: "Europe/Oslo (CET/CEST)", region: "Europe" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (WET/WEST)", region: "Europe" },
  { value: "Europe/Dublin", label: "Europe/Dublin (GMT/IST)", region: "Europe" },
  { value: "Europe/Zurich", label: "Europe/Zurich (CET/CEST)", region: "Europe" },
  
  // North America
  { value: "America/New_York", label: "America/New York (EST/EDT)", region: "North America" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)", region: "North America" },
  { value: "America/Denver", label: "America/Denver (MST/MDT)", region: "North America" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST/PDT)", region: "North America" },
  { value: "America/Phoenix", label: "America/Phoenix (MST)", region: "North America" },
  { value: "America/Toronto", label: "America/Toronto (EST/EDT)", region: "North America" },
  { value: "America/Vancouver", label: "America/Vancouver (PST/PDT)", region: "North America" },
  { value: "America/Mexico_City", label: "America/Mexico City (CST/CDT)", region: "North America" },
  { value: "America/Anchorage", label: "America/Anchorage (AKST/AKDT)", region: "North America" },
  
  // South America
  { value: "America/Sao_Paulo", label: "America/São Paulo (BRT/BRST)", region: "South America" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Buenos Aires (ART)", region: "South America" },
  { value: "America/Bogota", label: "America/Bogotá (COT)", region: "South America" },
  { value: "America/Santiago", label: "America/Santiago (CLT/CLST)", region: "South America" },
  { value: "America/Lima", label: "America/Lima (PET)", region: "South America" },
  
  // Asia
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)", region: "Asia" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)", region: "Asia" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (ICT)", region: "Asia" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (HKT)", region: "Asia" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (CST)", region: "Asia" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)", region: "Asia" },
  { value: "Asia/Seoul", label: "Asia/Seoul (KST)", region: "Asia" },
  { value: "Asia/Taipei", label: "Asia/Taipei (CST)", region: "Asia" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)", region: "Asia" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (AST)", region: "Asia" },
  { value: "Asia/Tehran", label: "Asia/Tehran (IRST/IRDT)", region: "Asia" },
  { value: "Asia/Jerusalem", label: "Asia/Jerusalem (IST/IDT)", region: "Asia" },
  
  // Australia & Pacific
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT/AEST)", region: "Australia & Pacific" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (AEDT/AEST)", region: "Australia & Pacific" },
  { value: "Australia/Brisbane", label: "Australia/Brisbane (AEST)", region: "Australia & Pacific" },
  { value: "Australia/Perth", label: "Australia/Perth (AWST)", region: "Australia & Pacific" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (NZDT/NZST)", region: "Australia & Pacific" },
  { value: "Pacific/Fiji", label: "Pacific/Fiji (FJT)", region: "Australia & Pacific" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (HST)", region: "Australia & Pacific" },
  
  // Africa
  { value: "Africa/Cairo", label: "Africa/Cairo (EET)", region: "Africa" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST)", region: "Africa" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT)", region: "Africa" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT)", region: "Africa" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (WET/WEST)", region: "Africa" },
] as const;
