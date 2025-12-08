# Courts Page Mock Data

> ⚠️ **THIS IS A TEMPORARY FEATURE** — This mock data mode is a stopgap solution for development when the database is unavailable. It should be removed once database issues are resolved. See `TODO_MOCK_CLEANUP.md` for removal instructions.

## Overview

The Courts page (`/admin/courts`) fully supports mock data mode, allowing administrators to view, filter, and manage courts without requiring database access. This enables UI development, testing, and demonstrations when the database is unavailable.

## Features

When mock mode is active (`USE_MOCK_DATA=true`), the Courts page provides:

### 1. **Role-Based Access Control**
- **Root Admin**: Views all courts across all organizations and clubs
- **Organization Admin**: Views courts only within their managed organizations' clubs
- **Club Admin**: Views courts only within their assigned clubs

### 2. **Filtering Capabilities**
- **Search**: Filter courts by name
- **Club Filter**: Filter by specific club (available to Root and Organization admins)
- **Organization Filter**: Filter by organization (available to Root admins only)
- **Status Filter**: Filter by active/inactive status

### 3. **Sorting Options**
- Sort by court name (ascending/descending)
- Sort by number of bookings (ascending/descending)

### 4. **Pagination**
- Configurable page size (default: 20 items per page)
- Navigation controls for browsing multiple pages
- Total count and page information display

### 5. **Court Information Display**
For each court, the page shows:
- Court name and status (active/inactive)
- Club association with link
- Organization association (for Root admins)
- Court type (e.g., padel)
- Surface type (e.g., artificial grass, synthetic, professional)
- Indoor/outdoor designation
- Default price
- Total number of bookings
- Quick actions (view details, edit, pricing)

## Mock Data Details

### Available Courts (7 total)

#### Downtown Padel Club (3 courts)
- **Court 1**: Indoor, Artificial Grass, $50.00, Active
- **Court 2**: Indoor, Artificial Grass, $50.00, Active
- **Court 3**: Outdoor, Synthetic, $40.00, Active

#### Suburban Padel Center (2 courts)
- **Court A**: Outdoor, Artificial Grass, $35.00, Active
- **Court B**: Outdoor, Artificial Grass, $35.00, Active

#### Elite Padel Academy (2 courts)
- **Pro Court 1**: Indoor, Professional, $80.00, Active
- **Pro Court 2**: Indoor, Professional, $80.00, Active

### Court-Club-Organization Relationships

```
Organization: Padel Sports Inc (org-1)
  ├─ Club: Downtown Padel Club (club-1)
  │   ├─ Court 1 (court-1)
  │   ├─ Court 2 (court-2)
  │   └─ Court 3 (court-3)
  └─ Club: Suburban Padel Center (club-2)
      ├─ Court A (court-4)
      └─ Court B (court-5)

Organization: Tennis & Padel Corp (org-2)
  └─ Club: Elite Padel Academy (club-3)
      ├─ Pro Court 1 (court-6)
      └─ Pro Court 2 (court-7)
```

### Booking Counts

Each court has associated bookings that are counted and displayed:
- Courts in mock data have 0-2 bookings each
- Booking counts are used for sorting functionality
- Counts reflect all bookings (past, present, future, and cancelled)

## Implementation Details

### API Endpoint

**Endpoint**: `GET /api/admin/courts`

**Query Parameters**:
- `search`: Search by court name
- `clubId`: Filter by club ID
- `status`: Filter by status (`all`, `active`, `inactive`)
- `sortBy`: Sort field (`name`, `bookings`)
- `sortOrder`: Sort order (`asc`, `desc`)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response Structure**:
```typescript
{
  courts: [
    {
      id: string;
      name: string;
      slug: string | null;
      type: string | null;
      surface: string | null;
      indoor: boolean;
      isActive: boolean;
      defaultPriceCents: number;
      createdAt: string;
      updatedAt: string;
      club: {
        id: string;
        name: string;
      };
      organization: {
        id: string;
        name: string;
      } | null;
      bookingCount: number;
    }
  ],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }
}
```

### Mock Data Handler

**Function**: `mockGetCourts()` in `/src/services/mockApiHandlers.ts`

The handler:
1. Filters courts based on admin role and managed IDs
2. Applies search, club, and status filters
3. Counts bookings for each court
4. Sorts courts by specified field and order
5. Paginates results
6. Transforms data to match API response format

## Testing the Courts Page with Mock Mode

### 1. Enable Mock Mode

```bash
export USE_MOCK_DATA=true
npm run dev
```

### 2. Login with Different Admin Roles

Test with different user accounts to verify role-based filtering:

- **Root Admin**: `root@example.com` - should see all 7 courts
- **Org Admin**: `orgadmin@example.com` - should see 5 courts (from Padel Sports Inc)
- **Club Admin**: `clubadmin@example.com` - should see 2 courts (from Elite Padel Academy)

### 3. Test Filtering

- Search for "Pro" to find professional courts
- Filter by club "Downtown Padel Club" to see 3 courts
- Filter by status "active" to see all active courts

### 4. Test Sorting

- Sort by name (A-Z, Z-A)
- Sort by bookings (Most, Least)

### 5. Test Pagination

- Change items per page (10, 20, 50)
- Navigate between pages

## UI Components Used

The Courts page follows the copilot settings and reuses existing components:

- `PageHeader`: Page title and description
- `Input`: Search input field
- `Select`: Dropdown filters (organization, club, status, sort)
- `Button`: Clear filters, load more, and action buttons
- `Card`: Court information display
- `CourtCard`: Reusable court card component
- `Modal`: Edit and delete confirmation dialogs
- `IMLink`: Internal navigation links

All components use:
- Dark theme support
- `im-*` semantic classes
- Consistent styling with the platform

## Known Limitations

1. **In-Memory Only**: Mock data changes are lost on server restart
2. **No Persistence**: Edit/delete operations work but don't persist
3. **Simplified Logic**: No complex pricing rules or advanced court features
4. **Fixed Dataset**: 7 courts with predefined relationships

## Adding More Mock Courts

To add additional courts, edit `/src/services/mockDb.ts`:

```typescript
mockCourts.push({
  id: "court-8",
  clubId: "club-1", // Must match an existing club
  name: "Court 4",
  slug: "downtown-padel-club-court-4",
  type: "padel",
  surface: "artificial_grass",
  indoor: true,
  isActive: true,
  defaultPriceCents: 5000, // Price in cents
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
});
```

Restart the dev server to see the new court.

## Related Documentation

- [Mock Data Mode Overview](./MOCK_DATA_MODE.md)
- [TODO: Mock Data Cleanup](./TODO_MOCK_CLEANUP.md)
- [Copilot Settings](./.github/copilot-settings.md)

## Future Removal

This mock mode is temporary. When ready to remove:

1. Remove mock mode check from `/src/app/api/admin/courts/route.ts`
2. Remove or simplify `mockGetCourts()` in `/src/services/mockApiHandlers.ts`
3. Update or remove this documentation file
4. Test with real database to ensure functionality is preserved
