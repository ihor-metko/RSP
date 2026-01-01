# Club Update Endpoints - Migration Guide

## Overview

All club-related update endpoints have been refactored to return minimal payloads instead of full club objects with nested relations. This change addresses transaction timeout issues and improves performance.

## Changed Endpoints

### 1. General Club Information
**Endpoint:** `PATCH /api/admin/clubs/{id}`

**Before:**
```json
{
  "id": "club-123",
  "name": "Updated Club",
  "slug": "updated-club",
  "courts": [...],
  "coaches": [...],
  "gallery": [...],
  "businessHours": [...],
  "specialHours": [...]
}
```

**After:**
```json
{
  "success": true
}
```

---

### 2. Legacy Update (Deprecated)
**Endpoint:** `PUT /api/admin/clubs/{id}`

**Before:**
```json
{
  "id": "club-123",
  "name": "Updated Club",
  "logoData": {...},
  "bannerData": {...}
}
```

**After:**
```json
{
  "success": true
}
```

---

### 3. Club Metadata
**Endpoint:** `PATCH /api/admin/clubs/{id}/metadata`

**After:**
```json
{
  "success": true
}
```

---

### 4. Club Location
**Endpoint:** `PATCH /api/admin/clubs/{id}/location`

**After:**
```json
{
  "success": true
}
```

---

### 5. Club Media (Logo, Banner, Gallery)
**Endpoint:** `PATCH /api/admin/clubs/{id}/media`

**After:**
```json
{
  "success": true
}
```

---

### 6. Club Contact Information
**Endpoint:** `PATCH /api/admin/clubs/{id}/contacts`

**After:**
```json
{
  "success": true
}
```

---

### 7. Business Hours
**Endpoint:** `PATCH /api/admin/clubs/{id}/business-hours`

**After:**
```json
{
  "success": true
}
```

---

### 8. Coach Assignments
**Endpoint:** `PATCH /api/admin/clubs/{id}/coaches`

**After:**
```json
{
  "success": true
}
```

---

### 9. Court Updates
**Endpoint:** `PATCH /api/admin/clubs/{id}/courts/{courtId}`

**After:**
```json
{
  "success": true
}
```

---

### 10. Create New Club
**Endpoint:** `POST /api/admin/clubs/new`

**Before:**
```json
{
  "id": "club-123",
  "name": "New Club",
  "slug": "new-club",
  "organizationId": "org-456",
  ...all club fields...
}
```

**After:**
```json
{
  "id": "club-123",
  "success": true
}
```

---

## Endpoints NOT Changed (Already Optimized)

The following endpoints already returned minimal payloads and were not modified:

- `PATCH /api/admin/clubs/{id}/special-hours` - Returns `{ specialHours: [...] }`
- `POST /api/admin/clubs/{id}/admins` - Returns minimal admin data
- `PATCH /api/admin/clubs/{id}/admins/owner` - Returns minimal owner data
- `PUT /api/admin/clubs/{id}/payment-keys` - Returns payment keys only
- All payment-accounts endpoints - Already return minimal data

---

## Frontend Migration Guide

### Option 1: Optimistic Updates (Recommended)

Update your local state immediately when calling update endpoints:

```typescript
// Before
const response = await fetch(`/api/admin/clubs/${clubId}`, {
  method: 'PATCH',
  body: JSON.stringify({ name: 'New Name' })
});
const updatedClub = await response.json();
setClub(updatedClub); // Full club object

// After
const response = await fetch(`/api/admin/clubs/${clubId}`, {
  method: 'PATCH',
  body: JSON.stringify({ name: 'New Name' })
});
const result = await response.json();
if (result.success) {
  setClub(prev => ({ ...prev, name: 'New Name' })); // Optimistic update
}
```

### Option 2: Explicit Re-fetch

Fetch the club data after a successful update:

```typescript
const response = await fetch(`/api/admin/clubs/${clubId}`, {
  method: 'PATCH',
  body: JSON.stringify({ name: 'New Name' })
});
const result = await response.json();
if (result.success) {
  // Re-fetch the club data
  const clubResponse = await fetch(`/api/admin/clubs/${clubId}`);
  const updatedClub = await clubResponse.json();
  setClub(updatedClub);
}
```

### Option 3: Use Zustand Store Pattern

If using the Zustand store pattern (as per copilot-settings.md):

```typescript
// In your store
updateClub: async (clubId: string, updates: Partial<Club>) => {
  // Optimistic update
  set((state) => ({
    clubs: state.clubs.map(c => 
      c.id === clubId ? { ...c, ...updates } : c
    )
  }));
  
  // Make API call
  const response = await fetch(`/api/admin/clubs/${clubId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Rollback on error
    // Could also refresh from server
    throw new Error('Update failed');
  }
}
```

---

## Benefits

1. **Performance**: Significantly faster response times (&lt; 1s locally vs potential 5s+ timeout)
2. **Reliability**: No more transaction timeouts
3. **Reduced Payload**: Smaller response sizes reduce bandwidth usage
4. **Consistency**: All update endpoints now follow the same pattern
5. **Database Load**: Reduced load on the database from unnecessary queries

---

## Breaking Changes

⚠️ **Important**: All frontend code that depends on receiving full club objects from update endpoints will need to be updated.

### Common Issues:

1. **Accessing returned data directly**
   ```typescript
   // ❌ This will fail
   const { name, slug } = await updateClub({ name: 'New Name' });
   
   // ✅ Use optimistic updates instead
   const { success } = await updateClub({ name: 'New Name' });
   if (success) {
     // Use the data you sent, or re-fetch
   }
   ```

2. **Displaying updated data immediately**
   ```typescript
   // ❌ This will fail
   const updatedClub = await updateClub({ name: 'New Name' });
   setClub(updatedClub);
   
   // ✅ Update local state optimistically
   await updateClub({ name: 'New Name' });
   setClub(prev => ({ ...prev, name: 'New Name' }));
   ```

---

## Questions?

If you encounter any issues during migration, please refer to:
- `.github/copilot-settings.md` - For state management patterns
- This document's examples above
- The test files in `src/__tests__/admin-club-domain-endpoints.test.ts` for API behavior examples
