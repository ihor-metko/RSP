/**
 * Server-side filesystem storage utilities for image uploads.
 * 
 * Images are stored in the Docker volume at /app/storage/images/
 * This path is persistent across container restarts.
 */

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Base storage directory for images (Docker volume mount point)
 */
export const STORAGE_BASE_PATH = "/app/storage/images";

/**
 * Allowed MIME types for image uploads.
 */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg", // Non-standard but used by some browsers
  "image/png",
  "image/webp",
] as const;

/**
 * Allowed MIME types for logo uploads (includes SVG).
 * SVG is only allowed for organization and club logos.
 */
export const ALLOWED_LOGO_MIME_TYPES = [
  ...ALLOWED_MIME_TYPES,
  "image/svg+xml",
] as const;

/**
 * Map of MIME types to file extensions.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Maximum file size for uploads (10MB).
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Get the file extension for a MIME type.
 * 
 * @param mimeType - The MIME type
 * @returns File extension without the dot, defaults to "jpg"
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
 * Generate a unique filename with proper extension.
 * 
 * @param mimeType - The MIME type of the file
 * @returns Filename in format: {uuid}.{ext}
 */
export function generateUniqueFilename(mimeType: string): string {
  const extension = getExtensionForMimeType(mimeType);
  return `${randomUUID()}.${extension}`;
}

/**
 * Ensure the storage directory exists.
 * Creates the directory if it doesn't exist.
 */
async function ensureStorageDirectory(): Promise<void> {
  try {
    await fs.access(STORAGE_BASE_PATH);
  } catch {
    // Directory doesn't exist, create it
    await fs.mkdir(STORAGE_BASE_PATH, { recursive: true });
  }
}

/**
 * Save a file to the filesystem storage.
 * 
 * @param filename - The filename to save as (e.g., "uuid.jpg")
 * @param fileBuffer - The file content as a Buffer
 * @returns Object with the filename or error
 */
export async function saveFileToStorage(
  filename: string,
  fileBuffer: Buffer
): Promise<{ filename: string } | { error: string }> {
  try {
    await ensureStorageDirectory();
    
    const filePath = path.join(STORAGE_BASE_PATH, filename);
    
    // Write the file
    await fs.writeFile(filePath, fileBuffer);
    
    return { filename };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown save error";
    console.error("File save error:", errorMessage);
    return { error: errorMessage };
  }
}

/**
 * Read a file from the filesystem storage.
 * 
 * @param filename - The filename to read
 * @returns Object with the file buffer or error
 */
export async function readFileFromStorage(
  filename: string
): Promise<{ buffer: Buffer } | { error: string }> {
  try {
    const filePath = path.join(STORAGE_BASE_PATH, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Read the file
    const buffer = await fs.readFile(filePath);
    
    return { buffer };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown read error";
    console.error("File read error:", errorMessage);
    return { error: errorMessage };
  }
}

/**
 * Delete a file from the filesystem storage.
 * 
 * @param filename - The filename to delete
 * @returns Object with success status or error
 */
export async function deleteFileFromStorage(
  filename: string
): Promise<{ success: true } | { error: string }> {
  try {
    const filePath = path.join(STORAGE_BASE_PATH, filename);
    
    // Check if file exists before attempting to delete
    await fs.access(filePath);
    
    // Delete the file
    await fs.unlink(filePath);
    
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown delete error";
    console.error("File delete error:", errorMessage);
    return { error: errorMessage };
  }
}

/**
 * Extract filename from a stored URL path.
 * Handles various path formats:
 * - /api/images/uuid.jpg -> uuid.jpg
 * - /uploads/clubs/uuid.jpg -> uuid.jpg
 * - clubs/uuid.jpg -> uuid.jpg
 * 
 * @param urlPath - The URL path as stored in the database
 * @returns The filename only
 */
export function extractFilenameFromPath(urlPath: string): string {
  // Get the last segment of the path
  const segments = urlPath.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

/**
 * Get the MIME type for a filename based on its extension.
 * 
 * @param filename - The filename
 * @returns MIME type string
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1); // Remove the dot
  
  // Reverse lookup in MIME_TO_EXTENSION
  for (const [mimeType, extension] of Object.entries(MIME_TO_EXTENSION)) {
    if (extension === ext) {
      return mimeType;
    }
  }
  
  // Default to jpeg
  return "image/jpeg";
}
