# Fix: Courts Not Rendering on Club Page for Players

## Issue Summary
Courts were not rendering on the player-facing Club detail page despite being successfully fetched from the API.

## Root Cause
The component was using an incorrect Zustand store subscription pattern:

```typescript
// ❌ BROKEN - Extracting the function
const getCourtsForClub = usePlayerClubStore((state) => state.getCourtsForClub);
const courts = useMemo(() => {
  const rawCourts = club ? getCourtsForClub(club.id) : [];
  return rawCourts.map(court => ({...court, imageUrl: court.bannerData?.url || null}));
}, [club, getCourtsForClub]);
```

**Why it broke:**
- The `getCourtsForClub` function reference changes on every store update
- The component doesn't subscribe to `courtsByClubId` state changes
- When courts are fetched and stored in `courtsByClubId`, the component doesn't re-render
- The memoization dependency on `getCourtsForClub` is ineffective

## Solution
Changed to directly subscribe to the courts data in the selector:

```typescript
// ✅ FIXED - Direct subscription
const rawCourts = usePlayerClubStore((state) => 
  club ? state.getCourtsForClub(club.id) : []
);
const courts = useMemo(() => {
  return rawCourts.map(court => ({
    ...court,
    imageUrl: court.bannerData?.url || null,
  }));
}, [rawCourts]);
```

**Why it works:**
- The component subscribes directly to `courtsByClubId` state changes through `getCourtsForClub`
- When courts are fetched and stored, the selector detects the change
- The component re-renders with the new courts data
- The `useMemo` now has a stable dependency (`rawCourts` array)

## Changes Made
**File:** `src/app/(pages)/(player)/clubs/[id]/page.tsx`

1. Removed extraction of `getCourtsForClub` and `getGalleryForClub` functions
2. Changed to direct subscription pattern: `usePlayerClubStore((state) => state.getCourtsForClub(club.id))`
3. Simplified `useMemo` to only transform the court data (adding `imageUrl` field)
4. Applied the same fix to gallery for consistency

## Testing
A comprehensive test suite was added in `src/__tests__/player-club-courts-rendering.test.tsx` that:
- Verifies the correct subscription pattern works properly
- Demonstrates why the broken pattern failed
- Tests that courts update when store state changes

## Impact
- ✅ Courts now render correctly on the Club page
- ✅ Booking block appears when courts are available
- ✅ No regressions for admin views
- ✅ Follows the same pattern used successfully in admin operations page

## Pattern Reference
This fix follows the same pattern used in the admin operations page:

```typescript
// From: src/app/(pages)/admin/operations/[clubId]/page.tsx:54
const courts = useAdminCourtsStore((state) => state.getCourtsForClub(clubId));
```

## Key Takeaway
When using Zustand stores with selector functions that derive data from state:
- ✅ DO: Call the selector inside the hook: `useStore((state) => state.selector(id))`
- ❌ DON'T: Extract the function first: `const selector = useStore((state) => state.selector); selector(id);`
