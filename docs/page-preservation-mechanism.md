# Global Page Preservation Mechanism

## Overview

The Global Page Preservation Mechanism is a centralized solution that maintains page state across browser reloads, preventing flickers, unintended redirects, and loss of user context. It is implemented through the `PagePreserveProvider` component and works globally for all routes without requiring per-page code.

## Problem Statement

Before this implementation, the platform experienced several issues on page reload:

1. **Multiple flickers**: Pages would flash or show intermediate states during reload
2. **Unintended redirects**: Users were redirected to blank paths or default pages (e.g., Admin Dashboard)
3. **Lost page state**: Query parameters and page context were lost on reload
4. **Auth verification race conditions**: Pages rendered before authentication status was confirmed

Example: Reloading the Club Details page (`/admin/clubs/123`) would cause:
- Visual flickers as the page tried to render before auth was ready
- Redirects to `/auth/sign-in` or `/admin/dashboard`
- Loss of query parameters like `?tab=details`

## Solution

The `PagePreserveProvider` component provides a comprehensive solution:

### Key Features

1. **Global Loading Gate**: Blocks rendering until authentication state is confirmed
2. **Automatic Page Preservation**: Saves current page URL to sessionStorage on navigation
3. **Smart Restoration**: Restores preserved pages on reload from entry points or direct page access
4. **Visual Feedback**: Shows loading indicator instead of blank screens or flickers
5. **Security-Aware**: Excludes auth pages and respects authentication requirements
6. **Time-Based Expiration**: Stored pages expire after 30 minutes

### How It Works

#### 1. Global Loading Gate

```typescript
function GlobalLoadingGate({ children }: { children: React.ReactNode }) {
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const sessionStatus = useUserStore((state) => state.sessionStatus);
  
  const isAuthVerifying = !isHydrated || isLoading || sessionStatus === "loading";
  
  if (isAuthVerifying) {
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

The loading gate ensures that:
- No content renders until the user store is hydrated
- Authentication status is confirmed before showing any pages
- Users see a clean loading indicator instead of flickers

#### 2. Page Saving

On every navigation (except excluded paths), the provider saves:
- Full pathname with query parameters
- Timestamp for expiration checking

```typescript
// Example saved state
sessionStorage.setItem("arenaone_last_page", "/admin/clubs/123?tab=details");
sessionStorage.setItem("arenaone_last_page_timestamp", "1704067200000");
```

#### 3. Page Restoration

On app initialization, the provider:
1. Waits for authentication to complete
2. Checks for a preserved page in sessionStorage
3. Validates the page hasn't expired (30 min limit)
4. Restores the page if:
   - User is authenticated
   - Current page is an entry path (`/`, `/admin/dashboard`), OR
   - Current path matches the stored path (direct reload)

This allows two restoration scenarios:

**Scenario A: Reload from Entry Point**
```
User was on: /admin/clubs/123?tab=details
Browser closes/crashes
User opens app → lands on /admin/dashboard
Provider restores → /admin/clubs/123?tab=details
```

**Scenario B: Direct Page Reload**
```
User is on: /admin/clubs/123?tab=details
User hits F5 (reload)
Browser temporarily shows: /admin/clubs/123 (no query params)
Provider restores → /admin/clubs/123?tab=details
```

## Integration

The provider is already integrated in the root layout:

```typescript
// src/app/layout.tsx
export default async function RootLayout({ children }) {
  return (
    <AuthProvider>
      <PagePreserveProvider>
        {children}
      </PagePreserveProvider>
    </AuthProvider>
  );
}
```

**No additional code is needed on individual pages.** The mechanism works automatically.

## Configuration

### Excluded Paths

These paths are never preserved (typically auth flows):

```typescript
const EXCLUDED_PATHS = [
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/verify-email",
  "/auth/reset-password",
  "/invites/accept",
];
```

To add more excluded paths, update this array in `PagePreserveProvider.tsx`.

### Entry Paths

These paths trigger restoration on app load:

```typescript
const ENTRY_PATHS = [
  "/",
  "/admin/dashboard",
];
```

Entry paths are typically root-level or default landing pages. Add more as needed.

### Expiration Time

Preserved pages expire after 30 minutes:

```typescript
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
```

Adjust this constant if different expiration is needed.

## User Experience

### Before Enhancement

1. User navigates to `/admin/clubs/123?tab=details`
2. User reloads page
3. Page flickers white → shows loading → briefly shows dashboard → redirects to sign-in → redirects back
4. User ends up on `/admin/dashboard` instead of original page
5. Query parameter `?tab=details` is lost

### After Enhancement

1. User navigates to `/admin/clubs/123?tab=details`
2. User reloads page
3. Clean loading spinner appears
4. Auth verifies in background
5. Original page `/admin/clubs/123?tab=details` renders once
6. No flickers, no redirects, state preserved

## Technical Details

### State Dependencies

The provider relies on the User Store for authentication state:

- `isHydrated`: Store has restored from localStorage
- `isLoading`: User data is being fetched
- `sessionStatus`: Current auth state (`loading`, `authenticated`, `unauthenticated`)

All three must be in ready state before content renders.

### Storage Strategy

Uses `sessionStorage` (not `localStorage`):
- Clears on browser close (security)
- Persists across page reloads in same tab
- Doesn't interfere with multiple tabs
- Each tab maintains independent state

### Race Condition Prevention

The provider uses refs to prevent race conditions:

```typescript
const hasRestoredPage = useRef(false);
const isInitialMount = useRef(true);
```

This ensures:
- Restoration happens only once
- Saving doesn't interfere with restoration
- Multiple effect runs don't cause issues

## Testing

The provider includes comprehensive tests:

```bash
npm test src/__tests__/page-preserve-provider.test.tsx
```

Tests cover:
- Loading gate display during auth verification
- Page saving to sessionStorage
- Restoration from entry paths
- Restoration on direct page reload
- Auth requirement enforcement
- Expiration handling
- Excluded path handling

All tests pass: ✓ 12/12

## Troubleshooting

### Page Not Restoring

Check:
1. Is the page excluded in `EXCLUDED_PATHS`?
2. Has more than 30 minutes passed?
3. Is the user authenticated?
4. Is restoration happening from an entry path or the same path?

### Unwanted Restoration

If a page shouldn't be preserved:
1. Add it to `EXCLUDED_PATHS`
2. Mark it as an entry path if it's a landing page

### Loading Gate Stays Too Long

If the loading spinner doesn't disappear:
1. Check User Store is loading correctly
2. Verify `UserStoreInitializer` is working
3. Check network requests for `/api/me` endpoint

## Future Enhancements

Potential improvements:
1. Per-route preservation policies
2. State restoration (not just URL)
3. Multi-tab synchronization
4. Admin configuration UI
5. Preservation of scroll position

## Related Files

- **Implementation**: `src/components/PagePreserveProvider.tsx`
- **Tests**: `src/__tests__/page-preserve-provider.test.tsx`
- **Integration**: `src/app/layout.tsx`
- **User Store**: `src/stores/useUserStore.ts`
- **Auth Provider**: `src/components/AuthProvider.tsx`

## References

- Issue: "Implement global Page Preserver mechanism in Storyload Provider"
- Related Pattern: User Store hydration strategy
- Copilot Settings: `.github/copilot-settings.md`
