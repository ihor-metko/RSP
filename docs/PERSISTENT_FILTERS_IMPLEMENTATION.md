# Frontend-Persistent Filters Implementation

## Overview

This document describes the implementation of frontend-persistent filters for Admin List Pages (Users, Clubs, Bookings). The filters, sorting, and pagination state are now automatically saved to localStorage and persist across page reloads and navigation.

## Architecture

### useListController Hook

A custom React hook that manages list state with automatic localStorage persistence:

**Location:** `src/hooks/useListController.ts`

**Key Features:**
- **Automatic Persistence**: State is automatically saved to localStorage with debouncing (default: 300ms)
- **Entity-Specific Storage**: Each list page has its own storage key (e.g., `filters_users`, `filters_clubs`, `filters_bookings`)
- **Type-Safe**: Fully typed with TypeScript generics for filter types
- **Merge Strategy**: Stored filters are merged with defaults to ensure all fields exist
- **Error Handling**: Gracefully handles localStorage errors with console warnings
- **Future-Ready**: Designed with abstraction layer for easy migration to server-side persistence

**Hook Interface:**
```typescript
interface UseListControllerOptions<TFilters> {
  entityKey: string;                    // Unique key for localStorage (e.g., 'users', 'clubs')
  defaultFilters: TFilters;             // Default filter values
  defaultSortBy?: string;               // Default sort field (default: 'createdAt')
  defaultSortOrder?: 'asc' | 'desc';    // Default sort order (default: 'desc')
  defaultPage?: number;                 // Default page number (default: 1)
  defaultPageSize?: number;             // Default page size (default: 10)
  debounceDelay?: number;               // Debounce delay in ms (default: 300)
  enablePersistence?: boolean;          // Enable/disable persistence (default: true)
}

interface UseListControllerReturn<TFilters> {
  filters: TFilters;                    // Current filters state
  sortBy: string;                       // Current sort field
  sortOrder: 'asc' | 'desc';            // Current sort order
  page: number;                         // Current page number
  pageSize: number;                     // Current page size
  setFilters: (filters: Partial<TFilters> | ((prev: TFilters) => TFilters)) => void;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  clearFilters: () => void;             // Reset filters to defaults
  reset: () => void;                    // Reset all state to defaults
  isLoaded: boolean;                    // Indicates if state loaded from localStorage
}
```

### Usage Pattern

1. **Define Filter Interface:**
   ```typescript
   interface UserFilters {
     searchQuery: string;
     roleFilter: string;
     statusFilter: string;
     organizationFilter: string;
     clubFilter: string;
   }
   ```

2. **Initialize Hook:**
   ```typescript
   const {
     filters,
     setFilter,
     sortBy,
     setSortBy,
     sortOrder,
     setSortOrder,
     page,
     setPage,
     pageSize,
     setPageSize,
     clearFilters,
   } = useListController<UserFilters>({
     entityKey: "users",
     defaultFilters: {
       searchQuery: "",
       roleFilter: "",
       statusFilter: "",
       organizationFilter: "",
       clubFilter: "",
     },
     defaultSortBy: "createdAt",
     defaultSortOrder: "desc",
     defaultPage: 1,
     defaultPageSize: 10,
   });
   ```

3. **Use in UI:**
   ```typescript
   <Input
     value={filters.searchQuery}
     onChange={(e) => setFilter("searchQuery", e.target.value)}
   />
   
   <Select
     value={filters.roleFilter}
     onChange={(value) => setFilter("roleFilter", value)}
   />
   
   <button onClick={() => setPage(page + 1)}>Next</button>
   ```

## Implemented Pages

### 1. Admin Users Page
**Location:** `src/app/(pages)/admin/users/page.tsx`

**Persisted State:**
- Search query
- Role filter
- Status filter (active/blocked)
- Organization filter
- Club filter
- Sort field and order
- Page number and page size

**Storage Key:** `filters_users`

### 2. Admin Clubs Page
**Location:** `src/app/(pages)/admin/clubs/page.tsx`

