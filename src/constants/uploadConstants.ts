/**
 * Shared constants for file uploads (client and server)
 */

/**
 * Allowed MIME types for raster image uploads.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg", // Non-standard but used by some browsers
  "image/png",
  "image/webp",
] as const;

/**
 * Allowed MIME types for logo uploads (includes SVG).
 */
export const ALLOWED_LOGO_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "image/svg+xml",
] as const;
