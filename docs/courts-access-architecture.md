# Courts Access Architecture

This document describes the separation of player and admin courts access flows.

## Overview

Courts data is now properly separated between player-facing and admin-facing concerns, with distinct endpoints and stores for each context.

## Architecture

### Player Courts Flow

**Purpose**: Public access to view available courts for booking

**Endpoint**: `/api/clubs/[clubId]/courts`
- Located at: `src/app/api/(player)/clubs/[id]/courts/route.ts`
- Access: Public (no authentication required for public clubs)
- Authorization: Checks `club.isPublic` and `organization.isPublic`

**Store**: `usePlayerClubStore`
- Property: `courtsByClubId[clubId]`
- Method: `ensureCourtsByClubId(clubId)`
- Data type: `PlayerClubCourt` (limited fields)

**Returned Fields**:
```typescript
{
  id: string
  name: string
  slug: string | null
  type: string | null
  surface: string | null
  indoor: boolean
  sportType: string
  defaultPriceCents: number
  createdAt: Date
  updatedAt: Date
}
```

**Usage Example**:
```tsx
// In player-facing pages
const courts = usePlayerClubStore(state => state.getCourtsForClub(clubId));
const ensureCourtsByClubId = usePlayerClubStore(state => state.ensureCourtsByClubId);

useEffect(() => {
  ensureCourtsByClubId(clubId).catch(console.error);
}, [clubId, ensureCourtsByClubId]);
```

---

### Admin Courts Flow

**Purpose**: Full CRUD operations for court management

**Endpoints**:
- List: `GET /api/admin/clubs/[clubId]/courts`
- Create: `POST /api/admin/clubs/[clubId]/courts`
- Get: `GET /api/admin/clubs/[clubId]/courts/[courtId]`
- Update: `PATCH /api/admin/clubs/[clubId]/courts/[courtId]`
- Delete: `DELETE /api/admin/clubs/[clubId]/courts/[courtId]`

**Authorization**: `requireClubAdmin(clubId)`
- Club Admins: Can manage courts in their clubs
- Organization Admins: Can manage courts in clubs under their organizations
- Root Admins: Can manage all courts

**Store**: `useAdminCourtsStore`
- Property: `courtsByClubId[clubId]`
- Method: `fetchCourtsIfNeeded(clubId)`
- Data type: `Court` (full fields including admin-only data)

**Returned Fields**:
```typescript
{
  id: string
  clubId: string
  name: string
  slug: string | null
  type: string | null
  surface: string | null
  indoor: boolean
  sportType: string
  isActive: boolean          // Admin-only
  defaultPriceCents: number
  createdAt: Date
  updatedAt: Date
  bookingCount: number       // Admin-only (when included)
}
```

**Usage Example**:
```tsx
// In admin pages
const courts = useAdminCourtsStore(state => state.getCourtsForClub(clubId));
const fetchCourtsIfNeeded = useAdminCourtsStore(state => state.fetchCourtsIfNeeded);

useEffect(() => {
  fetchCourtsIfNeeded(clubId).catch(console.error);
}, [clubId, fetchCourtsIfNeeded]);
```

---

## Store Separation Rules

### ✅ DO

- Use `usePlayerClubStore` for player-facing pages (clubs list, club detail, booking pages)
- Use `useAdminCourtsStore` for admin pages (operations, court management)
- Keep player and admin data flows completely separate
- Ensure player endpoints only expose public, booking-relevant data
- Ensure admin endpoints return full operational data

### ❌ DON'T

- ❌ Use `useCourtStore` for new code (deprecated, legacy only)
- ❌ Share stores between player and admin contexts
- ❌ Expose admin-only fields (`isActive`, `bookingCount`) to players
- ❌ Store admin-level data in player stores
- ❌ Reuse admin endpoints for player-facing features

---

## Migration Guide

### From `useCourtStore` to Context-Specific Stores

**For Player Pages:**
```typescript
// OLD (deprecated)
import { useCourtStore } from "@/stores/useCourtStore";
const courts = useCourtStore(state => state.courts);

// NEW (correct)
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";
const courts = usePlayerClubStore(state => state.getCourtsForClub(clubId));
```

**For Admin Pages:**
```typescript
// OLD (deprecated)
import { useCourtStore } from "@/stores/useCourtStore";
const { courts, fetchCourtsIfNeeded } = useCourtStore();

// NEW (correct)
import { useAdminCourtsStore } from "@/stores/useAdminCourtsStore";
const courts = useAdminCourtsStore(state => state.getCourtsForClub(clubId));
const fetchCourtsIfNeeded = useAdminCourtsStore(state => state.fetchCourtsIfNeeded);
```

---

## Security Benefits

1. **Principle of Least Privilege**: Players only see public court data needed for booking
2. **Authorization Enforcement**: Admin operations strictly protected by role-based access control
3. **Data Isolation**: Player and admin state cannot interfere with each other
4. **Audit Trail**: Clear separation makes it easier to track who accessed what data
5. **No Privilege Escalation**: Players cannot access admin endpoints or admin-level data

---

## Testing

Tests verifying the separation are in:
- `src/__tests__/courts-access-separation.test.ts`
- `src/__tests__/courts-api.test.ts`

Key test scenarios:
- ✅ Player endpoint allows public access to public clubs
- ✅ Player endpoint denies access to private clubs
- ✅ Admin endpoint requires authorization
- ✅ Admin endpoint returns full court details with admin fields
- ✅ Player endpoint does not expose admin-only fields
- ✅ Court creation requires admin authorization
