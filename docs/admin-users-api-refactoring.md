# Admin Users API Refactoring

## Overview

This document describes the refactoring of the admin users API endpoints, consolidating two separate endpoints into a single, unified endpoint.

## Changes Made

### Before

The system had two separate endpoints:

1. **`GET /api/admin/users`** - Simple user list for autocomplete/search
   - Limited to 50 results
   - Basic fields only (id, name, email, organization info)
   - Search via `?q=` parameter

2. **`GET /api/admin/users/list`** - Full paginated user list
   - Complete filtering and pagination
   - Full user details with bookings, memberships, etc.
   - Advanced filtering options

### After

Single unified endpoint:

**`GET /api/admin/users`** - Unified endpoint supporting both modes

#### Query Parameters

##### Mode Selection
- `simple` - Boolean (default: false). When true, returns simple user list for autocomplete

##### Search & Filtering (Both Modes)
- `q` or `search` - Search query (name, email, or ID)
- `role` - Filter by role: `root_admin`, `organization_admin`, `club_admin`, `user`
- `organizationId` - Filter by organization membership
- `clubId` - Filter by club membership
- `status` - Filter by status: `active`, `blocked`, `suspended`, `invited`, `deleted`

##### Pagination (Full Mode Only)
- `page` - Page number (default: 1)
- `limit` or `pageSize` - Results per page (default: 25, max: 100)

##### Sorting (Full Mode Only)
- `sortBy` - Sort field: `name`, `email`, `createdAt`, `lastLoginAt`, `lastActive`, `totalBookings`
- `sortOrder` - Sort order: `asc`, `desc` (default: `desc`)

##### Date Filters (Full Mode Only)
- `dateRangeField` - Field to filter: `createdAt`, `lastActive`
- `dateFrom` - Start date (ISO format)
- `dateTo` - End date (ISO format)

##### Quick Filters (Full Mode Only)
- `activeLast30d` - Boolean, filter users active in last 30 days
- `neverBooked` - Boolean, filter users who never made a booking
- `showOnlyAdmins` - Boolean, show only admin users
- `showOnlyUsers` - Boolean, show only regular users

## Examples

### Simple Mode (Autocomplete)

```bash
# Get all users (simple)
GET /api/admin/users?simple=true

# Search users (simple)
GET /api/admin/users?simple=true&q=john
```

Response:
```json
[
  {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "isOrgAdmin": true,
    "organizationName": "Test Organization"
  }
]
```

### Full Mode (Paginated List)

```bash
# Get paginated users with filters
GET /api/admin/users?page=1&limit=25&role=organization_admin&search=john

# Get users from specific organization
GET /api/admin/users?organizationId=org-123&page=1&limit=10

# Get active users sorted by last login
GET /api/admin/users?status=active&sortBy=lastLoginAt&sortOrder=desc
```

Response:
```json
{
  "users": [
    {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "organization_admin",
      "organization": {
        "id": "org-123",
        "name": "Test Organization"
      },
      "club": null,
      "blocked": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "totalBookings": 42,
      "bookingsLast30d": 5
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "limit": 25,
    "totalCount": 100,
    "totalPages": 4
  }
}
```

## Store Integration

The Zustand store (`useAdminUsersStore`) has been updated to use the unified endpoint:

### `fetchUsers(options)`
Uses full mode for paginated user lists:
```typescript
await fetchUsers({ 
  page: 1, 
  pageSize: 25, 
  filters: { 
    search: "john",
    role: "organization_admin" 
  } 
});
```

### `fetchSimpleUsers(query)`
Uses simple mode for autocomplete:
```typescript
await fetchSimpleUsers("john");
```

## Backward Compatibility

- `pageSize` parameter is still supported as an alias for `limit`
- Both `q` and `search` parameters work for searching
- All existing UI components continue to work without changes

## Migration Guide

### For API Consumers

If you were using `/api/admin/users/list`, update to `/api/admin/users`:

```diff
- GET /api/admin/users/list?page=1&pageSize=25
+ GET /api/admin/users?page=1&limit=25
```

### For Store Users

No changes required! The store API remains the same:

```typescript
// Still works exactly the same
const { users, loading, fetchUsers } = useAdminUsersStore();

useEffect(() => {
  fetchUsers({ page: 1, pageSize: 10 });
}, []);
```

## Testing

Comprehensive test suite added in `src/__tests__/unified-admin-users-api.test.ts`:

- ✓ Simple mode with search
- ✓ Full mode with pagination
- ✓ All filter parameters
- ✓ Authorization checks
- ✓ Backward compatibility

All 9 tests passing.

## Security

- ✓ CodeQL security scan completed with no vulnerabilities
- ✓ Authorization check via `requireRootAdmin` maintained
- ✓ SQL injection protected via Prisma ORM
- ✓ Input validation for all parameters

## Benefits

1. **Simplified API surface** - One endpoint instead of two
2. **Better maintainability** - Single source of truth for user queries
3. **Flexible querying** - Same endpoint serves both simple and complex use cases
4. **Type safety** - Improved TypeScript types with switch statements
5. **Reliable date handling** - Fixed date calculations for cross-month scenarios
6. **Full test coverage** - Comprehensive test suite ensures reliability
