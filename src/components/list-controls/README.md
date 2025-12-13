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
  StatusFilter,
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

Container component for filter controls with optional reset button. Renders filters in a **horizontal toolbar layout** with automatic overflow handling.

```typescript
<ListToolbar 
  controller={controller}
  showReset={true}
  resetLabel="Clear Filters"
  compact={false}
  actionButton={
    <Button onClick={handleAction} variant="primary">
      Create New
    </Button>
  }
>
  <ListSearch placeholder="Search..." />
  <QuickPresets presets={presets} />
  <DateRangeFilter field="createdAt" fromKey="dateFrom" toKey="dateTo" />
  {/* Add more filter components here */}
</ListToolbar>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `showReset?` - Show reset button (default: true)
- `resetLabel?` - Reset button label (default: "Clear Filters")
- `onReset?` - Custom reset handler
- `compact?` - Compact layout mode
- `className?` - Additional CSS classes
- `actionButton?` - Custom action button to display at top-right corner (ReactNode)

**Layout Features:**
- **Horizontal single-row layout** - All filters render in one row
- **Automatic horizontal scroll** - Overflows with visible scrollbar on narrow screens
- **Min-widths** - Each filter has sensible minimum widths (160px default, 320px for DateRangeFilter)
- **Responsive** - Maintains horizontal scroll on mobile while adjusting min-widths
- **Flexible** - Search input can grow up to 400px
- **Action Button** - Optional action button displayed at top-right corner
- QuickPresets and DateRangeFilter can be placed directly inside the toolbar

**Action Button Example:**
```typescript
// Pass a custom action button to the toolbar
<ListToolbar 
  showReset
  actionButton={
    <Button onClick={handleCreateBooking} variant="primary" aria-label="Create Booking">
      Create Booking
    </Button>
  }
>
  <ListSearch placeholder="Search bookings..." />
  <StatusFilter statuses={statusOptions} />
