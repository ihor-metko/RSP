/**
 * Server-side Supabase client for storage operations.
 * 
 * Uses the service role key for server-side operations.
 * This should NEVER be exposed to the client.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSVG, isValidSVGBuffer } from "./svgSanitizer";

/**
 * The name of the Supabase Storage bucket where images are stored.
 */
export const STORAGE_BUCKET = "uploads";

/**
 * Allowed MIME types for image uploads.
 * Note: "image/jpg" is included for browser compatibility, though "image/jpeg" is the standard.
 */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg", // Non-standard but used by some browsers
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * Allowed MIME types for logo uploads (includes SVG).
 * SVG is only allowed for organization and club logos, not general uploads.
 */
export const ALLOWED_LOGO_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES,
  "image/svg+xml",
] as const;

/**
 * Map of MIME types to file extensions.
 * Note: "image/jpg" maps to "jpg" for browser compatibility.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg", // Non-standard but used by some browsers
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

/**
 * Maximum file size for uploads (5MB).
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get the server-side Supabase client using service role key.
 * Returns null if required environment variables are not configured.
 * 
 * @returns Supabase client or null if not configured
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

/**
 * Check if Supabase Storage is configured and available.
 */
export function isSupabaseStorageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Upload a file to Supabase Storage.
 * 
 * @param filePath - The path within the bucket (e.g., "clubs/uuid/filename.jpg")
 * @param fileBuffer - The file content as a Buffer
 * @param contentType - The MIME type of the file
 * @returns Object with the file path or error
 */
export async function uploadToStorage(
  filePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ path: string } | { error: string }> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error("Supabase Storage not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return { error: "Storage service not configured" };
  }

  // Normalize the file path (remove leading slashes, double slashes)
  const normalizedPath = filePath.replace(/^\/+/, "").replace(/\/+/g, "/");

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(normalizedPath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase Storage upload error:", error.message);
      return { error: error.message };
    }

    // Return the path as stored in Supabase (without bucket prefix)
    return { path: data.path };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown upload error";
    console.error("Supabase Storage upload exception:", errorMessage);
    return { error: errorMessage };
  }
}

/**
 * Upload a logo file (with SVG support) to Supabase Storage.
 * This should ONLY be used for organization and club logos.
 * SVG files are sanitized before upload to prevent XSS attacks.
 * 
 * @param filePath - The path within the bucket (e.g., "organizations/uuid/logo.svg")
 * @param fileBuffer - The file content as a Buffer
 * @param contentType - The MIME type of the file
 * @returns Object with the file path or error
 */
export async function uploadLogoToStorage(
  filePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ path: string } | { error: string }> {
  // If it's an SVG, sanitize it first
  if (contentType === "image/svg+xml") {
    try {
      // Validate the buffer contains SVG
      if (!isValidSVGBuffer(fileBuffer)) {
        return { error: "Invalid SVG file" };
      }

      // Convert buffer to string and sanitize
      const svgContent = fileBuffer.toString("utf-8");
      const sanitizedSVG = sanitizeSVG(svgContent);

      // Convert sanitized content back to buffer
      fileBuffer = Buffer.from(sanitizedSVG, "utf-8");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "SVG sanitization failed";
      console.error("SVG sanitization error:", errorMessage);
      return { error: errorMessage };
    }
  }

  // Use the standard upload function with the sanitized content
  return uploadToStorage(filePath, fileBuffer, contentType);
}

/**
 * Delete a file from Supabase Storage.
 * 
 * @param filePath - The path within the bucket (e.g., "clubs/uuid/filename.jpg")
 * @returns Object with success status or error
 */
export async function deleteFromStorage(
  filePath: string
): Promise<{ success: true } | { error: string }> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    console.error("Supabase Storage not configured. Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return { error: "Storage service not configured" };
  }

  // Normalize the file path (remove leading slashes, double slashes)
  // Also remove "uploads/" prefix if present since we specify the bucket
  let normalizedPath = filePath.replace(/^\/+/, "").replace(/\/+/g, "/");
  if (normalizedPath.startsWith(`${STORAGE_BUCKET}/`)) {
    normalizedPath = normalizedPath.slice(`${STORAGE_BUCKET}/`.length);
  }

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([normalizedPath]);

    if (error) {
      console.error("Supabase Storage delete error:", error.message);
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown delete error";
    console.error("Supabase Storage delete exception:", errorMessage);
    return { error: errorMessage };
  }
}

/**
 * Get a user-friendly list of allowed file extensions.
 * 
 * @param allowedMimeTypes - Array of allowed MIME types
 */
function getAllowedExtensionsList(allowedMimeTypes: readonly string[]): string {
  // Get extensions for the allowed MIME types
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

/**
 * Get the file extension for a MIME type.
 * 
 * @param mimeType - The MIME type
 * @returns File extension without the dot, defaults to "jpg"
 */
export function getExtensionForMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] || "jpg";
}
