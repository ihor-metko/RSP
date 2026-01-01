# Club Domain-Specific API Endpoints

This document describes the domain-specific API endpoints for managing clubs in the ArenaOne platform. These endpoints replace the previous section-based update mechanism.

## Overview

All club update endpoints follow a domain-driven design where each endpoint is responsible for a specific business concern. This approach:

- Provides clear separation of concerns
- Enables granular permission control
- Decouples the API from UI structure
- Makes the API more scalable and maintainable

## Authentication & Permissions

All endpoints require authentication and admin privileges:
- **Root Admin**: Full access to all clubs
- **Organization Admin**: Access to clubs within their managed organizations
- **Club Owner/Admin**: Access to their specific clubs (some endpoints restricted)

## Endpoints

### 1. Update General Club Information

**PATCH** `/api/admin/clubs/:clubId`

Updates general club information including name, slug, description, visibility, and supported sports.

**Request Body:**
```json
{
  "name": "Updated Club Name",
  "slug": "updated-club-slug",
  "shortDescription": "A brief description",
  "isPublic": true,
  "supportedSports": ["TENNIS", "PADEL"]
}
```

**Fields:**
- `name` (optional): Club name (must not be empty if provided)
- `slug` (optional): URL-friendly identifier (must be unique)
- `shortDescription` (optional): Brief description of the club
- `isPublic` (optional): Whether the club is publicly visible
- `supportedSports` (optional): Array of sport types supported

**Response:** Full club object with all relations

**Permissions:** Root Admin, Organization Admin (for clubs in their orgs)

---

### 2. Update Business Hours

**PATCH** `/api/admin/clubs/:clubId/business-hours`

Updates the club's regular weekly business hours.

**Request Body:**
```json
{
  "businessHours": [
    {
      "dayOfWeek": 1,
      "openTime": "09:00",
      "closeTime": "21:00",
      "isClosed": false
    }
  ]
}
```

**Fields:**
- `businessHours` (required): Array of business hour objects
  - `dayOfWeek`: 0-6 (Sunday-Saturday)
  - `openTime`: Opening time (HH:MM format)
  - `closeTime`: Closing time (HH:MM format)
  - `isClosed`: Whether the club is closed on this day

**Validation:**
- Opening time must be before closing time
- All days must be within 0-6 range

**Response:** Full club object with updated business hours

**Permissions:** Root Admin, Organization Admin

---

### 3. Update Special Hours

**PATCH** `/api/admin/clubs/:clubId/special-hours`

Updates special hours for specific dates (holidays, events, etc.).

**Request Body:**
```json
{
  "specialHours": [
    {
      "date": "2024-12-25",
      "openTime": null,
      "closeTime": null,
      "isClosed": true,
      "reason": "Christmas Holiday"
    }
  ]
}
```

**Fields:**
- `specialHours` (required): Array of special hour objects
  - `date`: ISO date string (YYYY-MM-DD)
  - `openTime`: Opening time or null if closed
  - `closeTime`: Closing time or null if closed
  - `isClosed`: Whether the club is closed
  - `reason`: Optional reason for special hours

**Validation:**
- No duplicate dates allowed
- Opening time must be before closing time if not closed

**Response:** Full club object with updated special hours

**Permissions:** Root Admin, Organization Admin

---

### 4. Update Media

**PATCH** `/api/admin/clubs/:clubId/media`

Updates club media including logo, banner, and gallery images.

**Request Body:**
```json
{
  "logoData": {
    "url": "https://example.com/logo.jpg",
    "altText": "Club Logo",
    "thumbnailUrl": "https://example.com/logo-thumb.jpg"
  },
  "bannerData": {
    "url": "https://example.com/banner.jpg",
    "altText": "Club Banner",
    "description": "Main banner image",
    "position": "center"
  },
  "gallery": [
    {
      "imageUrl": "https://example.com/gallery1.jpg",
      "altText": "Gallery Image 1",
      "sortOrder": 0
    }
  ]
}
```

**Fields:**
- `logoData` (optional): Logo image data object
- `bannerData` (optional): Banner image data object
- `gallery` (optional): Array of gallery image objects

**Response:** Full club object with updated media

**Permissions:** Root Admin, Organization Admin

**Note:** This endpoint updates metadata only. Actual file uploads should be done via the `/api/images/clubs/:clubId/upload` endpoint.

