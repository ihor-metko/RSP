# Image Upload System

## Overview

The ArenaOne image upload system uses server-based storage with nginx serving static files directly. Images are uploaded via API endpoints and stored in a Docker volume, then accessed via full URLs served by nginx.

## Architecture

### Storage Structure

Images are stored in the following directory structure:
```
/var/www/arenaone_storage/
└── {entity}/
    └── {entityId}/
        └── {filename}
```

**Supported entities:**
- `organizations` - Organization logos and hero images
- `clubs` - Club logos and hero images
- `users` - User avatars
- `bookings` - Booking-related images

### URL Format

Images are accessed via full URLs constructed as:
```
{NEXT_PUBLIC_ASSETS_BASE_URL}/uploads/{entity}/{entityId}/{filename}
```

**Examples:**
- `https://arenaone.app/uploads/organizations/abc-123/logo.jpg`
- `https://arenaone.app/uploads/clubs/xyz-789/banner.png`
- `https://arenaone.app/uploads/users/user-456/avatar.webp`

## Environment Variables

### Required Variables

#### `IMAGE_UPLOAD_PATH_PROD`
- **Purpose:** Storage path for uploaded images in production
- **Default:** `/var/www/arenaone_storage`
- **Usage:** Production environment (Docker container)
- **Example:** `/var/www/arenaone_storage`

#### `IMAGE_UPLOAD_PATH_DEV`
- **Purpose:** Storage path for uploaded images in development
- **Default:** `./uploads`
- **Usage:** Local development environment
- **Example:** `./uploads` or `/tmp/arenaone-uploads`

#### `NEXT_PUBLIC_ASSETS_BASE_URL`
- **Purpose:** Base URL for serving static assets (images)
- **Required:** Optional (falls back to relative paths if not set)
- **Usage:** Both production and development
- **Examples:**
  - Production: `https://arenaone.app`
  - Development: `http://localhost:8080`
  - Not set: Falls back to relative paths like `/uploads/...`

### Environment Configuration

Create a `.env.production` file with:
```env
# Image Storage Paths
IMAGE_UPLOAD_PATH_PROD=/var/www/arenaone_storage
IMAGE_UPLOAD_PATH_DEV=./uploads

# Assets Base URL (production)
NEXT_PUBLIC_ASSETS_BASE_URL=https://arenaone.app
```

For local development, create a `.env.local` file:
```env
# Image Storage Paths
IMAGE_UPLOAD_PATH_DEV=./uploads

# Assets Base URL (optional - leave unset for relative paths)
# NEXT_PUBLIC_ASSETS_BASE_URL=http://localhost:8080
```

## Docker & Nginx Configuration

### Docker Volume

The `docker-compose.yml` defines a shared volume for image storage:
```yaml
volumes:
  arenaone_storage:
    name: arenaone_storage
    external: true
```

Both the app container and nginx container mount this volume:
```yaml
arenaone_app:
  volumes:
    - arenaone_storage:/var/www/arenaone_storage

nginx:
  volumes:
    - arenaone_storage:/var/www/arenaone_storage
```

### Nginx Configuration

The nginx configuration serves static files from the `/uploads/` path:
```nginx
location /uploads/ {
  alias /var/www/arenaone_storage/;
  autoindex off;
}
```

This configuration:
- Maps requests to `/uploads/organizations/abc/logo.jpg`
- To file at `/var/www/arenaone_storage/organizations/abc/logo.jpg`

## API Endpoints

### Upload Endpoints

**POST** `/api/images/{entity}/{id}/upload`

Upload an image for a specific entity.

**Parameters:**
- `{entity}` - Entity type: organizations, clubs, users, bookings
- `{id}` - Entity UUID

**Request Body (multipart/form-data):**
- `file` - Image file (required)
- `type` - Image type: "logo" or "heroImage" (for organizations/clubs only)

**Response:**
```json
{
  "success": true,
  "url": "https://arenaone.app/uploads/organizations/abc-123/1234567890-abc.jpg",
  "filename": "1234567890-abc.jpg",
  "type": "logo"
}
```

