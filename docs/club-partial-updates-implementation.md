# Club Detail Page - Partial Updates Implementation

## Overview
This document describes the implementation of partial updates for club data on the Club Detail Page. Previously, after updating different blocks (business hours, contacts, gallery, base info), the system would either make an additional GET request to fetch the full club object or use the full club object from the response. Now, the system uses partial updates to directly update the store with only the fields that changed.

## Changes Made

### 1. Store Update - `useAdminClubStore.ts`

#### Modified Method: `updateClubInStore`
**Before:**
```typescript
updateClubInStore: (clubId: string, updatedClub: ClubDetail) => void;
```

**After:**
```typescript
updateClubInStore: (clubId: string, updatedFields: Partial<ClubDetail>) => void;
```

**Key Improvements:**
- Accepts `Partial<ClubDetail>` instead of full `ClubDetail`
- Merges updated fields with existing club data
- Preserves all unchanged fields
- Updates three store locations:
  1. `clubsById` cache
  2. `clubs` array (if club exists there)
  3. `currentClub` (if it matches the clubId)

**Implementation Details:**
```typescript
updateClubInStore: (clubId: string, updatedFields: Partial<ClubDetail>) => {
  set((state) => {
    // Get existing club data from clubsById cache
    const existingClub = state.clubsById[clubId];
    
    if (!existingClub) {
      console.warn(`Club ${clubId} not found in store`);
      return state;
    }

    // Merge updated fields with existing club data
    const updatedClub: ClubDetail = {
      ...existingClub,
      ...updatedFields,
      id: clubId, // Ensure ID is not overwritten
    };

    // Update all three locations in store
    // ...
  });
}
```

### 2. API Endpoint Updates

All club update endpoints now return the full updated club object instead of just `{ success: true }`. This eliminates the need for additional GET requests.

#### Modified Endpoints:

**1. `/api/admin/clubs/[id]/contacts` (PATCH)**
- Returns full club object with all relations
- Includes: organization, courts, coaches, gallery, businessHours

**2. `/api/admin/clubs/[id]/business-hours` (PATCH)**
- Returns full club object after updating business hours
- Uses transaction for consistency

**3. `/api/admin/clubs/[id]/media` (PATCH)**
- Returns full club object after updating banner, logo, and gallery
- Uses transaction for consistency

**4. `/api/admin/clubs/[id]/location` (PATCH)**
- Returns full club object after updating location fields

**5. `/api/admin/clubs/[id]/metadata` (PATCH)**
- Returns full club object after updating metadata

**6. `/api/admin/clubs/[id]` (PATCH)**
- Returns full club object after updating base info (name, description, isPublic, etc.)

#### Standard Response Format:
All endpoints now return the same formatted club object:
```typescript
{
  ...club,
  logoData: club.logoData ? JSON.parse(club.logoData) : null,
  bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
  organization: { id, name, slug },
  courts: [...],
  coaches: [...],
  gallery: [...],
  businessHours: [...]
}
```

### 3. Component Updates

All components that update club data already use the correct pattern:

#### `ClubContactsView.tsx`
```typescript
const updatedClub = await contactsResponse.json();
updateClubInStore(club.id, updatedClub);
```

#### `ClubHoursView.tsx`
```typescript
const updatedClub = await businessHoursResponse.json();
updateClubInStore(club.id, updatedClub);
```

#### `ClubGalleryView.tsx`
```typescript
const updatedClub = await response.json();
updateClubInStore(club.id, updatedClub);
```

#### `ClubEditor.client.tsx`
```typescript
// Base Info Tab
const updatedClub = await response.json();
updateClubInStore(club.id, updatedClub);

// Address Tab
const updatedClub = await response.json();
updateClubInStore(club.id, updatedClub);
```

**Note:** The Logo and Banner tabs still use `onRefresh()` because they involve file uploads to a different endpoint (`/api/images/clubs/${club.id}/upload`) that doesn't return the full club object. This is acceptable as file uploads are less frequent operations.

## Benefits

### 1. No Additional GET Requests
- Previously: Update → GET request → Update store
- Now: Update → Update store directly from response
- **Result:** 50% reduction in network requests for each update

### 2. Immediate UI Updates
- Store updates happen instantly after successful API calls
- UI reflects changes immediately without waiting for additional requests
- Better user experience with faster perceived performance

### 3. Reduced Network Traffic
- Fewer HTTP requests
- Less data transferred
- More efficient use of API resources

### 4. Better Developer Experience
- Simpler mental model: "Update API → Store reflects changes"
- Less boilerplate code
- Easier to maintain and extend

### 5. Type Safety
- `Partial<ClubDetail>` provides type safety for partial updates
- TypeScript ensures only valid club fields can be updated
- Prevents accidental updates to wrong fields

## Testing

### New Test Suite: `club-store-partial-update.test.ts`

Added comprehensive tests for partial update functionality:

1. **Partial Field Updates**
   - Test updating only name and description
   - Verify other fields remain unchanged

2. **Contact Fields Update**
   - Test updating only phone, email, and website
   - Verify name, location, etc. remain unchanged

3. **Business Hours Update**
   - Test updating business hours array
   - Verify other fields remain unchanged

4. **Current Club Sync**
   - Test that currentClub updates when it matches the clubId
   - Test that currentClub doesn't update when it doesn't match

5. **Clubs Array Update**
   - Test that clubs array updates when club exists there
   - Verify ClubWithCounts structure is preserved

6. **Error Handling**
   - Test warning when club not found in cache
   - Verify state remains unchanged on error

### Test Results
```
✓ should update only the provided fields in clubsById
✓ should update contacts fields only
✓ should update business hours
✓ should update currentClub when it matches the clubId
✓ should not update currentClub when it doesn't match the clubId
✓ should warn when trying to update a club not in cache
✓ should update clubs array when club exists there

Test Suites: 1 passed, 1 total
Tests: 7 passed, 7 total
```

## Migration Guide

### For New Components

When creating new components that update club data:

```typescript
// 1. Get updateClubInStore from store
const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);

// 2. Make API call
const response = await fetch(`/api/admin/clubs/${clubId}/some-endpoint`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(updatedData),
});

// 3. Get updated club from response
const updatedClub = await response.json();

// 4. Update store
updateClubInStore(clubId, updatedClub);
```

### For Existing Components

Most existing components already follow this pattern. No migration needed.

## Future Enhancements

### 1. Optimistic Updates
Consider implementing optimistic updates for better UX:
```typescript
// Update store immediately
updateClubInStore(clubId, updatedFields);

// Make API call
try {
  const response = await fetch(...);
  const actualUpdatedClub = await response.json();
  // Confirm with actual data
  updateClubInStore(clubId, actualUpdatedClub);
} catch (error) {
  // Rollback on error
  updateClubInStore(clubId, originalFields);
}
```

### 2. WebSocket Integration
For real-time updates when other users modify the same club:
```typescript
socket.on('club:updated', (clubId, updatedFields) => {
  updateClubInStore(clubId, updatedFields);
});
```

### 3. Change History
Track what fields changed for better debugging:
```typescript
updateClubInStore(clubId, updatedFields, {
  metadata: {
    updatedBy: currentUserId,
    updatedAt: new Date(),
    changedFields: Object.keys(updatedFields)
  }
});
```

## Conclusion

The implementation of partial updates for club data provides a more efficient, maintainable, and user-friendly approach to managing club information. By eliminating unnecessary GET requests and enabling immediate UI updates, we've improved both performance and user experience while maintaining type safety and testability.
