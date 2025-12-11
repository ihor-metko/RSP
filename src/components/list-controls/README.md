# List Controls Components

Reusable UI components for list filtering, sorting, and pagination that integrate with the `useListController` hook.

## Quick Start

```typescript
import { useListController } from "@/hooks";
import { 
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  PaginationControls,
} from "@/components/list-controls";

function MyListPage() {
  const controller = useListController({
    entityKey: "users",
    defaultFilters: { searchQuery: "" },
  });

  return (
    <ListControllerProvider controller={controller}>
      <ListToolbar>
        <ListSearch placeholder="Search..." />
      </ListToolbar>
      
      {/* Your table/grid here */}
      
      <PaginationControls totalCount={100} totalPages={4} />
    </ListControllerProvider>
  );
}
```

## Overview

These components provide a consistent, accessible, and type-safe way to build list pages with filters, sorting, and pagination. They eliminate code duplication across admin pages and ensure a uniform user experience.

## Features

- 🎯 **Type-safe** - Full TypeScript support with generics
- ♿ **Accessible** - ARIA labels, keyboard navigation
- 🎨 **Themeable** - Uses `im-*` classes and dark theme
- 🔄 **Context-based** - Share controller via context or props
- ⚡ **Debounced** - Smart debouncing for search inputs
- 📱 **Responsive** - Mobile-friendly layouts

## Installation

Components are located in `@/components/list-controls` and can be imported individually or all at once:

```typescript
import { 
  ListToolbar, 
  ListSearch, 
  PaginationControls,
  OrgSelector,
  ClubSelector,
  RoleFilter,
  DateRangeFilter,
  QuickPresets,
  SortSelect,
} from "@/components/list-controls";
```

## Components

### ListControllerProvider & useListControllerContext

Context wrapper for sharing a controller across multiple components.

```typescript
import { useListController } from "@/hooks";
import { ListControllerProvider, ListToolbar, ListSearch } from "@/components/list-controls";

function MyListPage() {
  const controller = useListController({
    entityKey: "users",
    defaultFilters: { search: "", role: "" },
  });

  return (
    <ListControllerProvider controller={controller}>
      <ListToolbar>
        <ListSearch placeholder="Search users..." />
      </ListToolbar>
    </ListControllerProvider>
  );
}
```

### ListToolbar

Container component for filter controls with optional reset button.

```typescript
<ListToolbar 
  controller={controller}
  showReset={true}
  resetLabel="Clear Filters"
  compact={false}
>
  {/* Add filter components here */}
</ListToolbar>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `showReset?` - Show reset button (default: true)
- `resetLabel?` - Reset button label (default: "Clear Filters")
- `onReset?` - Custom reset handler
- `compact?` - Compact layout mode
- `className?` - Additional CSS classes

### ListSearch

Debounced search input with Enter key support.

```typescript
<ListSearch 
  controller={controller}
  placeholder="Search..."
  debounceMs={300}
  filterKey="searchQuery"
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `placeholder?` - Input placeholder (default: "Search...")
- `debounceMs?` - Debounce delay in ms (default: 300)
- `filterKey?` - Filter key to update (default: "searchQuery")
- `className?` - Additional CSS classes

**Features:**
- Auto-debounced updates
- Press Enter for immediate search
- Resets page to 1 automatically

### PaginationControls

Pagination UI with page navigation and size selector.

```typescript
<PaginationControls 
  controller={controller}
  totalCount={150}
  totalPages={6}
  showPageSize={true}
  pageSizeOptions={[10, 25, 50, 100]}
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `totalCount?` - Total number of items
- `totalPages?` - Total number of pages
- `showPageSize?` - Show page size selector (default: true)
- `pageSizeOptions?` - Available page sizes (default: [10, 25, 50, 100])
- `className?` - Additional CSS classes
- `t?` - Translation function (optional)

### SortSelect

Sort dropdown with combined key + direction options.

```typescript
<SortSelect 
  controller={controller}
  label="Sort by"
  options={[
    { key: 'createdAt', label: 'Newest', direction: 'desc' },
    { key: 'createdAt', label: 'Oldest', direction: 'asc' },
    { key: 'name', label: 'Name A-Z', direction: 'asc' },
    { key: 'name', label: 'Name Z-A', direction: 'desc' },
  ]}
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `options` - Sort options (required)
- `label?` - Select label
- `placeholder?` - Select placeholder
- `className?` - Additional CSS classes

