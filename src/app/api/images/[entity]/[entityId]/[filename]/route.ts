import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { stat } from "fs/promises";
import path from "path";

/**
 * Allowed entity types for image serving
 */
const ALLOWED_ENTITIES = ["organizations", "clubs", "users", "bookings"] as const;
type EntityType = typeof ALLOWED_ENTITIES[number];

/**
 * MIME type mapping for common image formats
 */
const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

/**
 * Validate that entity type is allowed
 */
function isValidEntity(entity: string): entity is EntityType {
  return ALLOWED_ENTITIES.includes(entity as EntityType);
}

/**
 * Sanitize filename to prevent directory traversal attacks
 * Returns null if the filename is invalid
 */
function sanitizeFilename(filename: string): string | null {
  // Decode URI component to handle encoded characters
  try {
    filename = decodeURIComponent(filename);
  } catch {
    return null;
  }

  // Check for directory traversal attempts
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.startsWith(".") ||
    filename.includes("\0")
  ) {
    return null;
  }

  // Ensure filename is not empty and has reasonable length
  if (!filename || filename.length === 0 || filename.length > 255) {
    return null;
  }

  return filename;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

/**
 * Validate UUID format for entityId
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * GET /api/images/[entity]/[entityId]/[filename]
 *
 * Serves uploaded images for different entity types from Docker volume.
 *
 * @param entity - Entity type: organizations, clubs, users, or bookings
 * @param entityId - UUID of the specific object
 * @param filename - Uploaded file name
 *
 * Security features:
 * - Validates entity type against allowed list
 * - Validates entityId as UUID format
 * - Sanitizes filename to prevent directory traversal
 * - Only serves files from designated storage directory
 *
 * @returns Image file with appropriate headers or 404 if not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; entityId: string; filename: string }> }
) {
  try {
    const { entity, entityId, filename } = await params;

    // Validate entity type
    if (!isValidEntity(entity)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // Validate entityId format (should be UUID)
    if (!isValidUUID(entityId)) {
      return NextResponse.json(
        { error: "Invalid entity ID format" },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = sanitizeFilename(filename);
    if (!sanitizedFilename) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    // Construct the file path within the Docker volume
    // Storage structure: /app/storage/images/[entity]/[entityId]/[filename]
    const storagePath = process.env.NODE_ENV === 'production'
      ? process.env.IMAGE_UPLOAD_PATH_PROD!
      : process.env.IMAGE_UPLOAD_PATH_DEV!;

    const filePath = path.join(storagePath, entity, entityId, sanitizedFilename);

    // Verify the resolved path is still within storage directory (extra security)
    const resolvedPath = path.resolve(filePath);
    const resolvedStoragePath = path.resolve(storagePath);
    if (!resolvedPath.startsWith(resolvedStoragePath)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 400 }
      );
    }

    // Check if file exists
    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        return NextResponse.json(
          { error: "Not found" },
          { status: 404 }
        );
      }
    } catch {
      // File doesn't exist
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await readFile(filePath);

    // Determine MIME type
    const mimeType = getMimeType(sanitizedFilename);

    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        // Cache for 1 year (31536000 seconds) with immutable flag
        // Images are content-addressed and won't change, allowing aggressive caching
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
