# Mock Data Implementation Summary

## Overview
This document summarizes the mock data implementation completed for the admin panel. This is a **temporary** solution to enable frontend development when the database is unavailable.

## Implementation Stats
- **API Routes Updated**: 15 files
- **Mock Mode Checks Added**: 37 instances
- **New Mock Handlers**: 20+ functions
- **Test Data**: 5 users, 3 organizations, 3 clubs, 7 courts, 5 bookings

## Routes with Mock Support

### Organizations Management (4 routes)
1. `GET /api/admin/organizations` - List organizations (already existed)
2. `POST /api/admin/organizations` - Create organization (already existed)
3. `PATCH /api/admin/organizations/[id]` - Update organization ✅ NEW
4. `DELETE /api/admin/organizations/[id]` - Delete organization ✅ NEW

### Organization Admin Management (3 routes)
5. `POST /api/admin/organizations/assign-admin` - Assign organization admin ✅ NEW
6. `POST /api/admin/organizations/remove-admin` - Remove organization admin ✅ NEW
7. `PATCH /api/admin/organizations/set-owner` - Set primary owner ✅ NEW

### Clubs Management (4 routes)
8. `GET /api/admin/clubs` - List clubs (already existed)
9. `POST /api/admin/clubs` - Create club (already existed)
10. `GET /api/admin/clubs/[id]` - Get club details ✅ NEW
11. `PUT /api/admin/clubs/[id]` - Update club ✅ NEW
12. `DELETE /api/admin/clubs/[id]` - Delete club ✅ NEW

### Courts Management (4 routes)
13. `GET /api/admin/courts` - List courts ✅ NEW
14. `GET /api/admin/clubs/[id]/courts/[courtId]` - Get court details ✅ NEW
15. `PATCH /api/admin/clubs/[id]/courts/[courtId]` - Update court ✅ NEW
16. `DELETE /api/admin/clubs/[id]/courts/[courtId]` - Delete court ✅ NEW

### Bookings Management (3 routes)
17. `GET /api/admin/bookings` - List bookings with filters (already existed)
18. `POST /api/admin/bookings/create` - Create booking (already existed)
19. `GET /api/admin/bookings/[id]` - Get booking details ✅ NEW
20. `PATCH /api/admin/bookings/[id]` - Update booking (cancel, etc.) ✅ NEW

### Users Management (3 routes)
21. `GET /api/admin/users` - Search users ✅ NEW
22. `POST /api/admin/users/[userId]/block` - Block user ✅ NEW
23. `POST /api/admin/users/[userId]/unblock` - Unblock user ✅ NEW

## Mock Data Structure

### Users (5 total)
- **Root Admin** (`user-1`, root@example.com) - Full system access
- **Org Admin** (`user-2`, orgadmin@example.com) - Manages "Padel Sports Inc"
- **Club Admin** (`user-3`, clubadmin@example.com) - Manages "Elite Padel Academy"
- **Player 1** (`user-4`, player@example.com) - Regular user
- **Player 2** (`user-5`, player2@example.com) - Regular user

### Organizations (3 total)
- **Padel Sports Inc** (`org-1`) - 2 clubs, active
- **Tennis & Padel Corp** (`org-2`) - 1 club, active
- **Archived Organization** (`org-3`) - 0 clubs, archived

### Clubs (3 total)
- **Downtown Padel Club** (`club-1`) - 3 courts (2 indoor, 1 outdoor), under org-1
- **Suburban Padel Center** (`club-2`) - 2 outdoor courts, under org-1
- **Elite Padel Academy** (`club-3`) - 2 professional indoor courts, under org-2

### Courts (7 total)
- `court-1` through `court-7` distributed across clubs
- Mix of indoor/outdoor
- Various surfaces (artificial grass, synthetic)
- Different pricing ($35-$50 per hour)

### Bookings (5 total)
- Mix of statuses: paid, pending, cancelled
- Various time slots (past, present, future)
- Distributed across different courts and users

