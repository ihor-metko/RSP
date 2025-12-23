import { NextResponse } from "next/server";
import { readFileFromStorage, getMimeTypeFromFilename, isValidFilename } from "@/lib/fileStorage";

/**
 * GET /api/images/[filename]
 * Serve an image from the filesystem storage.
 * 
 * Images are stored in /app/storage/images/ and served with appropriate headers.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const resolvedParams = await params;
    const { filename } = resolvedParams;

    // Validate filename to prevent path traversal
    if (!isValidFilename(filename)) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    // Read the file from storage
    const result = await readFileFromStorage(filename);

    if ("error" in result) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Determine MIME type from filename extension
    const mimeType = getMimeTypeFromFilename(filename);

    // Return the image with appropriate headers
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
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
