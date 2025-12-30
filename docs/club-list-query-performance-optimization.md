# Club List Query Performance Optimization

## Overview
This document describes the performance optimization applied to the club list query in `/api/admin/clubs` endpoint.

## Problem Statement
The original Prisma query for fetching the list of clubs was too slow (~15s for large datasets) because it was fetching deeply nested data that was not needed in the club list view:

1. **Nested bookings data**: `courts.bookings` was being fetched with booking IDs
2. **Club membership data**: `clubMemberships` with full user details (id, name, email) was being fetched
3. **Unnecessary calculations**: `bookingCount` was being calculated by iterating through all bookings

## Solution
The query has been refactored to fetch only the data needed for the club list view:

### Query Changes
**Before:**
```typescript
courts: {
  select: {
    id: true,
    indoor: true,
    bookings: {
      select: {
        id: true,
      },
    },
  },
},
clubMemberships: {
  where: {
    role: ClubMembershipRole.CLUB_ADMIN,
  },
  select: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
},
```

**After:**
```typescript
courts: {
  select: {
    id: true,
    indoor: true,
  },
},
// clubMemberships removed entirely
```

### Response Changes
**Removed fields:**
- `bookingCount` - No longer calculated or returned
- `admins` - No longer returned in the club list

**Retained fields:**
- `id`, `name`, `shortDescription`, `location`, `city`
- `contactInfo`, `openingHours`, `logoData`, `bannerData`
- `metadata`, `tags`, `isPublic`, `status`, `supportedSports`
- `createdAt`, `organizationId`
- `organization` (only `id` and `name`)
- `courtCount`, `indoorCount`, `outdoorCount` - Still calculated from courts

## Performance Impact
By removing the nested `bookings` and `clubMemberships` data:

1. **Reduced data transfer**: Significantly less data is transferred from the database to the application server
2. **Faster query execution**: Database query executes faster without the need to join and fetch nested relations
3. **Reduced memory usage**: Less data needs to be held in memory during processing
4. **Faster JSON serialization**: Smaller response payloads result in faster JSON serialization

### Expected Performance Improvement
For a database with:
- 100 clubs
- 500 courts (average 5 courts per club)
- 10,000 bookings (average 20 bookings per court)
- 200 club memberships

**Before:**
- Query fetches: 100 clubs + 500 courts + 10,000 bookings + 200 memberships = ~10,800 rows
- Response processing: Iterating through 10,000 bookings to count
- Estimated time: ~15 seconds

**After:**
- Query fetches: 100 clubs + 500 courts = 600 rows
- Response processing: Simple court counting
- Estimated time: <1 second

**Performance improvement: ~15x faster**

## UI/UX Changes
### Admin Clubs Page
- **Sort by Bookings** option has been replaced with **Sort by Courts**
- This is a more meaningful metric for the club list view since:
  - Court count is a stable, structural metric
  - Booking count fluctuates frequently and is more relevant to detailed analytics
  - AdminClubCard component only displays court information, not booking counts

### Backward Compatibility
- The TypeScript types still include `bookingCount?` and `admins?` as optional fields
- Existing components that may reference these fields will receive `undefined` and should handle it gracefully
- No breaking changes to the API contract - fields were already optional

## Query Parameters Still Supported
All existing query parameters continue to work:
- ✅ `whereClause` - Filtering based on various criteria (search, city, status, organizationId, sportType)
- ✅ `orderBy` - Sorting by name, city, or createdAt
- ✅ `skip` - Pagination offset
- ✅ `take` - Pagination limit

## Files Changed
1. `/src/app/api/admin/clubs/route.ts` - Query optimization
2. `/src/app/(pages)/admin/clubs/page.tsx` - UI sort option update
3. `/src/stores/useAdminClubStore.ts` - Store initialization update
4. `/src/__tests__/admin-clubs.test.ts` - Test expectations update

## Testing
All tests pass successfully:
```
Test Suites: 1 passed
Tests:       20 passed
```

## Future Considerations
If booking count or admin information is needed:
1. Implement separate endpoints for detailed views (e.g., `/api/admin/clubs/:id/statistics`)
2. Use aggregation queries for analytics dashboards
3. Consider caching strategies for frequently accessed metrics
