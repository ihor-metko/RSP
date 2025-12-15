# Role-Based User List Access Implementation

## Overview

This document describes the implementation of role-based access control for the user list feature, which allows Organization Admins and Club Admins to view users within their scope.

## Implementation Date

December 2025

## Access Control Rules

### Root Admin
- **Access**: Full access to all users in the system
- **Scope**: No restrictions
- **Use Case**: Platform-wide user management

### Organization Admin
- **Access**: Only users who are members of clubs belonging to their organization(s)
- **Scope**: Limited to clubs within their organization(s)
- **Use Case**: Managing users across all clubs in an organization

### Club Admin
- **Access**: Only users who are members of their specific club(s)
- **Scope**: Limited to their specific club(s)
- **Use Case**: Managing club members

## Technical Implementation

### Backend Changes

#### API Endpoint: `GET /api/admin/users/list`

**Location**: `/src/app/api/admin/users/list/route.ts`

**Changes Made**:
1. Replaced `requireRootAdmin` with `requireAnyAdmin` to allow all admin types
2. Added scope-based filtering logic:
   - For Root Admin: No additional filters (see all users)
   - For Organization Admin: Filter users by club membership in clubs belonging to their organizations
   - For Club Admin: Filter users by club membership in their specific clubs

**Filter Logic**:

```typescript
if (!isRoot) {
  if (adminType === "organization_admin") {
    // Organization admins: use nested query to filter by organization
    // This avoids a separate database call for clubs lookup
    whereConditions.push({
      clubMemberships: {
        some: {
          club: {
            organizationId: { in: managedIds }
          }
        }
      }
    });
  } else if (adminType === "club_admin") {
    // Club admins: filter directly by club IDs
    whereConditions.push({
      clubMemberships: {
        some: {
          clubId: { in: managedIds }
        }
      }
    });
  }
}
```

**Performance Optimization**: The organization admin filter uses a nested Prisma query instead of a separate database call to fetch clubs. This reduces the number of database round trips from 2 to 1.

### Frontend Changes

**Location**: `/src/app/(pages)/admin/users/page.tsx`

**Status**: No changes required

**Reason**: The page already checks for any admin role (`ROOT_ADMIN`, `ORGANIZATION_ADMIN`, `CLUB_ADMIN`) and delegates filtering to the backend API. The existing UI components handle empty states and scoped results gracefully.

### Store

**Location**: `/src/stores/useAdminUsersStore.ts`

**Status**: No changes required

**Reason**: The store already calls the correct API endpoint (`/api/admin/users/list`) and handles pagination, filtering, and error states properly.

## Data Flow

```
User (Org/Club Admin) 
  ↓
Frontend Page (/admin/users)
  ↓
Zustand Store (useAdminUsersStore)
  ↓
API Endpoint (/api/admin/users/list)
  ↓
requireAnyAdmin helper (authorization)
  ↓
Scope-based filtering logic
  ↓
Prisma query with filters
  ↓
Filtered user list returned
```

## Examples

### Example 1: Organization Admin Access

**Scenario**: An organization admin manages "Org A" which has "Club 1" and "Club 2"

**API Request**:
```
GET /api/admin/users/list?page=1&pageSize=25
Authorization: Bearer <org_admin_token>
```

**Backend Processing**:
1. `requireAnyAdmin` verifies user is an organization admin for "Org A"
2. Apply nested filter: users who have club membership in clubs where `organizationId` is in ["Org A"]
3. Return filtered user list

**Result**: Only users who are members of clubs belonging to "Org A" are returned (e.g., Club 1 or Club 2)

### Example 2: Club Admin Access

**Scenario**: A club admin manages "Club 1"

**API Request**:
```
GET /api/admin/users/list?page=1&pageSize=25
Authorization: Bearer <club_admin_token>
```

**Backend Processing**:
1. `requireAnyAdmin` verifies user is a club admin for "Club 1"
2. Filter users who have club membership in ["Club 1"]
3. Return filtered user list

