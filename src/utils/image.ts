/**
 * Image URL utilities for server-side filesystem storage
 * 
 * Images are stored in the filesystem at /app/storage/images/
 * In the database, we store the API URL path (e.g., "/api/images/uuid.jpg").
 * This utility handles URL validation and conversion.
 */

/**
 * Check if a URL is already a full HTTP/HTTPS URL.
 */
function isFullUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Convert a stored image path to a full URL if needed.
 * 
 * If the URL is already a full HTTP/HTTPS URL, it's returned as-is.
 * If it's a relative path, it's returned as-is (assumes it's already in the correct format).
 * Returns null only if the input is null, undefined, or empty.
 * 
 * @param storedPath - The path as stored in the database (e.g., "/api/images/uuid.jpg")
 * @returns The URL for the image, or null for invalid input
 * 
 * @example
 * // Already a full URL - returned as-is
 * getImageUrl("https://example.com/image.jpg")
 * // Returns: "https://example.com/image.jpg"
 * 
 * @example
 * // API path - returned as-is
 * getImageUrl("/api/images/abc123.jpg")
 * // Returns: "/api/images/abc123.jpg"
 */
export function getImageUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) {
    return null;
  }

  // Return as-is (either full URL or relative API path)
  return storedPath;
}

/**
 * Legacy function name for backward compatibility.
 * New code should use getImageUrl() instead.
 * 
 * @deprecated Use getImageUrl() instead
 */
export function getSupabaseStorageUrl(storedPath: string | null | undefined): string | null {
  return getImageUrl(storedPath);
}

/**
 * Check if an image URL is valid for display.
 * A valid URL is either a full HTTP/HTTPS URL or a relative API path.
 * 
 * @param url - The URL to validate
 * @returns true if the URL is valid for image display
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  // Check if it's a full URL
  if (isFullUrl(url)) {
    return true;
  }

  // Check if it's a valid API path
  if (url.startsWith("/api/images/")) {
    return true;
  }

  // Legacy paths that might still exist in the database
  if (url.startsWith("/") || url.startsWith("uploads/") || url.startsWith("clubs/") || url.startsWith("organizations/")) {
    return true;
  }

  return false;
}
