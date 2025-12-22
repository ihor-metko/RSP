# Global App Initialization & Side Effects Audit - Summary

## Problem Statement

The application was experiencing repeated global initialization on:
- Tab focus/blur events
- Page navigation (even staying on the same page)
- Component re-renders
- Session object reference changes

This caused:
- Repeated API requests to `/api/me` (user data)
- Repeated API requests to `/api/socket/token` (socket authentication)
- WebSocket disconnecting and reconnecting unnecessarily
- Performance degradation and poor user experience

## Root Cause

**SocketProvider had unstable dependencies:**
```typescript
// Before (WRONG)
useEffect(() => {
  initializeSocket();
}, [session, status]); // session object changes on every render!
```

NextAuth's `session` object is a **new reference** on every render, even when the content is identical. This caused the `useEffect` to re-run constantly, leading to repeated socket initialization.

## Solution

### 1. Fixed SocketProvider Dependencies
- Changed from `[session, status]` to `[status, userId]`
- Extracted stable primitive: `const userId = session?.user?.id`
- Added persistent initialization guard: `hasInitializedRef`

```typescript
// After (CORRECT)
const userId = session?.user?.id; // Stable primitive
const hasInitializedRef = useRef(false);

useEffect(() => {
  if (hasInitializedRef.current) return; // Guard
  hasInitializedRef.current = true;
  initializeSocket();
}, [status, userId]); // Stable dependencies only
```

### 2. Verified UserStoreInitializer
- Already had proper `hasInitialized` guard ✅
- No changes needed

### 3. Comprehensive Documentation
- Created `docs/architecture/app-bootstrap.md`
- Explains entire bootstrap flow
- Documents what runs once vs what is page-scoped
- Provides testing checklist and best practices

### 4. Integration Tests
- Created `src/__tests__/app-bootstrap.test.tsx`
- Verifies no re-initialization on re-renders
- Tests session object reference changes
- All tests pass ✅

## Results

### What Changed
| Component | Before | After |
|-----------|--------|-------|
| SocketProvider | Re-initializes on every session change | Initializes ONCE per app lifecycle |
| `/api/socket/token` | Called on every tab focus | Called ONCE on login |
| WebSocket connection | Reconnects on tab focus | Stays connected until logout |
| UserStoreInitializer | Already correct | No changes needed |
| `/api/me` | Already called once | No changes needed |

### Performance Impact
- ✅ No repeated API requests
- ✅ No unnecessary socket reconnections
- ✅ Better network efficiency
- ✅ Improved user experience

## Testing

### Automated Tests
```bash
npm test -- app-bootstrap.test.tsx
```
**Result**: ✅ 4/4 tests passed

### Manual Testing Checklist
1. Open DevTools Network tab
2. Filter by `/api/me` and `/api/socket/token`
3. Load the app (should see 1 request each)
4. Switch browser tabs multiple times
5. Navigate to different pages
6. **Expected**: No additional requests to these endpoints

### Test Scenarios Covered
- ✅ Initial load - APIs called once
- ✅ Tab switch (focus/blur) - no re-initialization
- ✅ Page navigation - no re-initialization
- ✅ Component re-renders - no re-initialization
- ✅ Session object changes - no re-initialization

## Files Modified

1. **`src/contexts/SocketContext.tsx`**
   - Added `hasInitializedRef` guard
   - Changed dependencies to stable values
   - Updated documentation

2. **`docs/architecture/app-bootstrap.md`** (NEW)
   - Comprehensive bootstrap architecture guide
   - 350+ lines of documentation
   - Testing checklists and best practices

3. **`src/__tests__/app-bootstrap.test.tsx`** (NEW)
   - Integration tests for bootstrap behavior
   - Prevents regression
   - Living documentation

## Architecture Overview

```
Application Bootstrap Flow:

1. Root Layout (src/app/layout.tsx)
   └── SessionProvider (NextAuth)
       ├── UserStoreInitializer
       │   └── Loads /api/me ONCE when authenticated
       │       └── Guard: hasInitialized state flag
       │
       └── SocketProvider
           ├── Fetches /api/socket/token ONCE
           ├── Creates WebSocket connection ONCE
           └── Guard: hasInitializedRef + socketRef check
           │
           └── GlobalSocketListener
               └── Subscribes to socket events ONCE
                   └── Guard: socket dependency (stable)

2. Pages render and consume data from Zustand stores
   └── No direct API calls in components
   └── Stores handle lazy loading and caching
```

## Key Principles

### What Runs ONCE (App-Level)
- User session loading (`/api/me`)
- Socket authentication (`/api/socket/token`)
- WebSocket connection
- Socket event subscriptions

### What Runs Per Page (Page-Level)
- Entity data loading (organizations, clubs, courts)
- Page-specific data fetching
- Component-specific effects

### Guards in Place
1. **UserStoreInitializer**: `hasInitialized` state flag
2. **SocketProvider**: `hasInitializedRef` ref + stable dependencies
3. **GlobalSocketListener**: Stable `socket` dependency

## Best Practices (For Future Development)

### ✅ DO
```typescript
// Use stable dependencies (primitives)
const userId = session?.user?.id;
useEffect(() => {
  doSomething();
}, [userId]);

// Add initialization guards
const hasInitialized = useRef(false);
useEffect(() => {
  if (hasInitialized.current) return;
  hasInitialized.current = true;
  initialize();
}, [stableDep]);

// Use stores for data
const data = useMyStore(state => state.getData());
```

### ❌ DON'T
```typescript
// Don't depend on object references
useEffect(() => {
  doSomething();
}, [session]); // session changes every render!

// Don't skip initialization guards
useEffect(() => {
  initialize(); // Will run on every re-render!
}, [isAuthenticated]);

// Don't call fetch directly
useEffect(() => {
  fetch('/api/data').then(setData);
}, []);
```

## Compliance with Copilot Settings

This implementation follows all rules from `.github/copilot-settings.md`:

1. ✅ **Universal RBAC**: Uses centralized `useUserStore` for role checks
2. ✅ **UI Components**: No UI changes, only architectural fixes
3. ✅ **User Store**: Properly uses `useUserStore` with initialization guards
4. ✅ **Documentation**: Created comprehensive docs in `/docs` folder
5. ✅ **State Management**: Uses Zustand stores as single source of truth
6. ✅ **Skeleton Loaders**: No loading UI changes, architectural fix only

## Conclusion

This fix ensures that **global initialization happens exactly once per application lifecycle**, not on every page interaction, tab switch, or re-render. The solution is:

- **Minimal**: Only changed dependencies and added one guard
- **Surgical**: Targeted the root cause without touching unrelated code
- **Well-tested**: Integration tests prevent regression
- **Well-documented**: Comprehensive architecture guide for future developers

The application now has a robust, performant bootstrap architecture that prevents repeated initialization and provides clear patterns for future development.
