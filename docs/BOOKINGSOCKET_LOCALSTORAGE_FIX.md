# BookingSocket Initialization Fix - Local Storage Handling

## Problem Statement

Previously, `BookingSocket` would initialize automatically on app start if a `clubId` existed in Local Storage from a previous session. This caused unwanted socket connections for **RootAdmin** and **OrganizationAdmin** users when they were on the Dashboard or other non-operations pages, because the stale `clubId` would trigger the socket connection even though they should not have an active BookingSocket session.

## Solution Overview

The fix ensures that `BookingSocket` only initializes when a user with an admin role actually navigates to a specific club's Operations page, and disconnects when leaving that page. Local Storage is no longer used to automatically trigger socket initialization.

## Changes Made

### 1. ClubContext (`src/contexts/ClubContext.tsx`)

**Before:**
- On mount, `ClubContext` would read `activeClubId` from `localStorage` and set it in state
- This triggered `BookingSocket` to connect immediately for any admin user, regardless of which page they were on

**After:**
- `ClubContext` no longer auto-restores `activeClubId` from `localStorage` on mount
- `activeClubId` starts as `null` and must be explicitly set by the operations page
- `localStorage` is still used to persist the value when set, but it does NOT trigger automatic restoration

**Code Changes:**
```typescript
// REMOVED: Auto-restoration from localStorage
useEffect(() => {
  const stored = localStorage.getItem('activeClubId');
  if (stored) {
    setActiveClubIdState(stored);
  }
  setIsHydrated(true);
}, []);

// REPLACED WITH: Simple hydration marker
useEffect(() => {
  setIsHydrated(true);
}, []);
```

### 2. BookingSocketContext (`src/contexts/BookingSocketContext.tsx`)

**Enhanced Logging:**
- Added logging to indicate when BookingSocket is NOT initializing due to no active club
- This helps with debugging and makes it clear that the behavior is intentional

**Code Changes:**
```typescript
if (!activeClubId && sessionStatus === 'authenticated') {
  console.log('[BookingSocket] Not initializing - no active club set (prevents unwanted connections from stale localStorage)');
}
```

### 3. Operations Page (`src/app/(pages)/admin/operations/[clubId]/page.tsx`)

**Enhanced Cleanup:**
- Updated the cleanup comment to clarify that localStorage is also cleared when leaving the page
- No functional changes, just improved documentation

## Behavior After Fix

### Initialization Conditions

BookingSocket will **ONLY** initialize when:
1. ✅ User is authenticated (`sessionStatus === 'authenticated'`)
2. ✅ User has admin role (`adminStatus.isAdmin === true`)
3. ✅ `activeClubId` is explicitly set (by navigating to operations page)

### Disconnection Behavior

BookingSocket will disconnect when:
- ❌ User leaves the club Operations page (`activeClubId` becomes `null`)
- ❌ User logs out
- ❌ User loses admin privileges

### Role-Based Logic

| User Role | On Dashboard | On Operations Page | BookingSocket Status |
|-----------|--------------|-------------------|---------------------|
| RootAdmin | ❌ No stale localStorage triggers | ✅ Connects when clubId set | Controlled |
| OrgAdmin  | ❌ No stale localStorage triggers | ✅ Connects when clubId set | Controlled |
| ClubAdmin | ❌ No stale localStorage triggers | ✅ Connects when clubId set | Controlled |
| Player    | ❌ Never connects | ❌ Never connects | Never connects |

## Testing

### New Test Suite

Created comprehensive test suite: `src/__tests__/BookingSocket-localStorage.test.tsx`

Tests verify:
1. ✅ BookingSocket does NOT initialize from stale localStorage clubId
2. ✅ BookingSocket ONLY initializes when activeClubId is explicitly set
3. ✅ RootAdmin does not get unwanted connections on Dashboard
4. ✅ OrgAdmin does not get unwanted connections on Dashboard
5. ✅ ClubAdmin only connects when navigating to operations page
6. ✅ Socket disconnects when leaving operations page
7. ✅ Non-admin users never connect to BookingSocket

### Test Results

- **All socket tests passing:** 87/87 ✅
- **New localStorage tests:** 7/7 ✅

## Local Storage Handling

### Before Fix

```
App Start (any page)
  → Read localStorage.activeClubId
  → Set to ClubContext
  → BookingSocket connects (UNWANTED)
```

### After Fix

```
App Start (any page)
  → ClubContext.activeClubId = null
  → BookingSocket does NOT connect ✅

Navigate to Operations Page
  → setActiveClubId(clubId) explicitly
  → localStorage.setItem('activeClubId', clubId)
  → BookingSocket connects ✅

Leave Operations Page
  → setActiveClubId(null)
  → localStorage.removeItem('activeClubId')
  → BookingSocket disconnects ✅
```

## Page Reload Behavior

### On Dashboard
- Stale `clubId` in localStorage is **ignored**
- `activeClubId` remains `null`
- BookingSocket does not connect

### On Operations Page
- Operations page explicitly sets `activeClubId` on mount
- This triggers BookingSocket connection
- On unmount (navigating away), `activeClubId` is cleared

## Migration Notes

No migration needed. The change is backward compatible:
- Existing localStorage data is ignored on app start
- Operations page handles setting/clearing `activeClubId` correctly
- No breaking changes to public APIs

## Future Considerations

1. **Session Storage Alternative:** Consider using `sessionStorage` instead of `localStorage` for `activeClubId` to ensure it doesn't persist across browser sessions
2. **Role-based localStorage:** Could add role-aware logic to clear stale clubId for RootAdmin/OrgAdmin on login
3. **Context Refactoring:** Consider merging ClubContext state into a more comprehensive navigation or route context

## Related Files

- `src/contexts/ClubContext.tsx` - Club selection context
- `src/contexts/BookingSocketContext.tsx` - BookingSocket lifecycle management
- `src/components/GlobalSocketListener.tsx` - Socket event handling
- `src/app/(pages)/admin/operations/[clubId]/page.tsx` - Operations page
- `src/__tests__/BookingSocket-localStorage.test.tsx` - Test suite for localStorage behavior

## Documentation Updates

All affected files include updated inline comments explaining:
- Why localStorage is not auto-restored
- How activeClubId lifecycle works
- When BookingSocket connects/disconnects
- Role-based access control behavior