---

### 5. Update Contacts

**PATCH** `/api/admin/clubs/:clubId/contacts`

Updates club contact information.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "email": "contact@club.com",
  "website": "https://club.com"
}
```

**Fields:**
- `phone` (optional): Contact phone number
- `email` (optional): Contact email address
- `website` (optional): Club website URL

**Response:** Full club object with updated contact info

**Permissions:** Root Admin, Organization Admin

---

### 6. Update Location

**PATCH** `/api/admin/clubs/:clubId/location`

Updates club location details.

**Request Body:**
```json
{
  "location": "123 Main Street",
  "city": "New York",
  "country": "USA",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Fields:**
- `location` (required if provided): Street address (must not be empty)
- `city` (optional): City name
- `country` (optional): Country name
- `latitude` (optional): Geographic latitude
- `longitude` (optional): Geographic longitude

**Validation:**
- Address is required and must not be empty if provided

**Response:** Full club object with updated location

**Permissions:** Root Admin, Organization Admin

---

### 7. Update Metadata

**PATCH** `/api/admin/clubs/:clubId/metadata`

Updates club metadata (custom settings, theme preferences, etc.).

**Request Body:**
```json
{
  "metadata": {
    "logoTheme": "dark",
    "secondLogoTheme": "light",
    "bannerAlignment": "center",
    "customField": "value"
  }
}
```

**Fields:**
- `metadata` (required): Object containing any custom metadata

**Response:** Full club object with updated metadata

**Permissions:** Root Admin, Organization Admin

**Note:** Metadata is stored as a JSON string. Common fields include:
- `logoTheme`: "light" | "dark"
- `secondLogoTheme`: "light" | "dark"
- `bannerAlignment`: "top" | "center" | "bottom"
- `logoCount`: "one" | "two"
- `secondLogo`: URL to second logo

---

### 8. Update Coaches

**PATCH** `/api/admin/clubs/:clubId/coaches`

Updates coach assignments for the club.

**Request Body:**
```json
{
  "coachIds": ["coach-id-1", "coach-id-2"]
}
```

**Fields:**
- `coachIds` (required): Array of coach IDs to assign to this club

**Behavior:**
- Unlinks all existing coaches from the club
- Links the specified coaches to the club
- Empty array unlinks all coaches

**Response:** Full club object with updated coach assignments

**Permissions:** Root Admin, Organization Admin

---

## Error Responses

All endpoints return standard error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "error": "Club not found"
}
```

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 409 Conflict
```json
{
  "error": "A club with this slug already exists"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Migration Notes

### From Section-Based Updates

The previous section-based endpoint has been deprecated:

**Old:** `PATCH /api/admin/clubs/:clubId/section`
```json
{
  "section": "header",
  "payload": { "name": "New Name" }
}
```

**New:** Use domain-specific endpoints directly
```json
PATCH /api/admin/clubs/:clubId
{
  "name": "New Name"
}
```

### Mapping

| Old Section | New Endpoint |
|------------|--------------|
| `header` | `/api/admin/clubs/:clubId` |
| `contacts` | `/api/admin/clubs/:clubId/contacts` |
| `location` | `/api/admin/clubs/:clubId/location` |
| `hours` (business) | `/api/admin/clubs/:clubId/business-hours` |
| `hours` (special) | `/api/admin/clubs/:clubId/special-hours` |
| `gallery` | `/api/admin/clubs/:clubId/media` |
| `metadata` | `/api/admin/clubs/:clubId/metadata` |
| `coaches` | `/api/admin/clubs/:clubId/coaches` |

---

## Frontend Integration

The `ClubEditor` component has been updated to use these new endpoints directly. Each tab/section in the UI calls its corresponding domain endpoint:

```typescript
// Example: Update general info
const response = await fetch(`/api/admin/clubs/${clubId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Updated Name",
    shortDescription: "Updated description"
  })
});

// Example: Update location
const response = await fetch(`/api/admin/clubs/${clubId}/location`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    location: "123 Main St",
    city: "New York"
  })
});
```

---

## Testing

Comprehensive tests are available in `src/__tests__/admin-club-domain-endpoints.test.ts`:

- Authentication and authorization tests
- Validation tests
- Success scenarios
- All 16 tests passing

Run tests with:
```bash
npm test -- admin-club-domain-endpoints
```
