# Operations Dashboard Page

## Overview

The Operations Dashboard is a dedicated page for **Organization Admins** to manage and monitor their clubs' operational data. The page provides a centralized view of bookings, court status, and quick access to common administrative actions.

## Location

**Path:** `/admin/operations`  
**File:** `src/app/(pages)/admin/operations/page.tsx`

## Access Control

- **Allowed:** Organization Admins only
- **Restricted:** Club Admins, Root Admins, and non-admin users are redirected
- **Redirect:** Users without proper access are redirected to `/admin/dashboard`

## Features

### 1. Club Picker

The page begins with a **club selection dropdown** at the top. This is a required first step before viewing operational data.

- Automatically loads all clubs within the organization admin's managed organizations
- Auto-selects the first club if none is selected
- Remembers selection during the session (component state)

### 2. Quick Actions

Once a club is selected, users have access to three quick action buttons:

- **Create Booking:** Navigate to the bookings page with the selected club pre-selected
- **Block Court:** Navigate to the courts management page for the selected club
- **View Schedule:** Navigate to the detailed operations calendar view for the selected club

### 3. Operational Data Sections

The page displays three main data sections in a responsive grid layout:

#### Today's Bookings
- Shows all bookings for the current date
- Displays: Time range, court name, user name, and booking status
- Status badges are color-coded (confirmed, pending, cancelled, completed)
- Empty state if no bookings exist

#### Upcoming Bookings
- Shows bookings for the next 7 days
- Limited to 10 most recent bookings
- Displays: Date, time, court name, and user name
- Helps admins plan ahead and manage capacity

#### Courts Status
- Real-time status of all courts (free/occupied)
- Shows: Court name, type (indoor/outdoor), and current status
- Status is calculated based on current time vs booking times
- Future enhancement: Add "maintenance" status support

## Technical Details

### Data Sources

The page uses the following Zustand stores:

- **useUserStore:** For authentication and role validation
- **useClubStore:** For fetching clubs list
- **useCourtStore:** For fetching courts for the selected club
- **useBookingStore:** For fetching bookings for the selected club and date

### API Endpoints Used

- `GET /api/admin/clubs` - Fetches clubs (filtered by organization)
- `GET /api/admin/clubs/{clubId}/courts` - Fetches courts for a club (via store)
- `GET /api/clubs/{clubId}/operations/bookings?date={date}` - Fetches bookings for a date

### Component Structure

```
OperationsPage (Main Component)
├── PageHeader (Title and description)
├── Club Picker Section
│   └── Card
│       └── Select (Club dropdown)
├── Quick Actions Section (only shown when club is selected)
│   └── Card
│       └── Action Buttons Grid
└── Operational Data Grid (only shown when club is selected)
    ├── Today's Bookings Card
    │   └── Table
    ├── Upcoming Bookings Card
    │   └── Table
    └── Courts Status Card
        └── Table
```

### Styling

All styles use semantic `im-*` CSS classes following the project's conventions:

- Dark theme support via CSS variables
- Responsive grid layout
- Status badges with appropriate colors
- Empty states for missing data
- Loading skeletons during data fetching

**CSS File:** `src/app/(pages)/admin/operations/page.css`

## User Experience

### Loading States

- Shows skeleton loaders while data is being fetched
- Prevents layout shift during loading
- Individual skeletons for each data section

### Error Handling

- Displays error banner if booking fetch fails
- Gracefully handles missing clubs
- Shows appropriate empty states

### Responsive Design

- Single column layout on mobile
- Two-column grid on desktop (1024px+)
- Club picker always takes full width
- Tables scroll horizontally on mobile if needed

## Future Enhancements

Potential improvements for future iterations:

1. **Maintenance Status:** Add support for courts in maintenance mode
2. **Date Picker:** Allow viewing bookings for other dates (not just today)
3. **Filters:** Add ability to filter bookings by status, court, or user
4. **Real-time Updates:** Implement polling or WebSocket for live updates
5. **Export:** Add ability to export bookings data to CSV/Excel
6. **Statistics:** Add summary cards showing key metrics (total bookings, occupancy rate, etc.)
7. **Calendar View:** Embed a mini calendar view for quick navigation

## Integration Points

### Navigation

The page integrates with other admin pages through quick actions:

- **Bookings Page:** `/admin/bookings?clubId={clubId}`
- **Courts Management:** `/admin/clubs/{clubId}/courts`
- **Club Operations Calendar:** `/admin/clubs/{clubId}/operations`

### Shared Components

Uses existing UI components from `components/ui/`:

- PageHeader
- Card
- Select
- Button
- Table
- TableSkeleton

### Type Safety

Uses TypeScript types from the project:

- `OperationsBooking` - Booking with user and court details
- `Court` - Court information
- `ClubWithCounts` - Club with metadata
- `SelectOption` - Dropdown options format
- `TableColumn` - Table column definitions

## Testing

Testing strategy:

1. **Access Control:** Verify only Organization Admins can access
2. **Club Loading:** Ensure clubs load correctly and are filtered by organization
3. **Data Display:** Verify bookings and courts display correctly
4. **Empty States:** Test behavior with no clubs, courts, or bookings
5. **Quick Actions:** Verify navigation works correctly
6. **Responsive Design:** Test on various screen sizes

## Maintenance Notes

- Keep in sync with the existing club operations page at `/admin/clubs/{id}/operations`
- Update if booking or court data structures change
- Monitor API performance for large organizations with many clubs
- Consider pagination for organizations with 50+ clubs
