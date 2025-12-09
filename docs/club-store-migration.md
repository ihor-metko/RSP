# Club Store Migration Guide

## Overview

This document describes the migration to idempotent, concurrency-safe methods in `useClubStore`. The new methods prevent duplicate API calls when multiple components mount concurrently and provide better caching support.

## What Changed

### New Store Methods

#### 1. `fetchClubsIfNeeded({ force?: boolean }): Promise<void>`

**Replaces:** Direct `fetch('/api/admin/clubs')` calls or `fetchClubs()` in components that need club lists.

**Behavior:**
- If `!force` and clubs are already loaded → returns immediately (no network call)
- If an inflight request exists → returns that Promise (no new network call)
- Otherwise → fetches clubs and updates store

**Usage:**
```typescript
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);

useEffect(() => {
  fetchClubsIfNeeded().catch(console.error);
}, [fetchClubsIfNeeded]);
```

#### 2. `ensureClubById(id: string, { force?: boolean }): Promise<ClubDetail>`

**Replaces:** Direct `fetch('/api/admin/clubs/:id')` calls or `fetchClubById(id)` when you need single club details.

**Behavior:**
- If `!force` and club is cached → returns cached club immediately
- If an inflight request for this ID exists → returns that Promise
- Otherwise → fetches club and caches in `clubsById`

**Usage:**
```typescript
const ensureClubById = useClubStore(s => s.ensureClubById);

useEffect(() => {
  ensureClubById(clubId).catch(console.error);
}, [ensureClubById, clubId]);

// Read cached club
const club = useClubStore(state => state.clubsById[clubId]);
```

#### 3. `invalidateClubs(): void`

**Purpose:** Clears all club caches, forcing next fetch to retrieve fresh data.

**Usage:**
```typescript
const invalidateClubs = useClubStore(state => state.invalidateClubs);

// After creating/updating/deleting a club
invalidateClubs();
await fetchClubsIfNeeded({ force: true });
```

### New Store State

- `clubsById: Record<string, ClubDetail>` - Cache for individual club details
- `loadingClubs: boolean` - Loading state for clubs operations
- `clubsError: string | null` - Error state for clubs operations
- `lastFetchedAt: number | null` - Timestamp for TTL-based refresh (future use)

## Migrated Components

The following components were updated to use the new store methods:

### 1. AdminQuickBookingWizard
**Location:** `src/components/AdminQuickBookingWizard/AdminQuickBookingWizard.tsx`

**Before:**
```typescript
const response = await fetch("/api/admin/clubs");
const data = await response.json();
```

**After:**
```typescript
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);

await fetchClubsIfNeeded();
const storeClubs = useClubStore.getState().clubs;
```

**Benefit:** Multiple wizard instances mounting simultaneously now share a single network request.

---

### 2. AdminOrganizationsPage
**Location:** `src/app/(pages)/admin/organizations/page.tsx`

**Before:**
```typescript
const response = await fetch(`/api/admin/clubs`);
const data = await response.json();
const orgClubsList = data.filter(club => club.organization?.id === orgId);
```

**After:**
```typescript
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);

await fetchClubsIfNeeded();
const allClubs = useClubStore.getState().clubs;
const orgClubsList = allClubs.filter(club => club.organization?.id === orgId);
```

**Benefit:** Organization modal opening no longer triggers duplicate requests if clubs already loaded.

---

### 3. AdminBookingsPage
**Location:** `src/app/(pages)/admin/bookings/page.tsx`

**Before:**
```typescript
const clubsResponse = await fetch("/api/admin/clubs");
const clubsData = await clubsResponse.json();
```

**After:**
```typescript
await useClubStore.getState().fetchClubsIfNeeded();
const clubsData = useClubStore.getState().clubs;
```

**Benefit:** Filter options load from cache if available, reducing page load time.

---

### 4. AdminUsersPage
**Location:** `src/app/(pages)/admin/users/page.tsx`

**Before:**
```typescript
const response = await fetch("/api/admin/clubs");
const data = await response.json();
```

**After:**
```typescript
await useClubStore.getState().fetchClubsIfNeeded();
const data = useClubStore.getState().clubs;
```

**Benefit:** Users page loads faster when clubs already cached from other admin pages.

---

### 5. PlayerQuickBooking
**Location:** `src/components/PlayerQuickBooking/PlayerQuickBooking.tsx`

**Before:**
```typescript
const fetchClubsFromStore = useClubStore(state => state.fetchClubs);
await fetchClubsFromStore();
```

**After:**
```typescript
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);
await fetchClubsIfNeeded();
```

**Benefit:** Player booking wizard benefits from same deduplication and caching.

## SSR Considerations

### Important: Server-Side Rendering

**The client-side store should NOT be relied upon for SSR logic.**

For server-side pages (using `getServerSideProps` or App Router server components):

1. **Fetch data server-side** as usual:
```typescript
export async function getServerSideProps(context) {
  const response = await fetch(`${API_BASE_URL}/api/admin/clubs`);
  const clubs = await response.json();
  
  return {
    props: { clubs }
  };
}
```

2. **Optionally hydrate the store** to avoid client-side refetch:
```typescript
'use client';

function ClubPage({ clubs }) {
  useEffect(() => {
    // Hydrate store with server data
    useClubStore.getState().setClubs(clubs);
  }, [clubs]);
  
  // Now fetchClubsIfNeeded() will use cached data
}
```

