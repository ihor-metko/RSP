# Courts Page Pre-Selected Filters

## Overview

The Courts admin page now includes three pre-selected filters that are automatically applied when the page loads for the first time. These filters help administrators quickly view the most relevant courts based on their role and common use cases.

## Pre-Selected Filters

### 1. Status Filter
- **Default Value**: `active`
- **Purpose**: Shows only available/active courts
- **Behavior**: Applies to all admin roles
- **Rationale**: Most administrators want to see courts that are currently available for booking

### 2. Surface Type Filter
- **Default Value**: `Hard`
- **Purpose**: Shows only hard surface courts
- **Behavior**: Applies to all admin roles
- **Rationale**: Hard courts are the most common surface type and provide a good starting point for filtering

### 3. Organization/Club Filter
- **Default Value**: Role-based
- **Behavior**:
  - **Root Admin**: No pre-selection (sees all organizations and clubs)
  - **Organization Admin**: Pre-selects their first managed organization
  - **Club Admin**: Pre-selects their assigned club
- **Rationale**: Administrators typically want to see courts within their scope of management

## Implementation Details

### Filter Application Logic

```typescript
// Pre-selected filters are applied only when:
// 1. Admin status is loaded
// 2. No existing filters are saved in localStorage
// 3. All filter fields are empty

if (!hasExistingFilters && controller.isLoaded) {
  const preSelectedFilters = {
    statusFilter: "active",
    surfaceTypeFilter: "Hard",
    clubFilter: adminStatus.adminType === "club_admin" 
      ? adminStatus.managedIds[0] 
      : "",
    organizationFilter: adminStatus.adminType === "organization_admin"
      ? adminStatus.managedIds[0]
      : "",
  };
  controller.setFilters(preSelectedFilters);
}
```

### Persistence Behavior

- **First Visit**: Pre-selected filters are applied automatically
- **Subsequent Visits**: 
  - If the user has modified filters, their selections are persisted via localStorage
  - Pre-selected filters are NOT re-applied if any filters are already set
- **Clear Filters**: Users can clear all filters using the "Clear Filters" button
  - After clearing, pre-selected filters will NOT be automatically re-applied
  - Pre-selected filters only apply on the very first load

### User Control

Users have full control over the filters:
- **Modify**: Any pre-selected filter can be changed to a different value
- **Remove**: Any pre-selected filter can be cleared
- **Reset**: The "Clear Filters" button removes all filters
- **Persist**: Modified filters are automatically saved to localStorage

## Role-Based Behavior

### Root Admin
```typescript
{
  statusFilter: "active",
  surfaceTypeFilter: "Hard",
  organizationFilter: "",  // No pre-selection
  clubFilter: "",          // No pre-selection
}
```

### Organization Admin
```typescript
{
  statusFilter: "active",
  surfaceTypeFilter: "Hard",
  organizationFilter: "org-123",  // First managed organization
  clubFilter: "",                  // No pre-selection
}
```

### Club Admin
```typescript
{
  statusFilter: "active",
  surfaceTypeFilter: "Hard",
  organizationFilter: "",         // Not applicable
  clubFilter: "club-456",         // Assigned club
}
```

## Technical Architecture

### Components Involved
- **Page**: `src/app/(pages)/admin/courts/page.tsx`
- **Hook**: `useListController` from `@/hooks/useListController`
- **Store**: `useUserStore` from `@/stores/useUserStore`

### State Management
- Uses `useRef` to track if filters have been applied
- Prevents unnecessary re-renders by memoizing controller methods
- Integrates with localStorage for filter persistence

### Dependencies
```typescript
useEffect(() => {
  // Apply pre-selected filters logic
}, [
  adminStatus,
  isLoadingStore,
  controller.isLoaded,
  controller.filters,
  controller.setFilters
]);
```

## Testing

### Test Coverage
- **File**: `src/__tests__/admin-courts-preselected-filters.test.tsx`
- **Test Cases**: 10 test cases covering:
  - Filter pre-selection for each admin role
  - Filter persistence behavior
  - Pre-selected filter values
  - User ability to modify/clear filters

### Running Tests
```bash
npm test src/__tests__/admin-courts-preselected-filters.test.tsx
```

## User Experience

### First Load Scenario
1. User navigates to `/admin/courts`
2. Admin status is loaded from `useUserStore`
3. Pre-selected filters are automatically applied
4. Court list is filtered immediately
5. Filters are visible in the UI with selected values

### Subsequent Load Scenario
1. User returns to `/admin/courts`
2. Previously selected filters are loaded from localStorage
3. Pre-selected filters are NOT applied (user's choices are preserved)
4. Court list is filtered based on saved preferences

### Clear Filters Scenario
1. User clicks "Clear Filters" button
2. All filters are removed
3. Full unfiltered court list is displayed
4. Pre-selected filters are NOT automatically re-applied

## Benefits

1. **Reduced Clicks**: Users see relevant courts immediately without manual filtering
2. **Better UX**: Most common use case is handled by default
3. **Role-Aware**: Filters adapt to user's administrative scope
4. **Flexibility**: Users can easily modify or remove pre-selected filters
5. **Performance**: Server-side filtering reduces data transfer

## Future Enhancements

Potential improvements for future iterations:
- User-configurable default filters
- "Save as Default" option for custom filter combinations
- Filter presets (e.g., "My Active Courts", "Recently Updated")
- Smart defaults based on user behavior patterns

## Related Documentation
- [Courts Page Filters](./courts-page-filters.md)
- [List Controls](../../src/components/list-controls/README.md)
- [User Store](../../src/stores/README.md)
