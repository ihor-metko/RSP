# Clubs Page List Controls Implementation

## Overview

This document describes the refactoring of the Admin Clubs page to use the standardized List Controls components, bringing consistency with other admin pages (e.g., Bookings).

## Implementation Date

December 13, 2025

## Files Modified

- `src/app/(pages)/admin/clubs/page.tsx`

## Changes Made

### 1. Component Imports

**Added:**
```typescript
import {
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  OrgSelector,
  SortSelect,
  PaginationControls,
} from "@/components/list-controls";
```

**Removed:**
- `Button` import (no longer needed as ListToolbar handles reset button)
- `Input` import (replaced by ListSearch)

### 2. Filter Interface Update

**Before:**
```typescript
interface ClubFilters {
  searchQuery: string;
  selectedOrganization: string;  // Old naming
  selectedCity: string;
  selectedStatus: string;
  selectedSportType: string;
}
```

**After:**
```typescript
interface ClubFilters {
  searchQuery: string;
  organizationFilter: string;     // New naming for consistency
  selectedCity: string;
  selectedStatus: string;
  selectedSportType: string;
}
```

### 3. Controller Initialization

**Before:**
```typescript
const {
  filters,
  setFilter,
  sortBy: sortByKey,
  setSortBy: setSortByKey,
  sortOrder,
  setSortOrder,
  page,
  setPage,
  pageSize,
  setPageSize,
  clearFilters,
} = useListController<ClubFilters>({
  entityKey: "clubs",
  defaultFilters: { /* ... */ },
  defaultSortBy: "createdAt",
  defaultSortOrder: "desc",
  defaultPageSize: 20,
});
```

**After:**
```typescript
const controller = useListController<ClubFilters>({
  entityKey: "clubs",
  defaultFilters: { /* ... */ },
  defaultSortBy: "name",           // Changed per requirements
  defaultSortOrder: "asc",         // Changed per requirements
  defaultPageSize: 25,             // Changed per requirements
});
```

### 4. UI Component Replacement

**Before (Custom Filter UI - 100+ lines):**
```typescript
<div className="im-admin-clubs-actions">
  <div className="im-admin-clubs-actions-left">
    <Input
      placeholder={t("common.search")}
      value={filters.searchQuery}
      onChange={(e) => setFilter("searchQuery", e.target.value)}
    />
    {/* Multiple custom select elements */}
    {/* Custom sort select */}
    {/* Custom clear filters button */}
  </div>
  <div className="im-admin-clubs-actions-right">
    {/* Create button */}
  </div>
</div>

{/* Custom pagination controls */}
<div className="im-pagination">
  {/* Custom pagination UI */}
</div>
```

**After (List Controls Components - ~40 lines):**
```typescript
<ListControllerProvider controller={controller}>
  <ListToolbar
    showReset
    actionButton={
      canCreate ? (
        <IMLink href="/admin/clubs/new" asButton variant="primary">
          {t("admin.clubs.createClub")}
        </IMLink>
      ) : undefined
    }
  >
    <ListSearch
      placeholder={t("common.search")}
      filterKey="searchQuery"
    />
    
    {showOrganizationFilter && (
      <OrgSelector
        filterKey="organizationFilter"
        label={t("admin.clubs.filterByOrganization")}
        placeholder={t("admin.clubs.allOrganizations")}
      />
    )}
    
    {/* Other filter selects */}
    
    <SortSelect
      options={sortOptions}
      label={t("admin.clubs.sortBy")}
    />
  </ListToolbar>
  
  {/* Content */}
  
  <PaginationControls
    totalCount={totalCount}
    totalPages={totalPages}
    showPageSize={true}
    pageSizeOptions={[10, 25, 50, 100]}
  />
</ListControllerProvider>
```

## Benefits

### 1. Code Quality
- **Reduced code**: Removed ~82 lines of duplicate filter UI code
- **Improved readability**: Clearer component structure
- **Better maintainability**: Single source of truth for list controls

