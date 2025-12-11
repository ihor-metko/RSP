# Admin Bookings Page

## Overview

The Admin Bookings page provides a comprehensive interface for managing bookings across organizations, clubs, and courts. It uses the List Controls components for consistent filtering, sorting, and pagination.

## Location

- **Path**: `/admin/bookings`
- **File**: `src/app/(pages)/admin/bookings/page.tsx`

## Features

### Role-Based Access

The page adapts its UI based on the admin's role:

- **Root Admin**: Can filter by organization and club, sees all bookings
- **Organization Admin**: Can filter by club within their organization(s)
- **Club Admin**: Sees only bookings for their assigned club(s)

### Filters

The page includes the following filters (via List Controls components):

1. **Search** (`ListSearch`): Global search for booking ID, user name, or email
2. **Organization Selector** (`OrgSelector`): Filter by organization (Root Admin only)
3. **Club Selector** (`ClubSelector`): Filter by club (reactive to organization selection)
4. **Status Filter** (`StatusFilter`): Filter by booking status:
   - Pending
   - Paid
   - Reserved
   - Cancelled
5. **Date Range Filter** (`DateRangeFilter`): Filter by booking start date

### Quick Presets

Pre-configured date range filters for common use cases:
- **Today**: Bookings for today
- **Next 7 Days**: Bookings in the next week
- **This Week**: Bookings for the current week (Monday-Sunday)

### Sorting

Available sort options (via `SortSelect`):
- Start Time (Ascending)
- Start Time (Descending)
- Created At (Newest)
- Created At (Oldest)
- Status

### Table View

The bookings table displays:
- Booking ID (shortened)
- User (name or email)
- Organization (Root Admin only)
- Club (Root/Org Admin only)
- Court
- Date & Time (localized to Europe/Kyiv)
- Duration (in minutes)
- Status (with badge)
- Actions (View button)

### Pagination

- Default page size: 25 bookings
- Available page sizes: 25, 50, 100
- Server-side pagination via API

### Actions

#### View Booking
Opens a modal with detailed booking information:
- User details (name, email)
- Court details (name, club, type, surface)
- Booking details (date/time, duration, status, price, coach if applicable, creation date)
- Cancel action (if booking is not already cancelled)

#### Create Booking
Opens the Admin Quick Booking Wizard for creating new bookings.

## API Integration

The page fetches data from:
- **Endpoint**: `GET /api/admin/bookings`
- **Query Parameters**:
  - `search`: Search query
  - `orgId`: Organization ID filter
  - `clubId`: Club ID filter
  - `status`: Status filter
  - `dateFrom`: Start date filter (ISO 8601)
  - `dateTo`: End date filter (ISO 8601)
  - `page`: Page number
  - `perPage`: Results per page

## State Management

### Controller

Uses `useListController` hook with:
- **Entity Key**: `"bookings"`
- **Default Filters**:
  ```typescript
  {
    searchQuery: "",
    organizationFilter: "",
    clubFilter: "",
    statusFilter: "",
    dateFrom: "",
    dateTo: "",
  }
  ```
- **Default Sort**: `startAt` ascending
- **Default Page Size**: 25

### Persistence

All filter, sort, and pagination state is automatically persisted to localStorage via the `useListController` hook. This ensures that user preferences are maintained across page reloads and navigation.

## Components Used

### From List Controls
- `ListControllerProvider`: Context provider for sharing controller state
- `ListToolbar`: Container for filter controls with reset button
- `ListSearch`: Debounced search input
- `OrgSelector`: Organization selector (auto-fetches from store)
- `ClubSelector`: Club selector (reactive to organization)
- `StatusFilter`: Booking status filter
- `DateRangeFilter`: Date range picker
- `QuickPresets`: Quick date range buttons
- `SortSelect`: Sorting dropdown
- `PaginationControls`: Pagination UI

### From UI
- `PageHeader`: Page title and description
- `Button`: Actions and controls
- `Modal`: Booking detail view
- `Table`: Bookings table display

### From Stores
- `useUserStore`: Admin status and authentication
- No direct club/org store usage (handled by selectors)

## Loading States

- **Initial Load**: Loading skeleton showing approximate table structure
- **Empty State**: Friendly message with CTA to create a booking when no results match filters

## Error Handling

- 401 (Unauthorized): Redirects to sign-in page
- 403 (Forbidden): Shows access denied error
- 500 (Server Error): Shows generic error message
- Network Errors: Shows "failed to load" message

## Code Reduction

Compared to the original implementation, the refactored page:
- **Removed**: ~150 lines of manual filter/pagination UI code
- **Added**: List Controls component usage
- **Benefit**: Consistent UX, less code duplication, automatic persistence

## Testing

### Unit Tests
Tests for StatusFilter component are included in `src/__tests__/list-controls.test.tsx`

### Manual Testing Checklist
- [ ] Root admin can see all bookings
- [ ] Organization admin sees only their org's bookings
- [ ] Club admin sees only their club's bookings
- [ ] Search filters by user name/email/booking ID
- [ ] Organization filter updates club filter options
- [ ] Status filter correctly filters bookings
- [ ] Date range filter works correctly
- [ ] Quick presets set correct date ranges
- [ ] Sorting changes order of results
- [ ] Pagination navigates through pages
- [ ] Page size change resets to page 1
- [ ] View action opens modal with correct details
- [ ] Cancel action works (with confirmation)
- [ ] Create booking wizard opens
- [ ] Filters persist after page reload

## Future Enhancements

Potential improvements mentioned in the requirements but not yet implemented:
- **Calendar View**: Toggle to view bookings in a calendar layout
- **Export**: Export bookings to CSV/Excel
- **Bulk Actions**: Select multiple bookings for bulk operations
- **Advanced Filters**: Coach filter, court type filter, price range

## Related Files

- Page: `src/app/(pages)/admin/bookings/page.tsx`
- Styles: `src/app/(pages)/admin/bookings/AdminBookings.css`
- API Route: `src/app/api/admin/bookings/route.ts`
- API Types: `src/app/api/admin/bookings/route.ts` (exports)
- List Controls: `src/components/list-controls/`
- Hook: `src/hooks/useListController.ts`
