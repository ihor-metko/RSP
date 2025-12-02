/**
 * Server-side Supabase client for storage operations.
 * 
 * Uses the service role key for server-side operations.
 * This should NEVER be exposed to the client.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * The name of the Supabase Storage bucket where images are stored.
 */
export const STORAGE_BUCKET = "uploads";

/**
 * Allowed MIME types for image uploads.
 */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/**
 * Map of MIME types to file extensions.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
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
 * Validate a file for upload.
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
    return "Invalid file type. Allowed: jpg, png, webp, avif";
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
