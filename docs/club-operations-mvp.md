# Club Operations MVP - Documentation

## Overview

The Club Operations page provides a comprehensive interface for club administrators to manage bookings through a day-view calendar and booking list interface.

## Features

### 1. Day View Calendar
- **Time Grid**: Configurable time range (default: 08:00 - 23:00) with 30-minute intervals
- **Court Columns**: One column per court showing availability
- **Booking Blocks**: Visual representation of bookings with status-based color coding:
  - **Pending** (Yellow): Awaiting payment
  - **Paid** (Green): Payment confirmed
  - **Reserved** (Blue): Admin-created booking
  - **Cancelled** (Gray): Cancelled booking
- **Click to Create**: Click any empty time slot to create a new booking
- **Click to View**: Click any booking block to view details and manage

### 2. Today's Bookings List
- Side panel showing all bookings for the selected day
- Sortable by time
- Quick actions: View, Cancel
- Real-time updates via short-polling (15s interval)

### 3. Quick Create Modal
- Pre-filled with selected court and time
- User email lookup
- Duration selector (30, 60, 90, 120 minutes)
- Validation and conflict detection

### 4. Booking Detail Modal
- Full booking information
- User details
- Court and time information
- Status and price
- Cancel action (for non-cancelled bookings)

## Access Control

### Who Can Access?
1. **Root Admins**: Full access to all clubs
2. **Organization Admins**: Access to clubs in their managed organizations
3. **Club Admins**: Access only to their assigned club

### Route Protection
The operations page is protected at multiple levels:
- Client-side route guard (redirects unauthorized users)
- Server-side API authorization (all endpoints require appropriate role)
- Context-aware permissions (club/organization specific)

## API Endpoints

### GET `/api/clubs/[clubId]/operations/bookings`
Fetch all bookings for a specific club on a given date.

**Query Parameters:**
- `date` (required): ISO date string (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": "booking-id",
    "userId": "user-id",
    "userName": "John Doe",
    "userEmail": "john@example.com",
    "courtId": "court-id",
    "courtName": "Court 1",
    "start": "2024-01-15T10:00:00.000Z",
    "end": "2024-01-15T11:00:00.000Z",
    "status": "reserved",
    "price": 5000,
    "sportType": "PADEL",
    "coachId": null,
    "coachName": null,
    "createdAt": "2024-01-14T10:00:00.000Z"
  }
]
```

### POST `/api/admin/bookings/create`
Create a new booking (reused from existing admin booking system).

**Request Body:**
```json
{
  "userId": "user-id",
  "courtId": "court-id",
  "startTime": "2024-01-15T14:00:00.000Z",
  "endTime": "2024-01-15T15:00:00.000Z",
  "clubId": "club-id"
}
```

**Response:** `201 Created` with booking details
**Error:** `409 Conflict` if time slot is occupied

### PATCH `/api/admin/bookings/[id]`
Update booking status (cancel functionality).

**Request Body:**
```json
{
  "status": "cancelled"
}
```

**Response:** `200 OK`
**Error:** `403 Forbidden` if unauthorized

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Environment variables configured

### Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Seed test data (optional):**
   ```bash
   npm run seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Navigate to operations page:**
   ```
   http://localhost:3000/admin/clubs/[clubId]/operations
   ```

### Test Accounts

For local testing, you'll need accounts with appropriate roles:

**Root Admin:**
- Create via: `npm run create-root-admin`
- Email: admin@example.com
- Access: All clubs

**Organization Admin:**
- Create via database seeding or admin panel
- Access: Clubs within their organization

**Club Admin:**
- Create via organization admin or database seeding
- Access: Single assigned club

### Testing Workflow

1. **Login** with appropriate admin account
2. **Navigate** to club operations page
3. **Select a date** using the date picker
4. **View calendar** - bookings should load automatically
5. **Create booking**:
   - Click an empty time slot
   - Enter user email (must exist in database)
   - Select duration
   - Submit
6. **View booking**:
   - Click on a booking block
   - View details
7. **Cancel booking**:
   - Open booking detail modal
   - Click "Cancel Booking"
   - Confirm cancellation

## Architecture

### State Management (Zustand)
- **useBookingStore**: Manages booking data, fetching, and mutations
- **useClubStore**: Provides club information
- **useCourtStore**: Provides court list for the club
- **useUserStore**: User authentication and role management

### Short-Polling
- Automatic refresh every 15 seconds
- Prevents duplicate requests with inflight guards
- Stops when component unmounts

### Components
```
src/components/club-operations/
├── DayCalendar.tsx        # Main calendar grid
├── BookingBlock.tsx       # Individual booking visual
├── TodayBookingsList.tsx  # Side panel list
├── QuickCreateModal.tsx   # Create booking form
├── BookingDetailModal.tsx # Booking details & actions
└── index.ts               # Exports
```

## Future Enhancements (Phase A)

### Planned Features
1. **Drag & Drop**: Move bookings between time slots
2. **Bulk Operations**: Multi-select and batch actions
3. **Payment Management**: Mark as paid, refund functionality
4. **Recurring Bookings**: Create series of bookings
5. **Conflict Resolution**: Advanced handling of overlapping bookings
6. **Export**: Download booking data as CSV/PDF

## Troubleshooting

### Bookings Not Loading
- Check browser console for API errors
- Verify user has correct role/permissions
- Check clubId is valid
- Ensure courts exist for the club

### Create Booking Fails
- Verify user email exists in database
- Check for time slot conflicts
- Ensure court is active
- Check club has correct configuration

### Polling Issues
- Polling automatically stops on errors
- Check network tab for failed requests
- Verify API endpoint is accessible
- Check for rate limiting

## Testing

### Backend Tests
```bash
# Run API tests
npm test -- club-operations-bookings-api.test.ts
```

**Coverage:**
- Authorization (club admin, org admin, root admin)
- Date validation
- Booking fetching and filtering
- Error handling

### Store Tests
```bash
# Run store tests
npm test -- booking-store.test.ts
```

**Coverage:**
- Fetch operations
- Create and cancel bookings
- Polling mechanism
- Selector functions
- Error handling

### Manual QA Checklist
- [ ] Login as club admin
- [ ] Navigate to operations page
- [ ] Calendar renders with correct date
- [ ] Bookings display correctly
- [ ] Click empty slot opens quick create modal
- [ ] Create booking successfully
- [ ] New booking appears on calendar
- [ ] Click booking opens detail modal
- [ ] Cancel booking successfully
- [ ] Cancelled booking updates on calendar
- [ ] Change date and bookings refresh
- [ ] Today button works
- [ ] Polling updates data automatically
- [ ] Access control: unauthorized users redirected
- [ ] Dark mode works correctly
- [ ] Responsive on mobile/tablet

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Bookings fetched only when needed
2. **Inflight Guards**: Prevents duplicate concurrent requests
3. **Smart Caching**: 5-second cache for recent data
4. **Polling Control**: Stops when component unmounts
5. **Skeleton Loaders**: Immediate visual feedback

### Scaling Recommendations
- Implement pagination for clubs with >100 bookings/day
- Add backend caching (Redis) for high-traffic clubs
- Consider virtual scrolling for large time ranges

## Support

For issues or questions:
1. Check this documentation
2. Review existing tests for examples
3. Check browser console for errors
4. Review API logs for server-side issues

## License

Internal project - ArenaOne Platform
