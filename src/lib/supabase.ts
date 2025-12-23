/**
 * Legacy Supabase utilities - kept for backward compatibility.
 * 
 * Storage functions have been moved to @/lib/fileStorage for filesystem-based storage.
 * This file maintains validation functions and constants for compatibility.
 */

/**
 * Allowed MIME types for image uploads.
 * Note: "image/jpg" is included for browser compatibility, though "image/jpeg" is the standard.
 * 
 * @deprecated Import from @/lib/fileStorage instead
 */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg", // Non-standard but used by some browsers
  "image/png",
  "image/webp",
] as const;

/**
 * Allowed MIME types for logo uploads (includes SVG).
 * SVG is only allowed for organization and club logos, not general uploads.
 * 
 * @deprecated Import from @/lib/fileStorage instead
 */
export const ALLOWED_LOGO_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES,
  "image/svg+xml",
] as const;

/**
 * Map of MIME types to file extensions.
 * Note: "image/jpg" maps to "jpg" for browser compatibility.
 * 
 * @deprecated Import from @/lib/fileStorage instead
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg", // Non-standard but used by some browsers
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Maximum file size for uploads (10MB).
 * 
 * @deprecated Import from @/lib/fileStorage instead
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Get the file extension for a MIME type.
 * 
 * @param mimeType - The MIME type
 * @returns File extension without the dot, defaults to "jpg"
 * @deprecated Import from @/lib/fileStorage instead
 */
export function getExtensionForMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] || "jpg";
}

/**
 * Get a user-friendly list of allowed file extensions.
 * 
 * @param allowedMimeTypes - Array of allowed MIME types
 */
function getAllowedExtensionsList(allowedMimeTypes: readonly string[]): string {
  const extensions = allowedMimeTypes
    .map(mimeType => MIME_TO_EXTENSION[mimeType])
    .filter((ext): ext is string => ext !== undefined);
  return Array.from(new Set(extensions)).join(", ");
}

/**
 * Validate a file for upload (raster images only, no SVG).
 * 
 * @param mimeType - The MIME type of the file
 * @param size - The size of the file in bytes
 * @returns null if valid, or error message string
 * @deprecated Import from @/lib/fileStorage instead
 */
export function validateFileForUpload(
  mimeType: string,
  size: number
): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return `Invalid file type. Allowed: ${getAllowedExtensionsList(ALLOWED_MIME_TYPES)}`;
  }

  if (size > MAX_FILE_SIZE) {
    return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  return null;
}

/**
 * Validate a file for logo upload (includes SVG support).
 * This should ONLY be used for organization and club logos.
 * 
 * @param mimeType - The MIME type of the file
 * @param size - The size of the file in bytes
 * @returns null if valid, or error message string
 * @deprecated Import from @/lib/fileStorage instead
 */
export function validateLogoFileForUpload(
  mimeType: string,
  size: number
): string | null {
  if (!ALLOWED_LOGO_MIME_TYPES.includes(mimeType as (typeof ALLOWED_LOGO_MIME_TYPES)[number])) {
    return `Invalid file type. Allowed: ${getAllowedExtensionsList(ALLOWED_LOGO_MIME_TYPES)}`;
  }

  if (size > MAX_FILE_SIZE) {
    return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  return null;
}
