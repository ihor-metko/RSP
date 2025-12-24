# Image Handling and Storage

## Overview

ArenaOne uses server-side public static storage for images. Images are stored in a Docker volume and served directly via Nginx for optimal performance.

## Architecture

### Storage Location
- **Production**: `/app/storage/images` (Docker volume)
- **Development**: Configured via `IMAGE_UPLOAD_PATH_DEV` environment variable

### Directory Structure
```
/app/storage/images/
  ├── organizations/
  │   └── {orgId}/
  │       └── {timestamp}-{random}.webp
  ├── clubs/
  │   └── {clubId}/
  │       └── {timestamp}-{random}.webp
  ├── users/
  │   └── {userId}/
  │       └── {timestamp}-{random}.jpg
  └── bookings/
      └── {bookingId}/
          └── {timestamp}-{random}.png
```

## Environment Variables

### Required

**`NEXT_PUBLIC_ASSETS_BASE_URL`** (required for production)
- Base URL for serving images via Nginx
- Examples:
  - Production: `https://arenaone.app`
  - Dev: `https://dev.arenaone.app`
  - Local: `http://localhost:8080`

**`IMAGE_UPLOAD_PATH_PROD`** (required for production)
- Server-side path where images are stored in production
- Default: `/app/storage/images`

**`IMAGE_UPLOAD_PATH_DEV`** (required for development)
- Server-side path where images are stored in development
- Example: `/Users/dev/arena-storage/images`

### Example Configuration

**.env.production**
```bash
NEXT_PUBLIC_ASSETS_BASE_URL=https://arenaone.app
IMAGE_UPLOAD_PATH_PROD=/app/storage/images
```

**.env.development** or **.env.local**
```bash
NEXT_PUBLIC_ASSETS_BASE_URL=http://localhost:8080
IMAGE_UPLOAD_PATH_DEV=/path/to/local/storage/images
```

## Image URLs

All images are stored in the database as **absolute URLs**, not relative paths.

### Format
```
{NEXT_PUBLIC_ASSETS_BASE_URL}/uploads/{entity}/{entityId}/{filename}
```

### Examples
- `https://dev.arenaone.app/uploads/organizations/abc-123/1234567890-a1b2c3d4.webp`
- `https://arenaone.app/uploads/clubs/xyz-789/1234567891-e5f6g7h8.jpg`
- `http://localhost:8080/uploads/users/user-123/1234567892-i9j0k1l2.png`

## Upload API

### Endpoints
- `POST /api/images/organizations/{id}/upload`
- `POST /api/images/clubs/{id}/upload`
- `POST /api/images/users/{id}/upload`
- `POST /api/images/bookings/{id}/upload`

### Request
```typescript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('type', 'logo'); // or 'heroImage' for organizations/clubs

const response = await fetch(`/api/images/organizations/${orgId}/upload`, {
  method: 'POST',
  body: formData,
});

const data = await response.json();
// data.url => "https://dev.arenaone.app/uploads/organizations/{orgId}/{filename}.webp"
```

### Response
```json
{
  "success": true,
  "url": "https://dev.arenaone.app/uploads/organizations/abc-123/1234567890-a1b2c3d4.webp",
  "filename": "1234567890-a1b2c3d4.webp",
  "type": "logo"
}
```

## Nginx Configuration

The Nginx server is configured to serve images directly from the Docker volume:

```nginx
location /uploads/ {
  alias /app/storage/images/;
  
  # Cache images for 1 year (immutable)
  expires 1y;
  add_header Cache-Control "public, immutable";
  
  # CORS support
  add_header Access-Control-Allow-Origin "*";
}
```

## Frontend Usage

Images are displayed using standard `<img>` tags with URLs from the database:

```tsx
import { getImageUrl, isValidImageUrl } from "@/utils/image";

function OrganizationCard({ organization }) {
  const logoUrl = getImageUrl(organization.logo);
  const hasLogo = isValidImageUrl(logoUrl);
  
  return (
    <div>
      {hasLogo && logoUrl && (
        <img src={logoUrl} alt={organization.name} />
      )}
    </div>
  );
}
```

## Database Schema

### Organization
```prisma
model Organization {
  logo      String?  // Absolute URL: https://...
  heroImage String?  // Absolute URL: https://...
}
```

### Club
```prisma
model Club {
  logo      String?  // Absolute URL: https://...
  heroImage String?  // Absolute URL: https://...
}
```

### User
```prisma
model User {
  image String?  // Absolute URL: https://...
}
```

## Security

### Upload Validation
- Maximum file size: 5MB
- Allowed types: JPEG, PNG, GIF, WebP, SVG
- Filename sanitization to prevent directory traversal

### Serving Security
- Nginx serves only from designated storage directory
- No directory listing
- UUID validation for entity IDs
- Filename sanitization

## Migration Notes

### Backward Compatibility

The legacy `/api/images/[entity]/[entityId]/[filename]` route is still available for backward compatibility but should not be used for new uploads.

### Updating Existing Records

If you have existing records with `/api/images/...` paths, they need to be migrated to absolute URLs:

```sql
-- Example migration (run with caution)
UPDATE "Organization" 
SET logo = CONCAT('https://arenaone.app', logo)
WHERE logo LIKE '/api/images/%';

UPDATE "Organization" 
SET "heroImage" = CONCAT('https://arenaone.app', "heroImage")
WHERE "heroImage" LIKE '/api/images/%';
```

## Troubleshooting

### Images not loading
1. Check that `NEXT_PUBLIC_ASSETS_BASE_URL` is set correctly
2. Verify Nginx is running and has access to the storage volume
3. Check browser console for CORS errors
4. Verify the image URL format in the database

### Upload failing
1. Check that `IMAGE_UPLOAD_PATH_PROD` or `IMAGE_UPLOAD_PATH_DEV` is set
2. Verify directory permissions on the storage path
3. Check available disk space
4. Review server logs for detailed error messages

### Local Development
In local development without Nginx:
- Set `NEXT_PUBLIC_ASSETS_BASE_URL` to empty or omit it
- The system will fall back to `/uploads/...` relative paths
- You may need to configure Next.js to serve static files from your local storage directory
