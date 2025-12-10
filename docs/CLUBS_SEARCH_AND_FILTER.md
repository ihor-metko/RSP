# Clubs Search and Filter Functionality

## Overview
The clubs list pages (both player-facing and admin) now support comprehensive search and filtering capabilities, fully functional with mock data for testing and development.

## Features

### Player Clubs Page (`/clubs`)
Located at: `src/app/(pages)/(player)/clubs/page.tsx`

**Available Filters:**
- **Search (q)**: Search by club name or location
- **City**: Filter by specific city
- **Indoor**: Filter to show only clubs with indoor courts

**URL Parameters:**
```
/clubs?q=padel&city=Miami&indoor=true
```

### Admin Clubs Page (`/admin/clubs`)
Located at: `src/app/(pages)/admin/clubs/page.tsx`

**Available Filters:**
- **Search**: Search by name, location, or city
- **Organization**: Filter by organization (root admin only)
- **City**: Filter by city
- **Status**: Filter by status (active, draft, suspended)

**Sorting Options:**
- Newest first (createdAt desc)
- Oldest first (createdAt asc)
- Name A-Z (name asc)
- Name Z-A (name desc)
- City A-Z (city asc)
- Most bookings (bookingCount desc)

**Pagination:**
- Configurable page size (10, 20, 50, 100 items per page)
- Page navigation with current page indicator

## Mock Data

### Available Test Clubs
The mock database includes 5 diverse clubs for testing:

1. **Downtown Padel Club**
   - City: New York
   - Status: active
   - Organization: Padel Sports Inc
   - Courts: 2 indoor, 1 outdoor

2. **Suburban Padel Center**
   - City: Brooklyn
   - Status: active
   - Organization: Padel Sports Inc
   - Courts: 2 outdoor

3. **Elite Padel Academy**
   - City: Miami
   - Status: active
   - Organization: Tennis & Padel Corp
   - Courts: 2 indoor

4. **Queens Sports Complex**
   - City: Queens
   - Status: draft
   - Organization: Padel Sports Inc
   - Courts: 2 indoor

5. **Los Angeles Padel Club**
   - City: Los Angeles
   - Status: active
   - Organization: Tennis & Padel Corp
   - Courts: 3 outdoor

### Testing Search & Filter

#### Enable Mock Mode
```bash
export USE_MOCK_DATA=true
npm run dev
```

#### Test Scenarios

**Search by Name:**
```
/clubs?q=elite
# Returns: Elite Padel Academy
```

**Filter by City:**
```
/admin/clubs?city=Miami
# Returns: Elite Padel Academy
```

**Filter by Status:**
```
/admin/clubs?status=draft
# Returns: Queens Sports Complex
```

**Filter by Organization:**
```
/admin/clubs?organizationId=org-1
# Returns: Downtown Padel Club, Suburban Padel Center, Queens Sports Complex
```

**Indoor Courts Only:**
```
/clubs?indoor=true
# Returns: Downtown Padel Club, Elite Padel Academy, Queens Sports Complex
```

**Combined Filters:**
```
/admin/clubs?status=active&city=New York
# Returns: Downtown Padel Club
```

**Sorting:**
```
/admin/clubs?sortBy=name&sortOrder=asc
# Returns: All clubs sorted alphabetically
```

## API Implementation

### Player Clubs API
**Endpoint:** `GET /api/clubs`

**Query Parameters:**
- `q` (string): Search query
- `city` (string): Filter by city
- `indoor` (boolean): Filter by indoor courts
- `limit` (number): Limit results
- `popular` (boolean): Sort by popularity

**Response:**
```json
[
  {
    "id": "club-1",
    "name": "Downtown Padel Club",
    "city": "New York",
    "location": "100 Main St, Downtown",
    "shortDescription": "Premier downtown location",
    "indoorCount": 2,
    "outdoorCount": 1,
    "contactInfo": "Call us at +1111111111",
    "openingHours": "Mon-Sun: 6am-10pm",
    "logo": null,
    "heroImage": null,
    "tags": "[\"premium\",\"indoor\",\"outdoor\"]",
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
]
```