### OrgSelector

Organization selector with auto-fetch from store.

```typescript
<OrgSelector 
  controller={controller}
  filterKey="organizationFilter"
  label="Organization"
  placeholder="All Organizations"
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `filterKey?` - Filter key to update (default: "organizationFilter")
- `label?` - Select label (default: "Organization")
- `placeholder?` - Select placeholder (default: "All Organizations")
- `className?` - Additional CSS classes

**Features:**
- Automatically fetches organizations from store
- Clears dependent club filter when changed

### ClubSelector

Club selector that reacts to organization selection.

```typescript
<ClubSelector 
  controller={controller}
  filterKey="clubFilter"
  orgFilterKey="organizationFilter"
  label="Club"
  placeholder="All Clubs"
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `filterKey?` - Filter key to update (default: "clubFilter")
- `orgFilterKey?` - Organization filter key to read (default: "organizationFilter")
- `label?` - Select label (default: "Club")
- `placeholder?` - Select placeholder (default: "All Clubs")
- `className?` - Additional CSS classes

**Features:**
- Automatically fetches clubs from store
- Filters clubs by selected organization
- Auto-clears when organization changes

### RoleFilter

Role filter dropdown.

```typescript
<RoleFilter 
  controller={controller}
  filterKey="roleFilter"
  label="Role"
  roles={[
    { value: 'root_admin', label: 'Root Admin' },
    { value: 'organization_admin', label: 'Organization Admin' },
    { value: 'club_admin', label: 'Club Admin' },
    { value: 'user', label: 'User' },
  ]}
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `filterKey?` - Filter key to update (default: "roleFilter")
- `roles` - Available roles (required)
- `label?` - Select label (default: "Role")
- `placeholder?` - Select placeholder (default: "All Roles")
- `className?` - Additional CSS classes

### DateRangeFilter

Date range picker with from/to inputs.

```typescript
<DateRangeFilter 
  controller={controller}
  field="createdAt"
  label="Created Date"
  fromKey="dateFrom"
  toKey="dateTo"
  fromLabel="From"
  toLabel="To"
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `field` - Base field name (required)
- `label?` - Filter label
- `fromKey?` - From date filter key (default: "dateFrom")
- `toKey?` - To date filter key (default: "dateTo")
- `fromLabel?` - From input label (default: "From")
- `toLabel?` - To input label (default: "To")
- `className?` - Additional CSS classes

### QuickPresets

Quick filter preset buttons for common combinations.

```typescript
<QuickPresets 
  controller={controller}
  presets={[
    { 
      id: 'active_last_30d', 
      label: 'Active Last 30 Days',
      filters: { activeLast30d: true }
    },
    { 
      id: 'never_booked', 
      label: 'Never Booked',
      filters: { neverBooked: true }
    },
  ]}
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `presets` - Preset definitions (required)
- `className?` - Additional CSS classes

**Features:**
- Toggle presets on/off
- Visual indication of active preset
- Supports multiple simultaneous presets

## Complete Example

Here's a complete example showing all components working together:

```typescript
"use client";

import { useListController } from "@/hooks";
import { 
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  SortSelect,
  OrgSelector,
  ClubSelector,
  RoleFilter,
  DateRangeFilter,
  QuickPresets,
  PaginationControls,
} from "@/components/list-controls";

interface UserFilters {
  searchQuery: string;
  roleFilter: string;
  organizationFilter: string;
  clubFilter: string;
  dateFrom: string;
  dateTo: string;
  activeLast30d: boolean;
  neverBooked: boolean;
}

