# Organizations Page - List Controls Implementation

## Overview
The Organizations admin page has been refactored to use the reusable List Controls UI components and `useListController` hook, eliminating duplicated filter/sort/pagination logic and providing a consistent user experience across admin pages.

## Changes Summary

### Before (Card-Based Layout)
- Manual state management for search, filters, sort, pagination
- Custom toolbar with Input, Select components
- Card grid layout with AdminOrganizationCard components
- Custom pagination controls
- ~1220 lines of code with complex modals

### After (Table-Based Layout)
- `useListController` hook for persistent state management
- List Controls components: ListToolbar, ListSearch, StatusFilter, SortSelect, PaginationControls
- Table component with sortable columns
- Built-in pagination from PaginationControls
- ~290 lines of code (76% reduction)

## Key Components Used

### 1. useListController Hook
```typescript
const controller = useListController<OrganizationFilters>({
  entityKey: "organizations",
  defaultFilters: {
    searchQuery: "",
    sportTypeFilter: "",
  },
  defaultSortBy: "createdAt",
  defaultSortOrder: "desc",
  defaultPage: 1,
  defaultPageSize: 25,
});
```

**Benefits:**
- Automatic localStorage persistence
- Centralized state management
- Type-safe filters interface

### 2. List Controls Components

#### ListToolbar
Horizontal toolbar with consolidated filters and action button:
```typescript
<ListToolbar
  showReset
  actionButton={
    <IMLink href="/admin/organizations/new" asButton variant="primary">
      Create Organization
    </IMLink>
  }
>
  {/* Filter components */}
</ListToolbar>
```

#### ListSearch
Debounced search input:
```typescript
<ListSearch
  placeholder="Search organizations..."
  filterKey="searchQuery"
/>
```

#### StatusFilter
Sport type filtering:
```typescript
<StatusFilter
  filterKey="sportTypeFilter"
  statuses={sportTypeOptions}
  label="Sport"
  placeholder="All Sports"
/>
```

#### SortSelect
Combined sort field + direction:
```typescript
<SortSelect
  options={sortOptions}
  label="Sort by"
/>
```

#### PaginationControls
Pagination with page size selector:
```typescript
<PaginationControls
  totalCount={totalCount}
  totalPages={totalPages}
  showPageSize
/>
```

### 3. Table Component

Replaced card grid with a table for better data presentation:

```typescript
const columns: TableColumn<Organization>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    render: (org) => (
      <button onClick={() => router.push(`/admin/organizations/${org.id}`)}>
        {org.name}
      </button>
    ),
  },
  {
    key: "superAdmins",
    header: "Super Admins",
    render: (org) => {
      // Display comma-separated admin names
    },
  },
  {
    key: "clubCount",
    header: "Clubs",
    sortable: true,
  },
  {
    key: "actions",
    header: "Actions",
    render: (org) => (
      <Button onClick={() => router.push(`/admin/organizations/${org.id}`)}>
        View
      </Button>
    ),
  },
];
```

**Table Features:**
- Sortable columns (name, clubCount)
- Clickable organization names
- Admin names display (no avatars per requirements)
- Action buttons for navigation

## Data Fetching

Simplified data fetching using controller state:

```typescript
const fetchOrganizations = useCallback(async () => {
  const params = new URLSearchParams();
  if (controller.filters.searchQuery) params.append("search", controller.filters.searchQuery);
  if (controller.filters.sportTypeFilter) params.append("sportType", controller.filters.sportTypeFilter);
  params.append("sortBy", controller.sortBy);
  params.append("sortOrder", controller.sortOrder);
  params.append("page", controller.page.toString());
  params.append("pageSize", controller.pageSize.toString());

  const response = await fetch(`/api/admin/organizations?${params}`);
  // Handle response...
}, [controller.filters, controller.sortBy, controller.sortOrder, controller.page, controller.pageSize]);
```

## Authentication

Uses `useUserStore` for role-based access control:

```typescript
const isLoggedIn = useUserStore((state) => state.isLoggedIn);
const hasRole = useUserStore((state) => state.hasRole);

// Check if user is root admin
if (!hasRole("ROOT_ADMIN")) {
  router.push("/auth/sign-in");
  return;
}
```

## Loading States

Uses `TableSkeleton` component for loading state:

```typescript
{isLoading ? (
  <TableSkeleton columns={4} rows={controller.pageSize > 12 ? 12 : controller.pageSize} />
) : organizations.length === 0 ? (
  <div className="im-admin-organizations-empty">
    <p>No organizations found</p>
  </div>
) : (
  <Table {...tableProps} />
)}
```

## CSS Styling

Added new styles for table links and admin display:

```css
.im-table-link {
  background: none;
  border: none;
  color: var(--im-accent, #6366f1);
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s ease;
}

.im-table-link:hover {
  color: var(--im-accent-dark, #4f46e5);
  text-decoration: underline;
}

.im-table-admins {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
```

## Removed Features

The following features were removed from the list page (per requirements, they are now only available on the organization detail page):
- Create organization modal
- Assign admin modal
- Manage admins functionality
- Club admins management
- Edit/delete actions from list view

This simplifies the list page to focus on browsing and navigation, with all management actions consolidated on the detail page.

## Benefits

1. **Consistency**: Matches the pattern used in Courts and Clubs admin pages
2. **Maintainability**: Centralized filter logic, no code duplication
3. **User Experience**: Persistent filters survive page reloads
4. **Performance**: Efficient state management with localStorage
5. **Code Reduction**: 76% reduction in code (1220 → 290 lines)
6. **Type Safety**: TypeScript interfaces for filters and data
7. **Accessibility**: Built-in ARIA labels and keyboard navigation

## Testing

Existing API tests remain valid as only the UI layer was changed:
- `src/__tests__/admin-organizations.test.ts` - All API tests still pass
- Manual testing required for UI interactions

## Future Enhancements

Potential improvements for future iterations:
1. Server-side pagination (currently client-side)
2. Advanced filtering (date ranges, multi-select sports)
3. Bulk operations (multi-select with actions)
4. Export functionality (CSV, Excel)
5. Column customization (show/hide columns)

## Related Documentation

- [List Controls README](../src/components/list-controls/README.md) - Complete component documentation
- [useListController Hook](../src/hooks/useListController.ts) - Hook implementation
- [Copilot Settings](../.github/copilot-settings.md) - Project conventions

## Migration Guide

To migrate other admin pages to this pattern:

1. Import List Controls components and hook
2. Define filters interface
3. Initialize `useListController` with entityKey and defaults
4. Wrap page with `ListControllerProvider`
5. Replace custom filter UI with List Controls components
6. Update data fetching to use controller state
7. Convert cards/custom layout to Table component
8. Remove manual pagination logic
9. Add TableSkeleton for loading states
10. Test all filter/sort/pagination interactions
