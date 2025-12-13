# Booking Status System

## Overview

The booking status system implements both **dynamic** (calculated on-the-fly) and **persistent** (stored in database) booking statuses to accurately reflect the real-time state of bookings.

## Status Types

### Dynamic Statuses (Calculated)

These statuses are calculated based on the current time and booking time slots:

- **Reserved**: `now < startAt` - Booking exists but hasn't started yet
- **Ongoing**: `startAt <= now < endAt` - Booking is currently in progress
- **Completed**: `now >= endAt` - Booking has finished

### Persistent Statuses (Stored in Database)

These statuses are stored in the database and persist across time:

- **Pending**: Payment is pending
- **Paid**: Payment has been completed
- **Cancelled**: Booking was cancelled by user or admin
- **No-show**: User didn't attend the booking after it ended
- **Completed**: Booking finished successfully (optional for historical reporting)

## Status Calculation Logic

The system uses the `calculateBookingStatus()` function from `@/utils/bookingStatus` to determine the display status:

1. **Terminal statuses** (cancelled, no-show, completed) are preserved from the database
2. **Non-terminal statuses** (pending, paid, reserved) are dynamically calculated based on time:
   - Before start time → Reserved
   - During booking time → Ongoing
   - After end time → Completed

## Implementation

### Utility Functions

Located in `src/utils/bookingStatus.ts`:

- `calculateBookingStatus()` - Main function to calculate display status
- `getDynamicStatus()` - Get dynamic status without considering persistent statuses
- `shouldMarkAsCompleted()` - Check if a booking should be marked as completed
- `getStatusLabel()` - Get human-readable status label
- `getStatusColorClass()` - Get CSS class for status styling

### API Integration

All booking API endpoints calculate dynamic status before returning data:

- `/api/admin/bookings` - Admin bookings list
- `/api/admin/users/[userId]/bookings` - User bookings by admin
- `/api/clubs/[clubId]/operations/bookings` - Club operations bookings
- `/api/home` - Player home page bookings

### Cron Job

A scheduled task endpoint is available at `/api/cron/update-booking-statuses`:

- **POST**: Updates bookings that have ended to "completed" status
- **GET**: Check health and count pending updates
- **Security**: Protected by `CRON_SECRET` environment variable

#### Setting up the Cron Job

**Vercel Cron:**

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-booking-statuses",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Manual/External Cron:**

```bash
curl -X POST https://your-domain.com/api/cron/update-booking-statuses \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Set the `CRON_SECRET` environment variable for security.

## UI Components

### Status Badges

The `TodayBookingsList` component displays status badges with proper styling:

- Uses `getStatusLabel()` for human-readable text
- CSS classes for each status: `im-booking-status--{status}`
- Supports both light and dark themes

### Status Colors

- **Reserved**: Blue (info)
- **Ongoing**: Green (active)
- **Completed**: Gray (neutral)
- **Cancelled**: Red (danger)
- **No-show**: Red (danger)
- **Pending**: Yellow (warning)
- **Paid**: Green (success)

## Testing

Tests are located in `src/__tests__/booking-status.test.ts`:

```bash
npm test -- src/__tests__/booking-status.test.ts
```

## Best Practices

1. **Always use `calculateBookingStatus()`** when displaying booking status in the UI
2. **Never modify the database status** unless changing to a terminal state (cancelled, no-show, completed)
3. **Use the cron job** to periodically update completed bookings for historical accuracy
4. **Preserve terminal statuses** - once set, they should not be changed by time-based logic

## Future Enhancements

- **No-show detection**: Automatically mark bookings as no-show if user doesn't check in
- **Status history**: Track status changes over time for audit purposes
- **Notification system**: Send notifications when booking status changes
- **Custom status labels**: Allow clubs to define custom status labels