### Admin Clubs API
**Endpoint:** `GET /api/admin/clubs`

**Query Parameters:**
- `search` (string): Search by name, location, or city
- `city` (string): Filter by city
- `status` (string): Filter by status (active, draft, suspended)
- `organizationId` (string): Filter by organization (root admin only)
- `sortBy` (string): Sort field (name, city, createdAt, bookingCount)
- `sortOrder` (string): Sort direction (asc, desc)
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20)

**Response:**
```json
{
  "clubs": [
    {
      "id": "club-1",
      "name": "Downtown Padel Club",
      "city": "New York",
      "location": "100 Main St, Downtown",
      "shortDescription": "Premier downtown location",
      "status": "active",
      "indoorCount": 2,
      "outdoorCount": 1,
      "courtCount": 3,
      "bookingCount": 5,
      "organization": {
        "id": "org-1",
        "name": "Padel Sports Inc"
      },
      "admins": [],
      "contactInfo": "Call us at +1111111111",
      "openingHours": "Mon-Sun: 6am-10pm",
      "logo": null,
      "heroImage": null,
      "tags": "[\"premium\",\"indoor\",\"outdoor\"]",
      "isPublic": true,
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "totalCount": 5,
    "totalPages": 1,
    "currentPage": 1,
    "pageSize": 20
  }
}
```

## Code Structure

### Mock API Handler
**File:** `src/services/mockApiHandlers.ts`

The `mockGetClubs` function handles all filtering, searching, and sorting:

```typescript
export async function mockGetClubs(params: {
  adminType: "root_admin" | "organization_admin" | "club_admin";
  managedIds: string[];
  search?: string;
  city?: string;
  status?: string;
  organizationId?: string;
  sortBy?: string;
  sortOrder?: string;
})
```

**Features:**
- Role-based filtering (admin type and managed IDs)
- Text search across name, location, and city
- Exact match filtering for city, status, and organization
- Multi-field sorting with configurable direction
- Computed counts (indoor, outdoor, courts, bookings)
- Organization and admin relationships

### Admin API Route
**File:** `src/app/api/admin/clubs/route.ts`

Passes all query parameters to the mock handler:

```typescript
if (isMockMode()) {
  const clubs = await mockGetClubs({
    adminType: authResult.adminType,
    managedIds: authResult.managedIds,
    search,
    city,
    status,
    organizationId,
    sortBy,
    sortOrder,
  });
  return NextResponse.json(clubs);
}
```

## Testing

### Integration Tests
**File:** `src/__tests__/mock-mode-integration.test.ts`

Comprehensive test suite covering:
- ✓ Search by query
- ✓ Filter by city
- ✓ Filter by status
- ✓ Filter by organization
- ✓ Sort by name (ascending/descending)
- ✓ Combine multiple filters
- ✓ Role-based access control

### Running Tests
```bash
# Run all club-related tests
npm test -- mock-mode-integration.test.ts
npm test -- clubs-list.test.ts
npm test -- admin-clubs.test.ts
```

All tests passing ✓

## Future Enhancements

When moving from mock data to real database:
1. The mock handler logic should be replaced with Prisma queries
2. All query parameters are already supported in the API routes
3. Frontend components require no changes
4. Tests should be updated to use database fixtures instead of mock data

## Related Files

- `src/services/mockDb.ts` - Mock data definitions
- `src/services/mockApiHandlers.ts` - Mock API logic
- `src/app/api/(player)/clubs/route.ts` - Player clubs API
- `src/app/api/admin/clubs/route.ts` - Admin clubs API
- `src/app/(pages)/(player)/clubs/page.tsx` - Player clubs page
- `src/app/(pages)/admin/clubs/page.tsx` - Admin clubs page
- `src/types/club.ts` - TypeScript type definitions