export default function UsersPage() {
  // Initialize controller
  const controller = useListController<UserFilters>({
    entityKey: "users",
    defaultFilters: {
      searchQuery: "",
      roleFilter: "",
      organizationFilter: "",
      clubFilter: "",
      dateFrom: "",
      dateTo: "",
      activeLast30d: false,
      neverBooked: false,
    },
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultPageSize: 25,
  });

  // Fetch data based on controller state
  // ... your data fetching logic

  return (
    <ListControllerProvider controller={controller}>
      <div className="space-y-4">
        {/* Toolbar with all filters */}
        <ListToolbar showReset>
          <ListSearch placeholder="Search users..." />
          
          <SortSelect
            label="Sort"
            options={[
              { key: 'createdAt', label: 'Newest', direction: 'desc' },
              { key: 'createdAt', label: 'Oldest', direction: 'asc' },
              { key: 'name', label: 'Name A-Z', direction: 'asc' },
            ]}
          />
          
          <RoleFilter
            roles={[
              { value: 'root_admin', label: 'Root Admin' },
              { value: 'organization_admin', label: 'Org Admin' },
              { value: 'user', label: 'User' },
            ]}
          />
          
          <OrgSelector />
          <ClubSelector />
          
          <DateRangeFilter
            field="createdAt"
            label="Created Date"
          />
        </ListToolbar>

        {/* Quick presets */}
        <QuickPresets
          presets={[
            { 
              id: 'active_30d', 
              label: 'Active Last 30 Days',
              filters: { activeLast30d: true }
            },
            { 
              id: 'never_booked', 
              label: 'Never Booked',
              filters: { neverBooked: true }
            },
          ]}
        />

        {/* Your data display (table, cards, etc.) */}
        {/* ... */}

        {/* Pagination */}
        <PaginationControls
          totalCount={totalCount}
          totalPages={totalPages}
        />
      </div>
    </ListControllerProvider>
  );
}
```

## SSR / Hydration

When fetching initial data on the server, you can hydrate the controller with the initial dataset to avoid duplicate client-side fetches:

```typescript
// Server Component
export default async function UsersPage() {
  const initialData = await fetchUsers({ page: 1, pageSize: 25 });
  
  return <UsersClient initialData={initialData} />;
}

// Client Component
"use client";

export function UsersClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const controller = useListController({...});
  
  useEffect(() => {
    // Only fetch if filters have changed from initial state
    if (controller.isLoaded) {
      fetchUsers(controller).then(setData);
    }
  }, [controller.filters, controller.sortBy, controller.sortOrder, controller.page]);
  
  // ...
}
```

## Testing

See the `__tests__` directory for component test examples. All components are designed to be testable with React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { ListSearch } from '@/components/list-controls';

test('renders search input', () => {
  const mockController = {
    filters: { searchQuery: '' },
    setFilter: jest.fn(),
    // ... other controller methods
  };
  
  render(<ListSearch controller={mockController} placeholder="Search..." />);
  expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
});
```

## Styling

All components use `im-*` semantic classes and follow the dark theme pattern. Custom styles can be applied via the `className` prop.

## Accessibility

All components include:
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader announcements

## Migration Guide

To migrate an existing list page:

1. Replace your list state with `useListController`
2. Wrap your page with `ListControllerProvider`
3. Replace individual filter inputs with list control components
4. Replace pagination UI with `PaginationControls`
5. Remove duplicate filter logic and state management

Before:
```typescript
const [search, setSearch] = useState("");
const [role, setRole] = useState("");
const [page, setPage] = useState(1);
// ... lots of filter state
```

After:
```typescript
const controller = useListController({
  entityKey: "users",
  defaultFilters: { searchQuery: "", roleFilter: "" },
});
```

## Contributing

When adding new filter components:
1. Follow the existing component patterns
2. Support both controller prop and context
3. Include TypeScript types
4. Add ARIA attributes
5. Write tests
6. Update this README