### Memberships
- **Organization Memberships**: User-2 → org-1 (primary owner), User-3 → org-2
- **Club Memberships**: User-3 → club-3 (admin)

## Features Implemented

### Role-Based Access Control
All mock handlers respect RBAC:
- **Root Admin**: Full access to all data
- **Organization Admin**: Access to data within their managed organizations
- **Club Admin**: Access to data within their managed clubs

### CRUD Operations
Full CRUD support for:
- ✅ Organizations (Create, Read, Update, Delete)
- ✅ Clubs (Create, Read, Update, Delete)
- ✅ Courts (Read, Update, Delete)
- ✅ Bookings (Create, Read, Update)
- ✅ Users (Read, Block/Unblock)
- ✅ Admin assignments (Create, Delete)

### In-Memory State
- All data modifications are stored in memory
- Data resets on server restart (intentional for development)
- No persistence between sessions

## How to Use

### Enable Mock Mode
```bash
# Set environment variable
USE_MOCK_DATA=true npm run dev
```

Or in your `.env.local`:
```
USE_MOCK_DATA=true
```

### Verify Mock Mode
When mock mode is active, you'll see in the console:
```
🔧 MOCK DATA MODE ACTIVE
```

### Test Different Roles
Mock data includes users with different roles. Use these credentials in your auth system:
- Root admin: `root@example.com`
- Organization admin: `orgadmin@example.com`
- Club admin: `clubadmin@example.com`
- Players: `player@example.com`, `player2@example.com`

## Key Implementation Details

### Mock Handlers Location
All mock API handlers are in:
- `/src/services/mockDb.ts` - Data storage and initialization
- `/src/services/mockApiHandlers.ts` - API handler implementations

### Mock Mode Check
Each route checks mock mode with:
```typescript
import { isMockMode } from "@/services/mockDb";

if (isMockMode()) {
  // Use mock handlers
  const result = await mockGetSomething();
  return NextResponse.json(result);
}

// Normal database logic
```

### Code Markers
All mock mode code is marked with:
```typescript
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
```

## Limitations

### Not Implemented
- Complex relations (coaches, price rules, business hours)
- File uploads
- Audit logs
- Notifications
- Dashboard analytics (partially)
- Some edge case validations

### Known Differences from Real DB
- No transaction support
- No complex query capabilities
- Simplified validation rules
- No database constraints enforcement
- No cascade delete behaviors

## Testing Recommendations

### What to Test
✅ Navigation between pages
✅ List views with pagination
✅ Create/edit forms
✅ Delete operations
✅ Role-based UI visibility
✅ Filter and search functionality

### What NOT to Test
❌ Database constraints
❌ Complex business logic validation
❌ Performance with large datasets
❌ Concurrent user operations
❌ Data persistence

## Removal Instructions

When the database is stable and this feature is no longer needed:

1. Review `TODO_MOCK_CLEANUP.md` for detailed steps
2. Search for `TEMPORARY MOCK MODE` comments
3. Remove mock-related imports and code blocks
4. Delete mock service files
5. Remove `USE_MOCK_DATA` from `next.config.ts`
6. Update documentation

## Maintenance

### Adding New Mock Data
To add more mock entities, edit `/src/services/mockDb.ts`:
```typescript
// In initializeMockData()
mockClubs.push({
  id: "club-4",
  name: "New Club",
  // ... other fields
});
```

### Adding New Mock Handlers
To add handlers for new endpoints, edit `/src/services/mockApiHandlers.ts`:
```typescript
export async function mockGetNewThing(params: {...}) {
  // Implementation
}
```

Then add mock mode check in the route:
```typescript
if (isMockMode()) {
  const result = await mockGetNewThing(params);
  return NextResponse.json(result);
}
```

## Support

For issues or questions about mock data mode:
- Check `MOCK_DATA_MODE.md` for usage instructions
- Review implementation in `/src/services/mockApiHandlers.ts`
- See git history for implementation details
- Contact the team member who implemented this feature

---

**Status**: ✅ Complete
**Last Updated**: 2025-12-06
**Implemented By**: GitHub Copilot