### 2. Consistency
- **Unified pattern**: Matches Bookings page and other admin pages
- **Predictable behavior**: Users get consistent experience across pages
- **Shared components**: Easier to maintain and update globally

### 3. Features
- **Debounced search**: 300ms delay prevents excessive API calls
- **Filter persistence**: State saved to localStorage across sessions
- **Responsive layout**: Horizontal scroll on mobile, proper spacing on desktop
- **Accessibility**: Built-in ARIA attributes and keyboard navigation
- **Reset functionality**: Clear all filters with one click

### 4. User Experience
- **Faster filtering**: Debounced search provides smooth experience
- **State persistence**: Filters remembered between page visits
- **Visual consistency**: Familiar UI across all admin pages
- **Keyboard friendly**: Full keyboard navigation support

## Sort Options

The following sort options are available:

| Label | Sort Field | Direction | Description |
|-------|-----------|-----------|-------------|
| Name A-Z | name | asc | Sort clubs alphabetically |
| Name Z-A | name | desc | Sort clubs reverse alphabetically |
| Newest | createdAt | desc | Recently created clubs first |
| Oldest | createdAt | asc | Oldest clubs first |
| Most Bookings | bookingCount | desc | Clubs with most bookings first |

**Default**: Name A-Z (as specified in requirements)

## Filter Options

### Search (ListSearch)
- **Field**: `searchQuery`
- **Behavior**: Debounced (300ms), searches club name or ID
- **Resets page**: Yes (to page 1)

### Organization (OrgSelector)
- **Field**: `organizationFilter`
- **Visibility**: Root Admin only
- **Source**: Auto-fetched from `useOrganizationStore`
- **Behavior**: Filters clubs by organization
- **Resets page**: Yes

### City (Select)
- **Field**: `selectedCity`
- **Source**: Extracted from current clubs list
- **Behavior**: Client-side filter options
- **Resets page**: Yes

### Status (Select)
- **Field**: `selectedStatus`
- **Options**: All Statuses, Active, Draft, Suspended
- **Behavior**: Filters by club status
- **Resets page**: Yes

### Sport Type (Select)
- **Field**: `selectedSportType`
- **Source**: `SPORT_TYPE_OPTIONS` constant
- **Behavior**: Filters by supported sport
- **Resets page**: Yes

## Pagination

- **Default page size**: 25 items
- **Available sizes**: 10, 25, 50, 100
- **Navigation**: Previous/Next buttons + page selector
- **Info display**: Shows "X to Y of Z results"
- **Persistence**: Page size saved to localStorage

## API Integration

No changes were made to the API integration. The component still:
- Builds query parameters from controller state
- Fetches from `/api/admin/clubs?{params}`
- Handles pagination on server-side
- Supports all existing query parameters

## Backward Compatibility

- ✅ Existing API endpoints unchanged
- ✅ Navigation to club detail page unchanged
- ✅ All existing functionality preserved
- ✅ Role-based filtering still works
- ✅ Permission checks unchanged

## Testing Checklist

- [x] Search functionality works with debouncing
- [x] Organization filter works (Root Admin)
- [x] Sort options work correctly
- [x] Pagination controls work
- [x] Reset filters button works
- [x] Navigation to club detail works
- [x] No linting errors
- [x] No TypeScript errors
- [x] No security vulnerabilities

## Migration Notes

If other pages need similar refactoring:

1. Import List Controls components
2. Replace `useListController` destructuring with single `controller` variable
3. Wrap page content with `ListControllerProvider`
4. Replace filter UI with `ListToolbar` + filter components
5. Replace pagination UI with `PaginationControls`
6. Update `controller.filters`, `controller.page`, etc. references
7. Remove duplicate state management code
8. Test thoroughly

## References

- [List Controls README](../src/components/list-controls/README.md)
- [Bookings Page Implementation](../src/app/(pages)/admin/bookings/page.tsx)
- [useListController Hook](../src/hooks/useListController.ts)

## Support

For questions or issues related to this implementation:
1. Check the List Controls README
2. Review the Bookings page as a reference
3. Consult the component source code in `src/components/list-controls/`
