import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";
import { randomUUID } from "crypto";
import {
  uploadToStorage,
  validateFileForUpload,
  getExtensionForMimeType,
  isSupabaseStorageConfigured,
} from "@/lib/supabase";

export async function POST(request: Request) {
  const authResult = await requireRole(request, ADMIN_ROLES);

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

    // Generate unique key for the file using validated extension from MIME type
    const extension = getExtensionForMimeType(file.type);
    // Path inside the bucket: clubs/{uuid}.{ext} (general upload, not club-specific)
    const key = `clubs/${randomUUID()}.${extension}`;

    let url: string;

    // Upload to Supabase Storage if configured, otherwise use mock URL
    if (isSupabaseStorageConfigured()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadToStorage(key, buffer, file.type);

      if ("error" in uploadResult) {
        console.error("Failed to upload to Supabase Storage:", uploadResult.error);
        return NextResponse.json(
          { error: `Upload failed: ${uploadResult.error}` },
          { status: 500 }
        );
      }

      // Store the relative path returned by Supabase (e.g., "clubs/{uuid}.jpg")
      // The getSupabaseStorageUrl utility will convert this to a full URL
      url = uploadResult.path;
    } else {
      // Development fallback: store as mock URL
      console.warn("Supabase Storage not configured, using mock URL");
      url = `/uploads/${key}`;
    }

    return NextResponse.json(
      {
        url,
        key,
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
