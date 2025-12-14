# Mock Booking Detail Endpoint

This document describes the mock implementation for the booking detail endpoint.

## Overview

The booking detail endpoint (`/api/admin/bookings/:id`) now supports mock mode when `USE_MOCK_DATA=true` is set in the environment. This allows development and testing without a database connection.

## Features

### Mock Data Includes

The mock booking detail endpoint returns complete booking information:

- **User Information**: name, email
- **Court Details**: name, type (e.g., "padel"), surface (e.g., "artificial_grass", "professional")
- **Club & Organization**: club name and ID, organization name and ID
- **Booking Details**: start time, end time, status, price, creation date
- **Coach Information**: coach ID and name (if applicable)
- **Payment Records**: list of all payments associated with the booking

### Booking Scenarios

The mock data includes various booking scenarios for testing:

1. **booking-1**: Paid booking with payment record
2. **booking-2**: Pending booking (no payment)
3. **booking-3**: Paid booking for outdoor court
4. **booking-4**: Paid booking at suburban club
5. **booking-5**: Cancelled booking
6. **booking-6**: Paid booking with coach
7. **booking-7**: Reserved booking (not yet paid)

### Supported Statuses

- `pending`: Booking created but not yet paid
- `paid`: Booking paid and confirmed
- `cancelled`: Booking cancelled by user or admin
- `reserved`: Booking temporarily held

## API Endpoints

### GET /api/admin/bookings/:id

Retrieves detailed information about a specific booking.

**Access Control**:
- Root admins: Can access all bookings
- Organization admins: Can access bookings in their managed organizations
- Club admins: Can access bookings in their managed clubs

**Response Format**:
```json
{
  "id": "booking-1",
  "userId": "user-4",
  "userName": "John Player",
  "userEmail": "player@example.com",
  "courtId": "court-1",
  "courtName": "Court 1",
  "courtType": "padel",
  "courtSurface": "artificial_grass",
  "clubId": "club-1",
  "clubName": "Downtown Padel Club",
  "organizationId": "org-1",
  "organizationName": "Padel Sports Inc",
  "start": "2024-01-15T10:00:00.000Z",
  "end": "2024-01-15T11:00:00.000Z",
  "status": "paid",
  "price": 5000,
  "coachId": null,
  "coachName": null,
  "paymentId": "payment-1",
  "createdAt": "2024-01-14T10:00:00.000Z",
  "payments": [
    {
      "id": "payment-1",
      "provider": "stripe",
      "status": "completed",
      "amount": 5000,
      "createdAt": "2024-01-14T10:00:00.000Z"
    }
  ]
}
```

### PATCH /api/admin/bookings/:id

Updates a booking (primarily for cancellation).

**Request Body**:
```json
{
  "status": "cancelled"
}
```

**Valid Status Values**:
- `pending`
- `paid`
- `cancelled`
- `reserved`

**Access Control**: Same as GET endpoint

## Usage Examples

### Testing Different Booking Scenarios

```typescript
// Test a paid booking
const response = await fetch('/api/admin/bookings/booking-1');
const booking = await response.json();
console.log(booking.status); // "paid"
console.log(booking.payments.length); // 1

// Test a booking with coach
const response = await fetch('/api/admin/bookings/booking-6');
const booking = await response.json();
console.log(booking.coachName); // "Coach David Martinez"

// Test a cancelled booking
const response = await fetch('/api/admin/bookings/booking-5');
const booking = await response.json();
console.log(booking.status); // "cancelled"

// Cancel a booking
const response = await fetch('/api/admin/bookings/booking-1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'cancelled' })
});
```

## Integration with UI Components

The mock data is fully compatible with existing booking UI components:

- **BookingDetailModal**: Displays all booking information including user, court, timing, status, price, and optional coach details
- **BookingsOverview**: Shows booking counts and statistics
- **TodayBookingsList**: Lists bookings for the current day

All components work seamlessly with mock data when mock mode is enabled.

## Testing

Comprehensive test coverage is provided in `src/__tests__/admin-booking-detail-api.test.ts`:

- 21 test cases covering all functionality
- Tests for all admin types (root, organization, club)
- Authorization and access control tests
- Different booking status scenarios
- Edge cases (non-existent bookings, invalid inputs)

Run tests with:
```bash
npm test -- admin-booking-detail-api.test.ts
```

## Implementation Details

### Files Modified

1. **src/services/mockDb.ts**: Added mock payments data and helper functions
2. **src/services/mockApiHandlers.ts**: Implemented `mockGetBookingById` and `mockUpdateBookingById`
3. **src/app/api/admin/bookings/[id]/route.ts**: Integrated mock mode checks in GET and PATCH handlers

### Mock Data Location

Mock bookings are defined in `src/services/mockDb.ts` in the `initializeMockData()` function. The data is initialized when the module loads and persists for the duration of the application.

### Extending Mock Data

To add more booking scenarios:

1. Add a new booking to the `mockBookings` array in `mockDb.ts`
2. If the booking is paid, add a corresponding payment to the `mockPayments` array
3. Ensure the payment's `bookingId` matches the booking's `id`
4. Ensure the payment's `amount` matches the booking's `price`

Example:
```typescript
// Add a new booking
{
  id: "booking-8",
  courtId: "court-5",
  userId: "user-5",
  coachId: "coach-1",
  start: new Date(futureDate),
  end: new Date(futureDate + 90 * 60 * 1000),
  price: 7500,
  status: "paid",
  paymentId: "payment-5",
  createdAt: new Date(),
}

// Add corresponding payment
{
  id: "payment-5",
  bookingId: "booking-8",
  provider: "paypal",
  status: "completed",
  amount: 7500,
  createdAt: new Date(),
}
```

## Notes

- Mock mode is enabled by setting `USE_MOCK_DATA=true` in environment variables
- Mock data is consistent across all endpoints (bookings list, booking detail, etc.)
- Access control is properly enforced even in mock mode
- All mock operations are in-memory and reset when the application restarts
