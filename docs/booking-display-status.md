# Booking Status Display Functions

## Overview

This document describes the new booking status display functions that provide user-friendly status messages for both players and admins based on the combination of booking and payment statuses.

## Status Renaming

The booking statuses have been renamed to better reflect their meaning:

- `Active` → `UPCOMING` - Booking is confirmed and scheduled for the future
- `Pending` → `Confirmed` - Booking is confirmed and awaiting payment
- `Cancelled` - Remains the same
- `Completed` - Remains the same
- `No-show` - Remains the same

## Display Functions

### getPlayerBookingDisplayStatus(bookingStatus, paymentStatus)

Returns a user-friendly status message for players based on the combination of booking and payment statuses.

**Location:** `src/utils/bookingDisplayStatus.ts`

**Example Usage:**
```typescript
import { getPlayerBookingDisplayStatus } from '@/utils/bookingDisplayStatus';

const playerStatus = getPlayerBookingDisplayStatus("Confirmed", "Unpaid");
// Returns: "Confirmed, awaiting payment"
```

**Status Combinations:**

| Booking Status | Payment Status | Player Display |
|---------------|---------------|----------------|
| Confirmed | Unpaid | "Confirmed, awaiting payment" |
| Confirmed | Paid | "Confirmed" |
| UPCOMING | Paid | "Booked" |
| UPCOMING | Unpaid | "Reserved, payment pending" |
| Cancelled | Paid | "Cancelled" |
| Cancelled | Unpaid | "Cancelled" |
| Cancelled | Refunded | "Cancelled (Refunded)" |
| Completed | Paid | "Completed" |
| Completed | Unpaid | "Missed / Not paid" |
| No-show | Any | "No-show" |

### getAdminBookingDisplayStatus(bookingStatus, paymentStatus)

Returns a clear status message for admins based on the combination of booking and payment statuses.

**Location:** `src/utils/bookingDisplayStatus.ts`

**Example Usage:**
```typescript
import { getAdminBookingDisplayStatus } from '@/utils/bookingDisplayStatus';

const adminStatus = getAdminBookingDisplayStatus("Confirmed", "Unpaid");
// Returns: "Reserved, pending payment"
```

**Status Combinations:**

| Booking Status | Payment Status | Admin Display |
|---------------|---------------|---------------|
| Confirmed | Unpaid | "Reserved, pending payment" |
| Confirmed | Paid | "Reserved (paid)" |
| UPCOMING | Paid | "Paid" |
| UPCOMING | Unpaid | "Reserved, pending payment" |
| Cancelled | Paid | "Cancelled" |
| Cancelled | Unpaid | "Cancelled" |
| Cancelled | Refunded | "Cancelled (Refunded)" |
| Completed | Paid | "Completed" |
| Completed | Unpaid | "Missed / Not paid" |
| No-show | Any | "No-show" |

## Migration

### Database Changes

A migration has been created to update existing booking status values:

**Migration:** `20260106134735_update_booking_status_names`

This migration:
1. Updates all `Active` values to `UPCOMING`
2. Updates all `Pending` values to `Confirmed`
3. Updates the default value for new bookings from `Pending` to `Confirmed`

### Backward Compatibility

The code maintains backward compatibility through:

1. **Legacy status mapping** in `toNewBookingStatus()` function:
   - "Active" → "UPCOMING"
   - "Pending" → "Confirmed"

2. **Translation keys** support both old and new status names

3. **CSS classes** support both old and new status names

## Usage in Components

### Basic Usage

```typescript
import { BookingStatusBadge } from '@/components/ui';
import { getPlayerBookingDisplayStatus } from '@/utils/bookingDisplayStatus';

// Option 1: Use badge components directly
<BookingStatusBadge status={booking.bookingStatus} />
<PaymentStatusBadge status={booking.paymentStatus} />

// Option 2: Use display functions for text-only display
const displayStatus = getPlayerBookingDisplayStatus(
  booking.bookingStatus,
  booking.paymentStatus
);
```

### Player-Facing Components

Use `getPlayerBookingDisplayStatus()` for:
- Player booking list
- Booking confirmation pages
- Email notifications to players
- Player profile booking history

### Admin-Facing Components

Use `getAdminBookingDisplayStatus()` for:
- Admin booking management
- Operations dashboard
- Admin booking list
- Financial reports

## Testing

Tests are located in:
- `src/__tests__/booking-display-status.test.ts` - Display function tests
- `src/__tests__/booking-status.test.ts` - Status utility tests
- `src/__tests__/status-badges.test.tsx` - Badge component tests

Run tests:
```bash
npm test -- src/__tests__/booking-display-status.test.ts
```

## Translations

Translation keys for new status names:
- `adminBookings.bookingStatusUpcoming` - "Upcoming" / "Майбутнє"
- `adminBookings.bookingStatusConfirmed` - "Confirmed" / "Підтверджено"

Legacy translation keys still supported for backward compatibility.

## Future Enhancements

Potential improvements:
1. Add internationalization for display status messages
2. Allow customization of status messages per club
3. Add status transition history tracking
4. Create visual timeline for booking status changes
5. Add email templates using display status functions
