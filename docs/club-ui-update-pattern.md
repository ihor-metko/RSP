# Club Detail Page UI Update Pattern

## Overview

This document describes the standard pattern for updating the UI after any club detail modification on the club detail page. This ensures that all UI components re-render with the latest data without requiring a page reload.

## The Problem

When updating club data (working hours, contacts, gallery, etc.), the backend API endpoints return `{ success: true }` instead of the full updated club object. Components that try to pass this response to `updateClubInStore` will fail to update the UI properly.

## The Solution

After any successful update operation:
1. Make the update API call
2. Fetch the complete updated club data
3. Pass the full club object to `updateClubInStore`

## Standard Pattern

```typescript
const handleSave = useCallback(async () => {
  setIsSaving(true);
  setError("");
  
  try {
    // Step 1: Make the update API call
    const response = await fetch(`/api/admin/clubs/${club.id}/[endpoint]`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to update");
    }

    // Step 2: Fetch the updated club data
    const clubResponse = await fetch(`/api/admin/clubs/${club.id}`);
    if (!clubResponse.ok) {
      throw new Error("Failed to refresh club data");
    }
    
    const updatedClub = await clubResponse.json();

    // Step 3: Update store reactively - triggers UI re-render
    updateClubInStore(club.id, updatedClub);

    setIsEditing(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to save changes");
  } finally {
    setIsSaving(false);
  }
}, [club.id, updateData, updateClubInStore]);
```

## Examples

### Business Hours Update (ClubHoursView)

```typescript
// After successful business hours update
const businessHoursResponse = await fetch(`/api/admin/clubs/${club.id}/business-hours`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ businessHours }),
});

if (!businessHoursResponse.ok) {
  throw new Error("Failed to update business hours");
}

// Fetch the updated club data to refresh the UI
const clubResponse = await fetch(`/api/admin/clubs/${club.id}`);
if (!clubResponse.ok) {
  throw new Error("Failed to refresh club data");
}

const updatedClub = await clubResponse.json();

// Update store reactively - no page reload needed
updateClubInStore(club.id, updatedClub);
```

### Contacts/Location Update (ClubContactsView)

```typescript
// After successful parallel updates
const [locationResponse, contactsResponse] = await Promise.all([
  fetch(`/api/admin/clubs/${club.id}/location`, { /* ... */ }),
  fetch(`/api/admin/clubs/${club.id}/contacts`, { /* ... */ }),
]);

if (!locationResponse.ok || !contactsResponse.ok) {
  throw new Error("Failed to update");
}

// Fetch the updated club data to refresh the UI
const clubResponse = await fetch(`/api/admin/clubs/${club.id}`);
if (!clubResponse.ok) {
  throw new Error("Failed to refresh club data");
}

const updatedClub = await clubResponse.json();

// Update store reactively
updateClubInStore(club.id, updatedClub);
```

### Gallery/Media Update (ClubGalleryView)

```typescript
// After successful media update
const response = await fetch(`/api/admin/clubs/${club.id}/media`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ bannerData, logoData, gallery }),
});

if (!response.ok) {
  throw new Error("Failed to update media");
}

// Fetch the updated club data to refresh the UI
const clubResponse = await fetch(`/api/admin/clubs/${club.id}`);
if (!clubResponse.ok) {
  throw new Error("Failed to refresh club data");
}

const updatedClub = await clubResponse.json();

// Update store reactively
updateClubInStore(club.id, updatedClub);
```

## How updateClubInStore Works

The `updateClubInStore` method in `useAdminClubStore` updates three places:

1. **currentClub** - The currently selected club
2. **clubsById** - Cache of clubs by ID
3. **clubs** - Array of clubs with counts

```typescript
updateClubInStore: (clubId: string, updatedClub: ClubDetail) => {
  set((state) => {
    // Update clubsById cache
    const newClubsById = { ...state.clubsById, [clubId]: updatedClub };

    // Update clubs array if club exists there
    const clubIndex = state.clubs.findIndex(c => c.id === clubId);
    let newClubs = state.clubs;
    if (clubIndex >= 0) {
      newClubs = [...state.clubs];
      newClubs[clubIndex] = { 
        ...newClubs[clubIndex], // Keep existing ClubWithCounts fields
        ...updatedClub,          // Merge in updated ClubDetail fields
      };
    }

    // Update currentClub if it matches
    const newCurrentClub = state.currentClub?.id === clubId 
      ? updatedClub 
      : state.currentClub;

    return {
      clubsById: newClubsById,
      clubs: newClubs,
      currentClub: newCurrentClub,
    };
  });
}
```

## Benefits

✅ **Immediate UI updates** - No page reload required  
✅ **Consistent pattern** - All update operations follow the same approach  
✅ **Proper state management** - Uses existing Zustand store  
✅ **Efficient** - Single fetch after update, no unnecessary API calls  
✅ **State immutability** - Maintains proper React/Zustand state patterns  
✅ **Scoped updates** - Only changed data is updated in store

## What NOT to Do

❌ **Don't** try to parse the success response as a club object:
```typescript
// WRONG - API returns { success: true }, not a full club
const updatedClub = await response.json();
updateClubInStore(club.id, updatedClub); // This will fail!
```

❌ **Don't** skip the fetch step:
```typescript
// WRONG - Store needs the full updated club data
updateClubInStore(club.id, { ...club, name: newName }); // Incomplete!
```

❌ **Don't** refetch the entire page:
```typescript
// WRONG - Unnecessary and defeats the purpose of reactive state
window.location.reload(); // Don't do this!
```

## Testing

Integration tests verify this pattern works correctly. See `src/__tests__/club-ui-update-integration.test.tsx` for examples.

## Related Files

- `src/stores/useAdminClubStore.ts` - Store with `updateClubInStore` method
- `src/components/admin/club/ClubHoursView.tsx` - Business hours updates
- `src/components/admin/club/ClubContactsView.tsx` - Contacts/location updates
- `src/components/admin/club/ClubGalleryView.tsx` - Gallery/media updates
- `src/components/admin/club/ClubSpecialDatesView.tsx` - Reference implementation
- `src/components/admin/ClubEditor.client.tsx` - Base info updates

## Future Considerations

If this pattern becomes too repetitive, consider creating a custom hook:

```typescript
function useClubUpdate(clubId: string) {
  const updateClubInStore = useAdminClubStore(state => state.updateClubInStore);
  
  const updateAndRefresh = async (
    updateFn: () => Promise<Response>
  ) => {
    const response = await updateFn();
    
    if (!response.ok) {
      throw new Error("Update failed");
    }
    
    const clubResponse = await fetch(`/api/admin/clubs/${clubId}`);
    if (!clubResponse.ok) {
      throw new Error("Failed to refresh club data");
    }
    
    const updatedClub = await clubResponse.json();
    updateClubInStore(clubId, updatedClub);
    
    return updatedClub;
  };
  
  return { updateAndRefresh };
}
```

Usage:
```typescript
const { updateAndRefresh } = useClubUpdate(club.id);

await updateAndRefresh(() =>
  fetch(`/api/admin/clubs/${club.id}/business-hours`, {
    method: "PATCH",
    body: JSON.stringify({ businessHours }),
  })
);
```
