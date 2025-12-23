import { NextResponse } from "next/server";
import { requireRootAdmin } from "@/lib/requireRole";
import {
  saveFileToStorage,
  validateFileForUpload,
  generateUniqueFilename,
} from "@/lib/fileStorage";

export async function POST(request: Request) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type and size
    const validationError = validateFileForUpload(file.type, file.size);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.type);

    // Save file to filesystem
    const buffer = Buffer.from(await file.arrayBuffer());
    const saveResult = await saveFileToStorage(filename, buffer);

    if ("error" in saveResult) {
      console.error("Failed to save file:", saveResult.error);
      return NextResponse.json(
        { error: `Upload failed: ${saveResult.error}` },
        { status: 500 }
      );
    }

    // Generate URL to serve the image
    const url = `/api/images/${filename}`;

    return NextResponse.json(
      {
        url,
        key: filename,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
