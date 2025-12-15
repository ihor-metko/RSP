# Deferred Loading Implementation

## Overview

This document describes the implementation of deferred loading states to prevent filter flickering on pages with fast server responses.

## Problem Statement

When filter components trigger data fetches that complete very quickly (< 100-200ms), showing and hiding loading indicators causes a brief visual flicker. This creates a jarring user experience where skeleton loaders flash on screen momentarily before the actual content appears.

## Solution

We implemented a `useDeferredLoading` hook that uses React 18's `useDeferredValue` API to defer loading state updates. This means:

- **Fast responses**: If data loads quickly, the loading state never shows, preventing flicker
- **Slow responses**: If data takes longer, the loading state will eventually show, providing appropriate feedback
- **Smooth transitions**: The UI remains stable regardless of response speed

## Implementation

### Core Hook

**Location:** `src/hooks/useDeferredLoading.ts`

```typescript
import { useDeferredValue } from "react";

export function useDeferredLoading(loading: boolean): boolean {
  const deferredLoading = useDeferredValue(loading);
  return deferredLoading;
}
```

### Usage Pattern

1. Import the hook alongside other hooks:
```typescript
import { useDeferredLoading } from "@/hooks";
```

2. Create a deferred version of the loading state:
```typescript
const [loading, setLoading] = useState(true);
const deferredLoading = useDeferredLoading(loading);
```

3. Use `deferredLoading` in render logic instead of `loading`:
```typescript
if (deferredLoading) {
  return <Skeleton />;
}
return <ActualContent />;
```

## Updated Pages

The following pages have been updated to use deferred loading:

1. **Admin Users Page** (`src/app/(pages)/admin/users/page.tsx`)
   - Defers loading state from `useAdminUsersStore`
   - Prevents flicker when filtering users

2. **Admin Clubs Page** (`src/app/(pages)/admin/clubs/page.tsx`)
   - Defers local loading state
   - Prevents flicker when filtering clubs

3. **Admin Bookings Page** (`src/app/(pages)/admin/bookings/page.tsx`)
   - Defers `isLoadingBookings` state
   - Prevents flicker when filtering bookings

4. **Admin Courts Page** (`src/app/(pages)/admin/courts/page.tsx`)
   - Defers local loading state
   - Prevents flicker when filtering courts

5. **Player Clubs Page** (`src/app/(pages)/(player)/clubs/page.tsx`)
   - Defers loading state for public club search
   - Prevents flicker when searching or filtering clubs

## Benefits

1. **Better UX**: No visual jumps or flickers on fast responses
2. **Maintains Feedback**: Loading states still show for slower operations
3. **Minimal Changes**: Only requires wrapping loading states with the hook
4. **Type-Safe**: Fully typed with TypeScript
5. **Reusable**: Can be applied to any loading state across the application
6. **React 18 Native**: Uses built-in React features, no external dependencies

## Testing

Comprehensive test suite located at `src/__tests__/useDeferredLoading.test.tsx`

**Test Coverage:**
- ✓ Defers loading state updates
- ✓ Returns false when loading is false
- ✓ Eventually reflects the loading state
- ✓ Handles rapid loading state changes (prevents flicker)

**Run Tests:**
```bash
npm test -- useDeferredLoading.test.tsx
```

## Technical Details

### How useDeferredValue Works

React's `useDeferredValue` creates a "deferred" version of a value that updates with a slight delay. This allows React to:

1. Keep the UI responsive by prioritizing urgent updates
2. Defer non-urgent updates (like showing a loading state)
3. Skip deferred updates entirely if the actual value changes before the deferred value updates

For loading states, this means:
- If data loads quickly (before React can update the deferred value), the loading state never shows
- If data loads slowly, the loading state shows after a brief delay
- The threshold is automatic and managed by React's scheduler

### Browser Compatibility

- Requires React 18+
- Works in all modern browsers
- Gracefully degrades in older browsers (acts as a passthrough)

## Best Practices

1. **Use for Loading States**: Best suited for loading indicators that might show briefly
2. **Don't Overuse**: Not necessary for all loading states, only those prone to flickering
3. **Combine with Other Optimizations**: Works well with debounced inputs and optimistic updates
4. **Monitor Performance**: Ensure deferred updates don't negatively impact perceived performance

## Future Enhancements

Potential improvements for future iterations:

1. **Configurable Delay**: Add optional delay threshold parameter
2. **Loading Context**: Create a context provider for global loading state management
3. **Analytics**: Track how often loading states are skipped vs shown
4. **Custom Transition**: Add support for custom transition animations

## Related Files

- Hook Implementation: `src/hooks/useDeferredLoading.ts`
- Hook Export: `src/hooks/index.ts`
- Tests: `src/__tests__/useDeferredLoading.test.tsx`
- Admin Users Page: `src/app/(pages)/admin/users/page.tsx`
- Admin Clubs Page: `src/app/(pages)/admin/clubs/page.tsx`
- Admin Bookings Page: `src/app/(pages)/admin/bookings/page.tsx`
- Admin Courts Page: `src/app/(pages)/admin/courts/page.tsx`
- Player Clubs Page: `src/app/(pages)/(player)/clubs/page.tsx`

## References

- [React useDeferredValue Documentation](https://react.dev/reference/react/useDeferredValue)
- [React 18 Concurrent Features](https://react.dev/blog/2022/03/29/react-v18)
- [Project Copilot Settings](.github/copilot-settings.md)