**Persisted State:**
- Search query
- Organization filter (root admin only)
- City filter
- Status filter (active/draft/suspended)
- Sort field and order
- Page number and page size

**Storage Key:** `filters_clubs`

### 3. Admin Bookings Page
**Location:** `src/app/(pages)/admin/bookings/page.tsx`

**Persisted State:**
- Organization filter (root admin only)
- Club filter (root and org admins)
- Date range (from/to)
- Status filter
- Page number and page size

**Storage Key:** `filters_bookings`

## Testing

Comprehensive test suite located at `src/__tests__/useListController.test.ts`

**Test Coverage:**
- ✓ Initialize with default values
- ✓ Update filters (individual and batch)
- ✓ Update sort field and order
- ✓ Update page number and page size
- ✓ Clear filters
- ✓ Reset all state
- ✓ Persist state to localStorage with debounce
- ✓ Load state from localStorage on mount
- ✓ Merge stored filters with defaults
- ✓ Work without persistence (when disabled)
- ✓ Handle localStorage errors gracefully
- ✓ Update filters using a function

**Run Tests:**
```bash
npm test -- useListController.test.ts
```

## Benefits

1. **Improved UX**: Users don't lose their filter settings when navigating away or refreshing
2. **Consistent Behavior**: All admin list pages work the same way
3. **Type Safety**: TypeScript ensures correct filter types throughout
4. **Performance**: Debounced writes prevent excessive localStorage operations
5. **Reliability**: Graceful error handling ensures app still works if localStorage fails
6. **Maintainability**: Centralized logic makes it easier to add new list pages
7. **Future-Ready**: Easy to migrate to server-side persistence when needed

## Migration to Server-Side Persistence

When ready to move persistence to the server, follow these steps:

1. **Add Backend Storage**: Create API endpoints to save/load user preferences
2. **Update Hook**: Modify `saveToStorage` and `getInitialState` to use API calls
3. **Keep Interface**: The hook's interface remains the same, no changes needed in pages
4. **Gradual Migration**: Can migrate one entity at a time (users first, then clubs, etc.)

Example modification:
```typescript
const saveToStorage = useCallback(async (newState: ListState<TFilters>) => {
  if (!enablePersistence) return;
  
  try {
    // Server-side: POST to API
    await fetch('/api/user/preferences', {
      method: 'POST',
      body: JSON.stringify({ key: storageKey, value: newState }),
    });
  } catch (error) {
    console.warn('Failed to save preferences:', error);
  }
}, [enablePersistence, storageKey]);
```

## Best Practices

1. **Entity Keys**: Use clear, descriptive entity keys (e.g., 'users', 'clubs', not 'page1')
2. **Default Values**: Always provide sensible defaults for all filter fields
3. **Filter Types**: Define explicit TypeScript interfaces for filter types
4. **Debounce Delay**: Use default 300ms for most cases, adjust only if needed
5. **Error Handling**: Trust the hook's error handling, no need to wrap in try-catch
6. **Testing**: Test your page with localStorage disabled to ensure graceful degradation

## Troubleshooting

**Issue: Filters not persisting**
- Check browser console for localStorage errors
- Verify entityKey is unique and consistent
- Check if localStorage is disabled in browser

**Issue: Stale filters after code changes**
- Clear browser localStorage manually
- Or add version number to storage key (e.g., `filters_users_v2`)

**Issue: Page resets when filter changes**
- This is intentional behavior (UX best practice)
- setFilter automatically resets page to 1

## Related Files

- Hook Implementation: `src/hooks/useListController.ts`
- Hook Export: `src/hooks/index.ts`
- Tests: `src/__tests__/useListController.test.ts`
- Admin Users Page: `src/app/(pages)/admin/users/page.tsx`
- Admin Clubs Page: `src/app/(pages)/admin/clubs/page.tsx`
- Admin Bookings Page: `src/app/(pages)/admin/bookings/page.tsx`

## Additional Notes

- The hook is built following `.github/copilot-settings.md` guidelines
- All UI components use existing components from `components/ui/*` library
- Implementation maintains the dark theme with `im-*` classes
- Code is fully type-safe and follows TypeScript best practices