## Testing

### Unit Tests

Comprehensive tests added in `src/__tests__/useClubStore.test.ts`:

- ✅ `fetchClubsIfNeeded` fetches when clubs empty
- ✅ `fetchClubsIfNeeded` skips fetch when clubs exist
- ✅ `fetchClubsIfNeeded({ force: true })` forces network call
- ✅ Concurrent calls result in single network request
- ✅ `ensureClubById` returns cached club when available
- ✅ `ensureClubById` fetches when not cached
- ✅ Error handling clears inflight guards
- ✅ `invalidateClubs()` clears all caches

### Integration Testing Checklist

When testing your application:

- [ ] Open multiple pages that fetch clubs concurrently (e.g., clubs list, org page, booking wizard)
- [ ] Verify only ONE network call to `/api/admin/clubs` in Network DevTools
- [ ] Navigate to a club detail page, verify it uses `ensureClubById`
- [ ] Go back and forth between pages, confirm clubs load instantly from cache
- [ ] Call `invalidateClubs()` in console, verify next page triggers fresh fetch
- [ ] Create/update/delete a club, verify UI updates correctly

## Migration Patterns

### Pattern 1: Simple Club List Fetch

**Before:**
```typescript
useEffect(() => {
  const load = async () => {
    const response = await fetch('/api/admin/clubs');
    const data = await response.json();
    setClubs(data);
  };
  load();
}, []);
```

**After:**
```typescript
const clubs = useClubStore(state => state.clubs);
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);

useEffect(() => {
  fetchClubsIfNeeded().catch(console.error);
}, [fetchClubsIfNeeded]);
```

---

### Pattern 2: Single Club Fetch

**Before:**
```typescript
useEffect(() => {
  const load = async () => {
    const response = await fetch(`/api/admin/clubs/${clubId}`);
    const data = await response.json();
    setClub(data);
  };
  load();
}, [clubId]);
```

**After:**
```typescript
const club = useClubStore(state => state.clubsById[clubId]);
const ensureClubById = useClubStore(state => state.ensureClubById);

useEffect(() => {
  ensureClubById(clubId).catch(console.error);
}, [ensureClubById, clubId]);
```

---

### Pattern 3: Force Refresh

**Before:**
```typescript
const handleRefresh = async () => {
  const response = await fetch('/api/admin/clubs');
  const data = await response.json();
  setClubs(data);
};
```

**After:**
```typescript
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);

const handleRefresh = async () => {
  await fetchClubsIfNeeded({ force: true });
};
```

---

### Pattern 4: After Mutation

**Before:**
```typescript
const handleCreateClub = async (data) => {
  await fetch('/api/admin/clubs/new', { method: 'POST', body: JSON.stringify(data) });
  // Refetch to show new club
  const response = await fetch('/api/admin/clubs');
  const clubs = await response.json();
  setClubs(clubs);
};
```

**After:**
```typescript
const createClub = useClubStore(state => state.createClub);
const invalidateClubs = useClubStore(state => state.invalidateClubs);

const handleCreateClub = async (data) => {
  await createClub(data); // Store optimistically updates clubs
  // Optional: invalidate if you need to force refresh from server
  // invalidateClubs();
  // await fetchClubsIfNeeded({ force: true });
};
```

## Benefits

### Performance Improvements
- 🚀 **Reduced Network Calls:** Concurrent component mounts result in single network request
- ⚡ **Instant Navigation:** Cached data loads instantly when navigating between pages
- 💾 **Memory Efficient:** Single source of truth in Zustand store

### Developer Experience
- 🛡️ **Type-Safe:** Full TypeScript support with proper interfaces
- 🧪 **Well-Tested:** 36 unit tests covering all scenarios
- 📚 **Clear API:** Simple, intuitive method names

### Code Quality
- 🔒 **Race Condition Prevention:** Inflight guards prevent duplicate/conflicting requests
- 🎯 **Single Responsibility:** Store manages all club data fetching
- 🔄 **Backward Compatible:** Existing `fetchClubs`/`fetchClubById` still work

## Troubleshooting

### Issue: Data Not Updating After Mutation

**Solution:** Call `invalidateClubs()` after creating/updating/deleting clubs:
```typescript
await createClub(data);
invalidateClubs();
await fetchClubsIfNeeded({ force: true });
```

---

### Issue: Stale Data Showing

**Solution:** Use force parameter to bypass cache:
```typescript
await fetchClubsIfNeeded({ force: true });
```

---

### Issue: TypeScript Error with clubsById

**Solution:** Check for undefined before accessing:
```typescript
const club = useClubStore(state => state.clubsById[clubId]);
if (!club) {
  // Handle loading or not found
  return <LoadingSpinner />;
}
```

## Future Enhancements

Potential improvements for future PRs:

1. **TTL-based Auto-refresh:** Use `lastFetchedAt` to auto-refresh after X minutes
2. **Pagination Support:** Add `fetchClubsPageIfNeeded(page)` for large club lists
3. **Optimistic Updates:** Enhance create/update methods with optimistic UI updates
4. **WebSocket Integration:** Real-time updates from server push events
5. **Persistent Cache:** Store clubs in localStorage for faster initial load

## Questions?

For issues or questions about this migration:
- Review the test file: `src/__tests__/useClubStore.test.ts`
- Check the store implementation: `src/stores/useClubStore.ts`
- Refer to migrated component examples above
