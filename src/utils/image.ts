/**
 * Supabase Storage image URL utilities
 * 
 * Images are stored in Supabase Storage in the "uploads" bucket.
 * In the database, we store only the relative file path (e.g., "clubs/uuid.jpg").
 * This utility converts stored paths to full Supabase Storage public URLs.
 */

/**
 * Get the Supabase project URL from environment variables.
 * Falls back to empty string if not configured.
 */
function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

/**
 * The name of the Supabase Storage bucket where images are stored.
 */
const STORAGE_BUCKET = "uploads";

/**
 * Path prefixes that indicate a valid storage path.
 */
const VALID_PATH_PREFIXES = ["/", "uploads/", "clubs/", "organizations/"] as const;

/**
 * Check if a URL is already a full HTTP/HTTPS URL.
 * 
 * Note: HTTP URLs are accepted to support legacy data and local development.
 * In production, images should use HTTPS for security.
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
 * Extract the file path from a stored path that may have the /uploads/ prefix.
 * 
 * @param storedPath - The path as stored in the database (e.g., "/uploads/clubs/uuid.jpg" or "clubs/uuid.jpg")
 * @returns The clean file path without the leading /uploads/ prefix
 */
function extractFilePath(storedPath: string): string {
  // Remove leading slash if present
  let path = storedPath.startsWith("/") ? storedPath.slice(1) : storedPath;
  
  // Remove "uploads/" prefix if present (since we specify bucket separately)
  if (path.startsWith(`${STORAGE_BUCKET}/`)) {
    path = path.slice(`${STORAGE_BUCKET}/`.length);
  }
  
  return path;
}

/**
 * Convert a stored image path to a full Supabase Storage public URL.
 * 
 * If the URL is already a full HTTP/HTTPS URL, it's returned as-is.
 * If NEXT_PUBLIC_SUPABASE_URL is not configured, returns the original path.
 * Returns null only if the input is null, undefined, or empty.
 * 
 * @param storedPath - The path as stored in the database (e.g., "/uploads/clubs/uuid.jpg")
 * @returns Full public URL for the image, or the original path if conversion not possible, or null for invalid input
 * 
 * @example
 * // With NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"
 * getSupabaseStorageUrl("/uploads/clubs/abc.jpg")
 * // Returns: "https://xyz.supabase.co/storage/v1/object/public/uploads/clubs/abc.jpg"
 * 
 * @example
 * // Already a full URL - returned as-is
 * getSupabaseStorageUrl("https://example.com/image.jpg")
 * // Returns: "https://example.com/image.jpg"
 */
export function getSupabaseStorageUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) {
    return null;
  }

  // If it's already a full URL, return as-is
  if (isFullUrl(storedPath)) {
    return storedPath;
  }

  const supabaseUrl = getSupabaseUrl();
  
  // If Supabase URL is not configured, return the original path
  // This allows the app to work in development without Supabase
  if (!supabaseUrl) {
    return storedPath;
  }

  const filePath = extractFilePath(storedPath);
  
  // Construct the Supabase Storage public URL
  // Format: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${filePath}`;
}

/**
 * Check if an image URL is valid for display.
 * A valid URL is either a full HTTP/HTTPS URL or can be converted to one.
 * 
 * @param url - The URL to validate
 * @returns true if the URL is valid for image display
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  // Check if it's already a full URL
  if (isFullUrl(url)) {
    return true;
  }

  // Check if we have Supabase URL configured for path-based URLs
  const supabaseUrl = getSupabaseUrl();
  if (supabaseUrl && VALID_PATH_PREFIXES.some(prefix => url.startsWith(prefix))) {
    return true;
  }

  // In development without Supabase, allow relative paths
  if (!supabaseUrl && url.startsWith("/")) {
    return true;
  }

  return false;
}
