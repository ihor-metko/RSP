import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Allowed image MIME types for upload
 */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

/**
 * Maximum file size: 5MB
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * File extension mapping for MIME types
 */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Allowed entity types for image upload
 */
export const ALLOWED_UPLOAD_ENTITIES = ["organizations", "clubs", "users", "bookings"] as const;
export type UploadEntityType = typeof ALLOWED_UPLOAD_ENTITIES[number];

/**
 * Validate that entity type is allowed for upload
 */
export function isValidUploadEntity(entity: string): entity is UploadEntityType {
  return ALLOWED_UPLOAD_ENTITIES.includes(entity as UploadEntityType);
}

/**
 * Validate uploaded file
 * @param file - The uploaded file
 * @returns Error message if invalid, null if valid
 */
export function validateUploadedFile(file: File): string | null {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
    return `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
  }

  // Check if file has content
  if (file.size === 0) {
    return "File is empty";
  }

  return null;
}

/**
 * Generate a unique filename for upload
 * Format: [timestamp]-[random].ext
 * 
 * @param originalFilename - Original filename (for extension)
 * @param mimeType - MIME type of the file
 * @returns Unique filename
 */
export function generateUniqueFilename(originalFilename: string, mimeType: string): string {
  const timestamp = Date.now();
  const randomSuffix = randomBytes(8).toString("hex");
  
  // Get extension from MIME type (preferred) or original filename
  let extension = MIME_TO_EXTENSION[mimeType];
  if (!extension) {
    const ext = path.extname(originalFilename).toLowerCase();
    extension = ext.startsWith(".") ? ext.slice(1) : ext || "jpg";
  }

  return `${timestamp}-${randomSuffix}.${extension}`;
}

/**
 * Save uploaded file to storage
 * 
 * @param file - The file to save
 * @param entity - Entity type (organizations, clubs, users, bookings)
 * @param entityId - ID of the entity
 * @returns The saved filename
 */
export async function saveUploadedFile(
  file: File,
  entity: UploadEntityType,
  entityId: string
): Promise<string> {
  // Generate unique filename
  const filename = generateUniqueFilename(file.name, file.type);

  // Construct storage path
  const storagePath = "/app/storage/images";
  const entityDir = path.join(storagePath, entity, entityId);

  // Ensure directory exists
  await mkdir(entityDir, { recursive: true });

  // Get file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Write file to storage
  const filePath = path.join(entityDir, filename);
  await writeFile(filePath, buffer);

  return filename;
}

/**
 * Generate the URL for accessing an uploaded image
 * 
 * @param entity - Entity type
 * @param entityId - Entity ID
 * @param filename - Filename
 * @returns The URL for accessing the image
 */
export function getUploadedImageUrl(
  entity: UploadEntityType,
  entityId: string,
  filename: string
): string {
  return `/api/images/${entity}/${entityId}/${filename}`;
}
