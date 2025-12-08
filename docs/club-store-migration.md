# Club Store Migration Guide

## Overview

This document describes the migration of club data management to the centralized Zustand `useClubStore`. The goal is to have a single source of truth for club data across the application.

## Store Location

**File**: `src/stores/useClubStore.ts`

## When to Use the Store

### Use the Store When:

1. **Fetching all clubs** (simple list without complex filtering)
   ```typescript
   const clubs = useClubStore((state) => state.clubs);
   const fetchClubs = useClubStore((state) => state.fetchClubs);
   
   useEffect(() => {
     fetchClubs();
   }, [fetchClubs]);
   ```

2. **Fetching a single club by ID**
   ```typescript
   const currentClub = useClubStore((state) => state.currentClub);
   const fetchClubById = useClubStore((state) => state.fetchClubById);
   
   useEffect(() => {
     fetchClubById(clubId);
   }, [clubId, fetchClubById]);
   ```

3. **Creating a new club**
   ```typescript
   const createClub = useClubStore((state) => state.createClub);
   
   const handleCreate = async (data: CreateClubPayload) => {
     await createClub(data);
     // Store automatically updates clubs list
   };
   ```

4. **Updating a club**
   ```typescript
   const updateClub = useClubStore((state) => state.updateClub);
   
   const handleUpdate = async (id: string, data: UpdateClubPayload) => {
     await updateClub(id, data);
     // Store automatically updates clubs list and currentClub
   };
   ```

5. **Deleting a club**
   ```typescript
   const deleteClub = useClubStore((state) => state.deleteClub);
   
   const handleDelete = async (id: string) => {
     await deleteClub(id);
     // Store automatically removes club from list and clears currentClub
   };
   ```

### Use Direct API Calls When:

1. **Server-side filtering with query parameters**
   - Examples: Search, city filter, status filter, pagination
   - Pages: `/admin/clubs`, `/(player)/clubs`
   - Reason: Store doesn't support complex query parameters

2. **SSR/Server Components**
   - Server-rendered pages that need club data at build time
   - Reason: Zustand is a client-side store

3. **Specialized endpoints**
   - Section updates (`/api/admin/clubs/:id/section`)
   - Image uploads
   - Admin-specific operations not part of basic CRUD

## Store API Reference

### State

```typescript
interface ClubState {
  clubs: ClubWithCounts[];      // List of all clubs
  currentClub: ClubDetail | null; // Currently selected/viewed club
  loading: boolean;              // Loading state
  error: string | null;          // Error message
}
```

### Actions

- `fetchClubs()` - Fetch all clubs (GET /api/admin/clubs)
- `fetchClubById(id)` - Fetch single club (GET /api/admin/clubs/:id)
- `createClub(payload)` - Create new club (POST /api/admin/clubs/new)
- `updateClub(id, payload)` - Update club (PUT /api/admin/clubs/:id)
- `deleteClub(id)` - Delete club (DELETE /api/admin/clubs/:id)
- `setClubs(clubs)` - Manually set clubs list
- `setCurrentClub(club)` - Manually set current club
- `clearCurrentClub()` - Clear current club

### Selectors

- `getClubById(id)` - Get club from clubs list by ID
- `isClubSelected(id)` - Check if club is currently selected

## Migrated Files

### Admin Pages
- ✅ `/admin/clubs/[id]/page.tsx` - Uses store for fetch, update, delete
- ⏭️ `/admin/clubs/page.tsx` - Keeps direct API (complex filtering)

### Player Pages
- ✅ `/(player)/dashboard/page.tsx` - Uses store for fetch
- ✅ `/(player)/clubs/[id]/page.tsx` - Uses store for fetch by ID
- ⏭️ `/(player)/clubs/page.tsx` - Keeps direct API (search/filtering)

### Components
- ✅ `PersonalizedSection.tsx` - Uses store for fetch
- ✅ `PlayerQuickBooking.tsx` - Uses store for fetch

## Migration Patterns

### Pattern 1: Replace useState + fetch

**Before:**
```typescript
const [clubs, setClubs] = useState<Club[]>([]);
const [loading, setLoading] = useState(true);

const fetchClubs = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/clubs');
    const data = await response.json();
    setClubs(data);
  } finally {
    setLoading(false);
  }
};
```

**After:**
```typescript
const clubs = useClubStore((state) => state.clubs);
const loading = useClubStore((state) => state.loading);
const fetchClubs = useClubStore((state) => state.fetchClubs);

useEffect(() => {
  fetchClubs();
}, [fetchClubs]);
```

### Pattern 2: Single club fetch

**Before:**
```typescript
const [club, setClub] = useState<Club | null>(null);

useEffect(() => {
  const fetchClub = async () => {
    const response = await fetch(`/api/clubs/${id}`);
    const data = await response.json();
    setClub(data);
  };
  fetchClub();
}, [id]);
```

**After:**
```typescript
const currentClub = useClubStore((state) => state.currentClub);
const fetchClubById = useClubStore((state) => state.fetchClubById);

useEffect(() => {
  fetchClubById(id);
}, [id, fetchClubById]);

const club = currentClub; // Use currentClub as club
```

## Best Practices

1. **Avoid Stale Closures**: Don't include store state in useCallback dependencies
   ```typescript
   // ❌ Bad - creates stale closure
   const fetch = useCallback(async () => {
     if (clubs.length === 0) await fetchClubs();
   }, [clubs, fetchClubs]);
   
   // ✅ Good - read state fresh each time
   const fetch = useCallback(async () => {
     await fetchClubs();
   }, [fetchClubs]);
   
   useEffect(() => {
     if (clubs.length === 0) {
       // Check here instead
     }
   }, [clubs]);
   ```

2. **Loading State**: Use store's loading state consistently
   ```typescript
   const loading = useClubStore((state) => state.loading);
   
   if (loading) {
     return <LoadingSpinner />;
   }
   ```

3. **Error Handling**: Use store's error state
   ```typescript
   const error = useClubStore((state) => state.error);
   
   if (error) {
     return <ErrorMessage message={error} />;
   }
   ```

4. **Type Compatibility**: Map store types to local types when needed
   ```typescript
   const clubsFromStore = useClubStore((state) => state.clubs);
   
   // Map to local type if needed
   const clubs: LocalClubType[] = clubsFromStore.map((club) => ({
     id: club.id,
     name: club.name,
     // ... other fields
   }));
   ```

## Testing

The store is fully tested in `src/__tests__/useClubStore.test.ts`:
- ✅ State management
- ✅ All CRUD operations
- ✅ Error handling
- ✅ Optimistic updates
- ✅ Selectors

Run tests:
```bash
npm test -- src/__tests__/useClubStore.test.ts
```

## Future Improvements

1. Add support for query parameters in `fetchClubs()` for filtering
2. Implement pagination support in the store
3. Add caching/TTL for club data
4. Add localStorage persistence for `currentClub`
5. Implement optimistic UI updates with rollback on error

## Support

For questions or issues related to the club store migration:
1. Check this documentation
2. Review the store implementation in `src/stores/useClubStore.ts`
3. Review test examples in `src/__tests__/useClubStore.test.ts`
