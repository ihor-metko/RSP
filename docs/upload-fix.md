# Image Upload Guide

This document describes how image uploads work in the application and what environment variables are required.

## Overview

Images are uploaded to Supabase Storage in the `uploads` bucket. The database stores only the relative file path (e.g., `clubs/{clubId}/{uuid}.jpg`), and the `getSupabaseStorageUrl` utility converts this to a full public URL.

## Environment Variables

### Required for Production

```env
# Supabase project URL (public)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase service role key (server-side only, NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Development Mode

If `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is not set, the upload endpoints will:
- Return mock URLs in the format `/uploads/clubs/{path}`
- Log a warning that Supabase Storage is not configured

## Storage Path Structure

Files are stored in Supabase Storage with the following path structure:

```
uploads/                      # Bucket name
  clubs/                      # Category folder
    {clubId}/                 # Club-specific folder
      {uuid}.{ext}            # UUID-named file with proper extension
```

### Database Storage

The database stores only the relative path inside the bucket:
- ✅ Correct: `clubs/{clubId}/{uuid}.jpg`
- ❌ Wrong: `/uploads/clubs/{clubId}/{uuid}.jpg`
- ❌ Wrong: `uploads/clubs/{clubId}/{uuid}.jpg`

## API Endpoints

### POST /api/admin/clubs/[id]/images

Upload an image to a specific club's gallery.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@image.jpg" \
  http://localhost:3000/api/admin/clubs/{clubId}/images
```

**Response (201):**
```json
{
  "id": "gallery-id",
  "url": "clubs/{clubId}/{uuid}.jpg",
  "key": "clubs/{clubId}/{uuid}.jpg",
  "originalName": "image.jpg",
  "size": 123456,
  "mimeType": "image/jpeg",
  "sortOrder": 0
}
```

### POST /api/admin/uploads

Upload a general image (not associated with a specific club yet).

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@image.jpg" \
  http://localhost:3000/api/admin/uploads
```

**Response (201):**
```json
{
  "url": "clubs/{uuid}.jpg",
  "key": "clubs/{uuid}.jpg",
  "originalName": "image.jpg",
  "size": 123456,
  "mimeType": "image/jpeg"
}
```

### DELETE /api/admin/clubs/[id]/images/[imageId]

Delete an image from a club's gallery. This removes both the database record and the file from Supabase Storage.

**Request:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/admin/clubs/{clubId}/images/{imageId}
```

## Allowed File Types

- `image/jpeg` / `image/jpg` (→ `.jpg`)
- `image/png` (→ `.png`)
- `image/webp` (→ `.webp`)
- `image/avif` (→ `.avif`)

## File Size Limit

Maximum file size: **5 MB**

## Converting Stored Paths to URLs

Use the `getSupabaseStorageUrl` utility to convert stored paths to full public URLs:

```typescript
import { getSupabaseStorageUrl } from "@/utils/image";

// Input: "clubs/abc123/image.jpg"
// Output: "https://your-project.supabase.co/storage/v1/object/public/uploads/clubs/abc123/image.jpg"
const publicUrl = getSupabaseStorageUrl(storedPath);
```

This utility handles:
- Already full URLs (returned as-is)
- Paths with or without leading `/`
- Paths with or without `uploads/` prefix

## Supabase Bucket Configuration

Ensure your `uploads` bucket is configured correctly in Supabase:

1. Go to Storage in your Supabase dashboard
2. Create a bucket named `uploads` (if not exists)
3. Set the bucket as **public** to allow public URL access
4. No additional RLS policies needed for server-side uploads with service role key

## Error Handling

The upload endpoints return appropriate error responses:

| Status | Error | Description |
|--------|-------|-------------|
| 400 | "No file provided" | No file in request |
| 400 | "Invalid file type..." | Unsupported MIME type |
| 400 | "File too large..." | Exceeds 5MB limit |
| 401 | "Unauthorized" | Not authenticated |
| 403 | "Forbidden" | Not an admin |
| 404 | "Club not found" | Invalid club ID |
| 500 | "Upload failed: ..." | Supabase Storage error |

## Troubleshooting

### Uploads fail with "Storage service not configured"

Ensure both environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Images not displaying

1. Check if the bucket is public
2. Verify the stored path in the database matches the file in Storage
3. Use the `getSupabaseStorageUrl` utility to generate the correct URL

### Permission denied errors

- Server-side: Ensure `SUPABASE_SERVICE_ROLE_KEY` is correct
- Client-side: Uploads should go through the API endpoints, not directly to Supabase

## Testing

Run the upload tests:

```bash
npm test -- admin-uploads supabase-utils
```

Manual testing with curl:

```bash
# Test upload (requires valid auth session)
./scripts/test-upload.sh
```
