/**
 * Club utility functions shared between player and admin pages
 */

/**
 * Parse tags from JSON string or comma-separated string
 * @param tags - The tags string from the database
 * @returns An array of tag strings
 */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string");
    }
  } catch {
    // If not valid JSON, fall through to comma-separated parsing
  }
  return tags.split(",").map((t) => t.trim()).filter(Boolean);
}

interface CourtWithPrice {
  defaultPriceCents: number;
}

/**
 * Calculate price range from courts
 * @param courts - Array of courts with defaultPriceCents
 * @returns Object with min and max prices, or null if no courts
 */
export function getPriceRange(courts: CourtWithPrice[]): { min: number; max: number } | null {
  if (courts.length === 0) return null;
  const prices = courts.map((c) => c.defaultPriceCents);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/**
 * Safely construct Google Maps embed URL with validated coordinates
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param apiKey - Google Maps API key
 * @returns Full embed URL or null if coordinates are invalid
 */
export function getGoogleMapsEmbedUrl(
  latitude: number,
  longitude: number,
  apiKey: string | undefined
): string | null {
  // Validate latitude and longitude are valid numbers within range
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  // Use encodeURIComponent for safety and construct URL with validated coordinates
  const lat = encodeURIComponent(latitude.toString());
  const lng = encodeURIComponent(longitude.toString());
  const key = encodeURIComponent(apiKey || "");

  return `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=15`;
}