**Result**: Only users who are members of Club 1 are returned

### Example 3: Root Admin Access

**Scenario**: A root admin accesses the user list

**API Request**:
```
GET /api/admin/users/list?page=1&pageSize=25
Authorization: Bearer <root_admin_token>
```

**Backend Processing**:
1. `requireAnyAdmin` verifies user is a root admin
2. No scope filters applied (isRoot = true)
3. Return all users

**Result**: All users in the system are returned

## Security Considerations

### Server-Side Enforcement
- All authorization checks are performed server-side in the API endpoint
- Frontend role checks are for UX only and cannot be bypassed
- The `requireAnyAdmin` helper ensures proper authentication and authorization

### Access Isolation
- Organization admins cannot see users from other organizations
- Club admins cannot see users from clubs they don't manage
- Users without any admin role cannot access the endpoint at all

### Data Minimization
- Only necessary user data is returned (name, email, role, activity, bookings)
- Sensitive user information is not exposed in list view
- Detailed information requires separate authorization for individual user access

## Testing

### Unit Tests

**Location**: `/src/__tests__/admin-users-list-scoped.test.ts`

**Test Coverage**:
- ✅ Root admin can access all users
- ✅ Organization admin can only access users from their organization's clubs
- ✅ Club admin can only access users from their specific club(s)
- ✅ Unauthorized users receive 401
- ✅ Non-admin users receive 403
- ✅ Pagination works with scoped results
- ✅ Search and filters work within scope
- ✅ Empty organizations (no clubs) return empty results

### Manual Testing

To manually test the implementation:

1. **As Root Admin**:
   - Login as a root admin
   - Navigate to `/admin/users`
   - Verify all users are visible

2. **As Organization Admin**:
   - Login as an organization admin
   - Navigate to `/admin/users`
   - Verify only users from clubs in your organization are visible
   - Try searching - verify results are still scoped

3. **As Club Admin**:
   - Login as a club admin
   - Navigate to `/admin/users`
   - Verify only users from your club(s) are visible
   - Try filtering - verify results are still scoped

4. **As Regular User**:
   - Login as a regular user (no admin role)
   - Try to navigate to `/admin/users`
   - Verify access is denied (redirected or error)

## Future Enhancements

### Possible Improvements
1. **Caching**: Add caching layer for organization → clubs mapping to reduce database queries
2. **Metrics**: Add logging/metrics for access patterns and performance monitoring
3. **Bulk Operations**: Allow scoped bulk operations (e.g., export users within scope)
4. **Cross-Organization Views**: Allow root admins to view users by organization filter

### Performance Considerations
- The implementation uses a single database query with nested filters (no separate club lookup)
- Database indexes on `Club.organizationId` and `ClubMembership.clubId` are essential for performance
- The nested query approach scales well even for organizations with 100+ clubs
- For extremely large datasets, consider adding a composite index on `(ClubMembership.clubId, ClubMembership.userId)`

## Related Files

- `/src/lib/requireRole.ts` - Authorization helpers
- `/src/constants/roles.ts` - Role definitions
- `/src/stores/useUserStore.ts` - User role management
- `/src/stores/useAdminUsersStore.ts` - User list state management
- `/src/app/(pages)/admin/users/page.tsx` - User list frontend
- `/prisma/schema.prisma` - Database schema

## Compliance

This implementation follows the project guidelines:
- ✅ Uses centralized `requireRole` helpers (specifically `requireAnyAdmin`)
- ✅ Reuses existing UI components (`components/ui/*`)
- ✅ Uses `im-*` semantic classes for styling
- ✅ Follows TypeScript best practices
- ✅ Server-side authorization only (no frontend bypasses)
- ✅ Uses Zustand for state management
- ✅ Includes comprehensive unit tests

## References

- GitHub Copilot Settings: `.github/copilot-settings.md`
- Original Issue: "Implement Role-Based User List Access"
