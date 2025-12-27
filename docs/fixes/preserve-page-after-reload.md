# Fix: Preserve Page After Reload

## Summary

This fix addresses an issue where reloading certain pages (e.g., Club Details, Dashboard pages) would redirect users away from their current page, typically to the dashboard or sign-in page. Users now remain on the exact page they were viewing after a browser reload.

## Problem Description

### Issue
When users reloaded pages in the application, they would be unexpectedly redirected to different pages:
- Reloading Club Details page → Redirected to dashboard
- Reloading Admin pages → Redirected to sign-in or dashboard
- This created a frustrating UX where users lost their place

### Root Cause
1. `UserStoreInitializer` loads user data on app start with a 100ms hydration delay
2. During hydration, `sessionStatus` is temporarily "loading" or "unauthenticated"  
3. Auth guard logic in `useEffect` ran on **every component mount**, including page reloads
4. Redirect logic didn't distinguish between:
   - Initial navigation to a protected page (should check auth)
   - Page reload (should preserve current page)

## Solution

### Approach
Track whether the initial authentication check has been performed using `useRef`. This prevents the redirect logic from running on subsequent renders or page reloads.

### Implementation

#### 1. Created Reusable Hook: `useAuthGuardOnce`

A centralized hook for auth guards that only runs redirect logic once:

```typescript
export function useAuthGuardOnce(options: {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireRoot?: boolean;
  redirectTo?: string;
})
```

**Features:**
- Uses `useRef` to track if auth check has been performed
- Only redirects on first mount, not on reloads
- Supports different auth requirements
- Uses `sessionStatus` for consistency with existing guards
- Returns auth state for use in components

**Usage:**
```typescript
// In a protected page component
const { isHydrated, isLoading, user } = useAuthGuardOnce({
  requireAuth: true,
});
```

#### 2. Fixed Critical Pages

Applied the fix to 5 critical pages with manual `useRef` tracking:

1. **Player Dashboard** (`/dashboard`) - Refactored to use new hook
2. **Admin Dashboard** (`/admin/dashboard`) - Manual fix
3. **Admin Bookings** (`/admin/bookings`) - Manual fix
4. **Admin Clubs** (`/admin/clubs`) - Manual fix
5. **Admin Organizations** (`/admin/organizations`) - Manual fix

#### 3. Documentation

- Created comprehensive hook documentation in `docs/hooks/useAuthGuardOnce.md`
- Includes usage examples, API reference, and migration guide
- Exported hook from `src/hooks/index.ts`

## Files Changed

```
src/hooks/useAuthGuardOnce.ts                      # New reusable hook
src/hooks/index.ts                                 # Export new hook
src/app/(pages)/(player)/dashboard/page.tsx        # Refactored to use hook
src/app/(pages)/admin/dashboard/page.tsx           # Manual fix with useRef
src/app/(pages)/admin/bookings/page.tsx            # Manual fix with useRef
src/app/(pages)/admin/clubs/page.tsx               # Manual fix with useRef
src/app/(pages)/admin/organizations/page.tsx       # Manual fix with useRef
docs/hooks/useAuthGuardOnce.md                     # Documentation
```

## Benefits

1. **Better UX**: Users stay on their current page after reload
2. **Consistent Behavior**: All protected pages behave the same way
3. **Maintainable Code**: Centralized auth guard logic in reusable hook
4. **No Breaking Changes**: Existing auth behavior preserved
5. **Easy Migration**: Simple hook API for future pages

## Conclusion

This fix successfully resolves the page reload redirect issue while maintaining all existing authentication and authorization behavior. Users can now reload any page without losing their place, resulting in a much better user experience.