</ListToolbar>
```

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

### StatusFilter

Status filter dropdown for filtering by entity status (bookings, orders, etc.).

```typescript
<StatusFilter 
  controller={controller}
  filterKey="statusFilter"
  label="Status"
  statuses={[
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Paid' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]}
/>
```

**Props:**
- `controller?` - List controller (optional if using context)
- `filterKey?` - Filter key to update (default: "statusFilter")
- `statuses` - Available statuses (required)
- `label?` - Select label (default: "Status")
- `placeholder?` - Select placeholder (default: "All Statuses")
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
        {/* Consolidated horizontal toolbar with all filters */}
        <ListToolbar showReset>
          <ListSearch placeholder="Search users..." />
          
          {/* Quick presets integrated into toolbar */}
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

          {/* Date range filter integrated into toolbar */}
          <DateRangeFilter
            field="createdAt"
            label="Created Date"
          />
          
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
        </ListToolbar>

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

## Example: Courts Page

Here's a complete example of the Courts admin page using List Controls:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, IMLink, PageHeader, Table } from "@/components/ui";
import type { TableColumn } from "@/components/ui";
import { TableSkeleton } from "@/components/ui/skeletons";
import { useUserStore } from "@/stores/useUserStore";
import { SPORT_TYPE_OPTIONS } from "@/constants/sports";
import { useListController } from "@/hooks";
import { 
  ListControllerProvider,
  ListToolbar,
  ListSearch,
  OrgSelector,
  ClubSelector,
  StatusFilter,
  SortSelect,
  PaginationControls,
} from "@/components/list-controls";

interface CourtFilters {
  searchQuery: string;
  organizationFilter: string;
  clubFilter: string;
  statusFilter: string;
  sportTypeFilter: string;
}

export default function AdminCourtsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const adminStatus = useUserStore((state) => state.adminStatus);
  
  // Initialize list controller
  const controller = useListController<CourtFilters>({
    entityKey: "courts",
    defaultFilters: {
      searchQuery: "",
      organizationFilter: "",
      clubFilter: "",
      statusFilter: "",
      sportTypeFilter: "",
    },
    defaultSortBy: "name",
    defaultSortOrder: "asc",
    defaultPage: 1,
    defaultPageSize: 25,
  });

  // Fetch courts based on controller state
  const fetchCourts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: controller.page.toString(),
      limit: controller.pageSize.toString(),
    });
    
    if (controller.filters.searchQuery) params.append("search", controller.filters.searchQuery);
    if (controller.filters.clubFilter) params.append("clubId", controller.filters.clubFilter);
    if (controller.filters.statusFilter) params.append("status", controller.filters.statusFilter);
    if (controller.filters.sportTypeFilter) params.append("sportType", controller.filters.sportTypeFilter);
    params.append("sortBy", controller.sortBy);
    params.append("sortOrder", controller.sortOrder);

    const response = await fetch(`/api/admin/courts?${params}`);
    const data = await response.json();
    setCourts(data.courts);
    setPagination(data.pagination);
    setLoading(false);
  }, [controller.filters, controller.sortBy, controller.sortOrder, controller.page, controller.pageSize]);

  useEffect(() => {
    if (adminStatus?.isAdmin) {
      fetchCourts();
    }
  }, [adminStatus, fetchCourts]);

  // Define sort options
  const sortOptions = [
    { key: 'name', label: 'Name (A-Z)', direction: 'asc' as const },
    { key: 'name', label: 'Name (Z-A)', direction: 'desc' as const },
    { key: 'createdAt', label: 'Newest', direction: 'desc' as const },
    { key: 'bookings', label: 'Most bookings', direction: 'desc' as const },
  ];

  // Define status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Define table columns
  const columns: TableColumn<Court>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'organization', header: 'Organization', render: (court) => court.organization?.name || '-' },
    { key: 'club', header: 'Club', render: (court) => court.club.name },
    { key: 'sportType', header: 'Sport', render: (court) => court.sportType || '-' },
    { key: 'status', header: 'Status', render: (court) => court.isActive ? 'Active' : 'Inactive' },
    { key: 'bookingCount', header: 'Bookings', sortable: true },
    { key: 'actions', header: 'Actions', render: (court) => (
      <Button onClick={() => router.push(`/admin/clubs/${court.club.id}/courts/${court.id}`)}>
        View
      </Button>
    )},
  ];

  return (
    <ListControllerProvider controller={controller}>
      <main className="rsp-container p-8">
        <PageHeader title="Courts" description="Manage courts across clubs" />

        <section className="rsp-content space-y-4">
          {/* List Toolbar with Filters */}
          <ListToolbar
            showReset
            actionButton={
              <IMLink href="/admin/clubs">
                <Button variant="primary">Create Court</Button>
              </IMLink>
            }
          >
            <ListSearch placeholder="Search courts..." filterKey="searchQuery" />
            <OrgSelector filterKey="organizationFilter" placeholder="All Organizations" />
            <ClubSelector filterKey="clubFilter" orgFilterKey="organizationFilter" placeholder="All Clubs" />
            <StatusFilter filterKey="statusFilter" statuses={statusOptions} placeholder="All Statuses" />
            <StatusFilter filterKey="sportTypeFilter" statuses={SPORT_TYPE_OPTIONS} placeholder="All Sports" label="Sport" />
            <SortSelect options={sortOptions} />
          </ListToolbar>

          {/* Courts Table */}
          {loading ? (
            <TableSkeleton columns={7} rows={10} />
          ) : courts.length === 0 ? (
            <Card><div className="py-8 text-center">No courts match your filters</div></Card>
          ) : (
            <Table
              columns={columns}
              data={courts}
              keyExtractor={(court) => court.id}
              sortBy={controller.sortBy}
              sortOrder={controller.sortOrder}
              onSort={(key) => controller.setSortBy(key)}
            />
          )}

          {/* Pagination */}
          {!loading && courts.length > 0 && (
            <PaginationControls totalCount={pagination.total} totalPages={pagination.totalPages} showPageSize />
          )}
        </section>
      </main>
    </ListControllerProvider>
  );
}
```

**Key Features in This Example:**
- ✅ Persistent filters with localStorage using `useListController`
- ✅ Horizontal toolbar layout with all filters in one row
- ✅ Organization and club selectors with automatic filtering
- ✅ Status filters for court status and sport type
- ✅ Sort options integrated with table sorting
- ✅ Pagination controls with page size selector
- ✅ Action button in toolbar for creating new courts
- ✅ Table component for displaying court data
- ✅ Proper permission checks for showing action buttons
- ✅ Automatic refetch when filters, sorting, or pagination changes

## Contributing

When adding new filter components:
1. Follow the existing component patterns
2. Support both controller prop and context
3. Include TypeScript types
4. Add ARIA attributes
5. Write tests
6. Update this README
