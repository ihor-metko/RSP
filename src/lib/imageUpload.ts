import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Allowed MIME types for image uploads
 * Note: image/jpg is non-standard but included for compatibility with older clients
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg", // Non-standard but sometimes sent by older browsers
  "image/png",
  "image/webp",
] as const;

/**
 * Maximum file size in bytes (10 MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Base storage directory for uploaded images
 */
export const STORAGE_DIR = "/app/storage/images";

/**
 * File extension mapping for MIME types
 */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Upload result type
 */
export interface UploadResult {
  filename: string;
  path: string;
  url: string;
}

/**
 * Validate an uploaded image file
 * 
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 10)
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 10
): ValidationResult {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
    };
  }

  // Check file size
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generate a unique filename for an uploaded image
 * 
 * @param mimeType - The MIME type of the image
 * @returns A unique filename with appropriate extension
 */
export function generateUniqueFilename(mimeType: string): string {
  const extension = MIME_TO_EXT[mimeType] || "jpg";
  const uuid = randomUUID();
  return `${uuid}.${extension}`;
}

/**
 * Save an uploaded image file to the storage directory
 * 
 * @param file - The file to save
 * @returns Upload result with filename, path, and URL
 */
export async function saveImageFile(file: File): Promise<UploadResult> {
  // Validate the file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Ensure storage directory exists
  if (!existsSync(STORAGE_DIR)) {
    await mkdir(STORAGE_DIR, { recursive: true });
  }

  // Generate unique filename
  const filename = generateUniqueFilename(file.type);
  const filePath = join(STORAGE_DIR, filename);

  // Convert file to buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(filePath, buffer);

  // Return the result
  return {
    filename,
    path: filePath,
    url: `/api/images/${filename}`,
  };
}

/**
 * Get the MIME type from a filename extension
 * 
 * @param filename - The filename to get MIME type for
 * @returns The MIME type, or "application/octet-stream" if unknown
 */
export function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
