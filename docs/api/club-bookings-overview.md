# Club Bookings Overview API

## Overview

This document describes the Club Bookings Overview API endpoint, which provides an optimized way to retrieve booking statistics and preview data for a specific club.

## Endpoint

```
GET /api/admin/clubs/:clubId/bookings/overview
```

## Purpose

The Bookings Overview endpoint was created to optimize the Club Detail page by replacing three separate API requests with a single, efficient request. This reduces:
- Network overhead (3 requests → 1 request)
- Database load (3 queries with full result sets → aggregation queries)
- Response size (full booking lists → counts + limited preview)

## Authorization

This endpoint uses role-based access control through the `requireAnyAdmin` helper. Access is granted to:

- **Root Admin**: Can access any club
- **Organization Admin**: Can access clubs within their managed organizations
- **Club Owner**: Can access clubs they own
- **Club Admin**: Can access clubs they manage

## Request

### URL Parameters

- `clubId` (required): The ID of the club to retrieve booking overview for

### Example

```
GET /api/admin/clubs/club-123/bookings/overview
```

## Response

### Success (200 OK)

```json
{
  "todayCount": 5,
  "weekCount": 15,
  "upcomingCount": 50,
  "upcomingBookings": [
    {
      "id": "booking-1",
      "courtName": "Court 1",
      "clubName": "Tennis Club",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "start": "2026-01-02T10:00:00.000Z",
      "end": "2026-01-02T11:00:00.000Z",
      "status": "Active",
      "sportType": "PADEL"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `todayCount` | number | Number of bookings for today (midnight to midnight) |
| `weekCount` | number | Number of bookings for the next 7 days |
| `upcomingCount` | number | Total number of upcoming bookings (from now onwards) |
| `upcomingBookings` | array | Array of up to 10 nearest upcoming bookings |

### Booking Preview Item

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Booking ID |
| `courtName` | string | Name of the court |
| `clubName` | string | Name of the club |
| `userName` | string \| null | Name of the user who made the booking |
| `userEmail` | string | Email of the user who made the booking |
| `start` | string | Booking start time (ISO 8601) |
| `end` | string | Booking end time (ISO 8601) |
| `status` | string | Booking status (Active, Pending, Cancelled, etc.) |
| `sportType` | string | Type of sport (PADEL, TENNIS, etc.) |

### Error Responses

#### 401 Unauthorized
User is not authenticated.

```json
{
  "error": "Unauthorized"
}
```

#### 403 Forbidden
User does not have permission to access this club.

```json
{
  "error": "Forbidden"
}
```

#### 404 Not Found
Club does not exist.

```json
{
  "error": "Club not found"
}
```

#### 500 Internal Server Error
Server error occurred.

```json
{
  "error": "Internal server error"
}
```

## Implementation Details

### Date Ranges

- **Today**: From midnight (00:00:00) to end of day (23:59:59) in local time
- **Week**: From today (00:00:00) to 7 days from now
- **Upcoming**: From current time onwards

### Performance Optimizations

1. **Aggregation**: Uses Prisma's `count()` method instead of fetching full result sets
2. **Limited Preview**: Returns only 10 upcoming bookings instead of all
3. **Single Request**: Consolidates 3 separate API calls into one
4. **Parallel Queries**: Executes all database queries in parallel using `Promise.all()`

### Database Queries

The endpoint executes 4 queries in parallel:

1. Count bookings today
2. Count bookings this week
3. Count all upcoming bookings
4. Fetch 10 nearest upcoming bookings (with related data)

## Frontend Integration

### Zustand Store

The endpoint is consumed by the `useClubBookingsStore` Zustand store:

```typescript
const previewData = await fetchBookingsPreviewIfNeeded(clubId);
```

### Club Detail Page

The Club Detail page uses the store through the `useClubPageData` hook:

```typescript
const { bookingsPreview, bookingsLoading } = useClubPageData(clubId);
```

## Migration Notes

### Before (Legacy Implementation)

The legacy implementation made 3 separate API calls:
1. `/api/admin/bookings?clubId=X&dateFrom=today&dateTo=tomorrow&perPage=100`
2. `/api/admin/bookings?clubId=X&dateFrom=today&dateTo=weekFromNow&perPage=100`
3. `/api/admin/bookings?clubId=X&dateFrom=today&perPage=10`

### After (Optimized Implementation)

The new implementation makes a single API call:
1. `/api/admin/clubs/:clubId/bookings/overview`

### Benefits

- **67% reduction** in network requests (3 → 1)
- **Faster response time** due to aggregation instead of full data retrieval
- **Reduced bandwidth** by returning counts instead of full booking lists
- **Better scalability** as database queries use indexes for counting

## Testing

Comprehensive tests are available in `/src/__tests__/admin-club-bookings-overview-api.test.ts`:

- ✅ Unauthorized access (401)
- ✅ Club not found (404)
- ✅ Organization admin without access (403)
- ✅ Club admin without access (403)
- ✅ Root admin access
- ✅ Organization admin with valid access
- ✅ Club admin with valid access
- ✅ Error handling

## Future Enhancements

Potential improvements for future iterations:

1. Add pagination for upcoming bookings preview
2. Add filtering options (e.g., by court, status)
3. Add caching at the API level for frequently accessed clubs
4. Add date range parameters for custom time periods
5. Include revenue statistics in the response