**Available endpoints:**
- `/api/images/organizations/{id}/upload` - Organization images
- `/api/images/clubs/{id}/upload` - Club images
- `/api/images/users/{id}/upload` - User avatars
- `/api/images/bookings/{id}/upload` - Booking images

### Deprecated Endpoint

**GET** `/api/images/[entity]/[entityId]/[filename]` (DEPRECATED)

This endpoint previously served images via the API but is now deprecated in favor of direct nginx serving. It's kept for backward compatibility with existing URLs in the database.

**New approach:** Images are served directly by nginx from `/uploads/` path.

## File Validation

All uploaded files are validated for:

1. **File Type:** Only image formats allowed
   - JPEG (.jpg, .jpeg)
   - PNG (.png)
   - GIF (.gif)
   - WebP (.webp)
   - SVG (.svg)

2. **File Size:** Maximum 5MB per file

3. **Security:**
   - Filename sanitization to prevent directory traversal
   - UUID validation for entity IDs
   - Content type verification

## Usage in Code

### Upload an Image

```typescript
import { saveUploadedFile, getUploadedImageUrl } from "@/lib/fileUpload";

// In an API route handler
const file = formData.get("file") as File;
const entityId = "abc-123";

// Save file to storage
const filename = await saveUploadedFile(file, "organizations", entityId);

// Generate full URL for database storage
const url = getUploadedImageUrl("organizations", entityId, filename);
// Returns: "https://arenaone.app/uploads/organizations/abc-123/1234567890-abc.jpg"

// Store the full URL in database
await prisma.organization.update({
  where: { id: entityId },
  data: { logo: url },
});
```

### Display an Image

```tsx
import { getImageUrl } from "@/utils/image";

// In a component
const organization = await prisma.organization.findUnique({
  where: { id: orgId },
  select: { logo: true },
});

// The logo field contains a full URL
// e.g., "https://arenaone.app/uploads/organizations/abc-123/logo.jpg"
<img src={getImageUrl(organization.logo)} alt="Organization Logo" />
```

## Migration Notes

### Backward Compatibility

The system maintains backward compatibility with:
1. **Old API URLs:** `/api/images/...` paths still work via the deprecated endpoint
2. **Relative paths:** If `NEXT_PUBLIC_ASSETS_BASE_URL` is not set, the system falls back to relative paths
3. **Legacy URLs:** Old image URLs stored in the database continue to work

### Future Uploads

All new image uploads will:
1. Store files in the correct folder structure
2. Generate full URLs using `NEXT_PUBLIC_ASSETS_BASE_URL`
3. Store the full URL in the database
4. Be served directly by nginx (not through the API)

## Troubleshooting

### Images not loading

**Check:**
1. `NEXT_PUBLIC_ASSETS_BASE_URL` is set correctly in environment
2. Nginx is running and properly configured
3. Docker volume is mounted correctly
4. File permissions on storage directory allow nginx to read files

### Upload fails

**Check:**
1. `IMAGE_UPLOAD_PATH_PROD` or `IMAGE_UPLOAD_PATH_DEV` is set correctly
2. Directory has write permissions for the app container
3. File size is under 5MB
4. File type is in the allowed list
5. Storage volume has sufficient space

### Incorrect URLs in database

**Check:**
1. `NEXT_PUBLIC_ASSETS_BASE_URL` matches your actual domain
2. Environment variable is prefixed with `NEXT_PUBLIC_` to be accessible client-side
3. Next.js app was rebuilt after changing environment variables

## Security Considerations

1. **Directory Traversal Protection:** Filenames are sanitized to prevent `../` attacks
2. **UUID Validation:** Entity IDs must be valid UUIDs
3. **File Type Validation:** Only allowed image types can be uploaded
4. **Size Limits:** Maximum 5MB per file
5. **Access Control:** Upload endpoints require appropriate authentication and authorization
6. **Direct Serving:** Images are served by nginx, not exposed through application code

## Performance

1. **Caching:** Nginx serves static files with appropriate cache headers
2. **Direct Serving:** Images bypass the application layer for faster delivery
3. **CDN Ready:** Full URLs make it easy to add a CDN in front of nginx in the future
