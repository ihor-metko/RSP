/**
 * Image URL utilities for image display.
 * 
 * These utilities handle image URL validation and conversion.
 * The actual storage implementation should be handled separately by the backend.
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
 * Convert a stored image path to a URL for display.
 * 
 * If the URL is already a full HTTP/HTTPS URL, it's returned as-is.
 * If it's a relative path, it's returned as-is.
 * Returns null only if the input is null, undefined, or empty.
 * 
 * @param storedPath - The path as stored in the database
 * @returns The URL for the image, or null for invalid input
 * 
 * @example
 * // Already a full URL - returned as-is
 * getImageUrl("https://example.com/image.jpg")
 * // Returns: "https://example.com/image.jpg"
 * 
 * @example
 * // Relative path - returned as-is
 * getImageUrl("/images/abc123.jpg")
 * // Returns: "/images/abc123.jpg"
 */
export function getImageUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) {
    return null;
  }

  // Return as-is (either full URL or relative path)
  return storedPath;
}

/**
 * Legacy function name for backward compatibility.
 * New code should use getImageUrl() instead.
 * 
 * @deprecated Use getImageUrl() instead. This function is kept only for backward compatibility
 * and will be removed in a future version. All Supabase storage references have been migrated
 * to server-side storage.
 */
export function getSupabaseStorageUrl(storedPath: string | null | undefined): string | null {
  return getImageUrl(storedPath);
}

/**
 * Check if an image URL is valid for display.
 * A valid URL is either a full HTTP/HTTPS URL or a relative path.
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

  // Check if it's a relative path (starting with /)
  if (url.startsWith("/")) {
    return true;
  }

  // Legacy relative paths without leading slash
  if (url.startsWith("uploads/") || url.startsWith("clubs/") || url.startsWith("organizations/")) {
    return true;
  }

  return false;
}
