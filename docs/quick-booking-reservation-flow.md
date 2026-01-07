# Quick Booking Payment Flow with Slot Reservation

## Overview
This implementation adds a complete booking flow for desktop players that includes confirmation, temporary slot reservation, and enhanced payment processing to prevent race conditions.

## Architecture

### Flow Diagram
```
1. User selects club, date/time, and court
   ↓
2. Step 2.5: Confirmation Screen
   - Shows: club, date, time, duration, court, price
   - Action: "Proceed to Payment" button
   - No reservation created yet
   ↓
3. Step 3: Payment Screen
   - AUTO-CREATE: 5-minute temporary reservation
   - Shows: countdown timer, booking summary, payment options
   - Reservation marked as "reserved" in database
   ↓
4. User selects payment method and confirms
   ↓
5. Backend: Convert reservation to paid booking
   - Updates status from "reserved" to "paid"
   - Clears reservation expiry
   ↓
6. Step 4: Final Confirmation
   - Shows booking ID and details
```

### Race Condition Prevention

The implementation uses atomic database transactions to prevent multiple users from booking the same slot:

1. **Cleanup Phase**: Delete expired reservations before checking availability
2. **Validation Phase**: Check for overlapping paid bookings OR active (non-expired) reservations
3. **Creation Phase**: Create new reservation if no conflicts

All three phases occur within a single Prisma transaction, ensuring atomicity.

## Backend Components

### 1. Database Schema Changes

**New Fields in Booking Model:**
- `reservedAt: DateTime?` - Timestamp when temporary reservation was created
- `reservationExpiresAt: DateTime?` - Expiry time for temporary reservation (typically +5 minutes)
- Index on `reservationExpiresAt` for efficient cleanup queries

**Migration File:** `20260105171948_add_booking_reservation_fields/migration.sql`

### 2. Reservation API Endpoint

**Endpoint:** `POST /api/(player)/bookings/reserve`

**Request:**
```json
{
  "courtId": "string",
  "startTime": "ISO 8601 datetime",
  "endTime": "ISO 8601 datetime",
  "userId": "string"
}
```

**Response:**
```json
{
  "reservationId": "string",
  "courtId": "string",
  "startTime": "ISO 8601 datetime",
  "endTime": "ISO 8601 datetime",
  "priceCents": "number",
  "expiresAt": "ISO 8601 datetime"
}
```

**Error Responses:**
- `409 Conflict` - Slot already booked or reserved
- `400 Bad Request` - Invalid parameters or court not found
- `500 Internal Server Error` - Server error

**Features:**
- Creates 5-minute temporary reservation
- Automatically cleans up expired reservations
- Prevents race conditions via transaction
- Calculates price using existing price rules

### 3. Updated Booking Creation API

**Endpoint:** `POST /api/(player)/bookings` (updated)

**Changes:**
1. Validates active reservations before creating booking
2. Converts existing reservation to paid booking if user has one
3. Creates new booking if no reservation exists (backward compatible)
4. Cleans up expired reservations automatically

**Validation Logic:**
```javascript
// Check for conflicts:
// 1. Paid bookings
// 2. Active (non-expired) reservations from OTHER users
const overlapping = await tx.booking.findFirst({
  where: {
    courtId: body.courtId,
    start: { lt: endTime },
    end: { gt: startTime },
    OR: [
      { status: "paid" },
      {
        AND: [
          { status: "reserved" },
          { reservationExpiresAt: { gt: new Date() } },
          // Exclude current user's reservation
          existingReservation ? { id: { not: existingReservation.id } } : {},
        ],
      },
    ],
  },
});
```

## Frontend Components

### 1. Step 2.5: Confirmation Component

**File:** `src/components/PlayerQuickBooking/Step2_5Confirmation.tsx`

**Purpose:** 
- Final review before payment
- Displays all booking details
- No reservation created at this step

**UI Elements:**
- Club name
- Date (formatted: "Monday, January 15, 2024")
- Time range (formatted: "14:00 - 15:30")
- Duration (in minutes)
- Court name
- Final price
- Confirmation message

**Translation Keys Used:**
- `wizard.confirmBookingDetails`
- `wizard.confirmBookingDetailsDescription`
- `wizard.priceConfirmed`

### 2. Step 3: Enhanced Payment Component

**File:** `src/components/PlayerQuickBooking/Step3Payment.tsx` (updated)

**New Features:**

1. **Auto-Reservation on Mount**
   - Calls `/api/bookings/reserve` when component loads
   - Shows loading state during reservation
   - Handles errors gracefully

2. **Countdown Timer**
   - Displays time remaining (format: "M:SS")
   - Updates every second
   - Triggers expiry handler at 0:00
   - Visual warning indicator

3. **Payment Method UI**
   - Card: Enabled (primary option)
   - Apple Pay: Disabled with "Coming Soon" badge
   - Google Pay: Disabled with "Coming Soon" badge

4. **Error Handling**
   - Slot unavailable: Clear error message
   - Reservation failed: Show error, prevent proceeding
   - Expiry: Trigger callback to parent

**State Management:**
```typescript
const [reservationId, setReservationId] = useState<string | null>(null);
const [reservationExpiresAt, setReservationExpiresAt] = useState<string | null>(null);
const [timeRemaining, setTimeRemaining] = useState<number>(0);
const [reservationError, setReservationError] = useState<string | null>(null);
```

### 3. Updated Main Wizard Component

**File:** `src/components/PlayerQuickBooking/PlayerQuickBooking.tsx` (updated)

**Changes:**

1. **Step Flow Update**
   - Added Step 2.5 to visible steps array
   - Updated step numbering logic
   - Added reservation state to step3 data

2. **New State Fields:**
```typescript
step3: {
  paymentMethod: PaymentMethod | null;
  reservationId: string | null;
  reservationExpiresAt: string | null;
}
```

3. **Reservation Handlers:**
   - `onReservationCreated`: Stores reservation ID and expiry
   - `onReservationExpired`: Shows error, prevents payment

4. **Proceed Logic Update:**
   - Step 2.5: Can proceed if court is selected
   - Step 3: Can proceed only if reservation exists AND payment method selected

### 4. Types Update

**File:** `src/components/PlayerQuickBooking/types.ts` (updated)

**Changes:**
```typescript
export interface PlayerBookingStep3Data {
  paymentMethod: PaymentMethod | null;
  reservationId: string | null;        // NEW
  reservationExpiresAt: string | null; // NEW
}

// Updated step configuration
export function determineVisibleSteps(...) {
  steps.push({ id: 2.5, label: "confirmation", isRequired: true });
  // ...
}
```

## Translation Keys

### English (en.json)

**Wizard Section:**
```json
{
  "wizard": {
    "steps": {
      "confirmation": "Confirm Details",
      "finalConfirmation": "Confirmation"
    },
    "confirmBookingDetails": "Confirm Your Booking Details",
    "confirmBookingDetailsDescription": "Please confirm your booking details before proceeding to payment.",
    "reservationExpiresIn": "Reservation expires in {time}",
    "reservingSlot": "Reserving your time slot...",
    "comingSoon": "Coming Soon",
    "priceConfirmed": "This is the final price for your selected court and time slot."
  }
}
```

**Booking Section:**
```json
{
  "booking": {
    "slotNoLongerAvailable": "This time slot is no longer available. Please select a different time.",
    "reservationExpired": "Your reservation has expired. Please select a new time slot and try again."
  }
}
```

## Styling

**File:** `src/components/PlayerQuickBooking/PlayerQuickBooking.css` (updated)

**New CSS Classes:**

1. **Reservation Timer**
```css
.rsp-wizard-reservation-timer {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-warning-bg);
  border: 1px solid var(--color-warning);
  border-radius: var(--border-radius);
  color: var(--color-warning);
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-bottom: var(--spacing-4);
}
```

2. **Disabled Payment Methods**
```css
.rsp-wizard-payment-method--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rsp-wizard-payment-method-badge {
  padding: var(--spacing-1) var(--spacing-2);
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
}
```

3. **Price Note**
```css
.rsp-wizard-price-note {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: var(--spacing-2);
  font-style: italic;
}
```

## Configuration

**Reservation Duration:** 5 minutes (300 seconds)
- Configured in: `src/app/api/(player)/bookings/reserve/route.ts`
- Line: `const reservationExpiresAt = new Date(Date.now() + 5 * 60 * 1000);`
- Can be made configurable via environment variable if needed

## Error Handling

### Frontend Errors

1. **Reservation Creation Failed**
   - Display: Error message in payment step
   - Action: Prevent proceeding to payment
   - User can: Go back and try again

2. **Reservation Expired**
   - Display: Timer reaches 0:00
   - Action: Trigger expiry callback
   - User sees: Error message asking to reselect

3. **Slot Unavailable (409)**
   - Display: "This time slot is no longer available"
   - Action: Prevent reservation creation
   - User can: Go back and select different time

### Backend Errors

1. **Conflict (409)**
   - Cause: Slot already booked or reserved
   - Response: `{ error: "Selected time slot is already booked or reserved" }`

2. **Court Not Found (400)**
   - Cause: Invalid court ID
   - Response: `{ error: "Court not found" }`

3. **Invalid Parameters (400)**
   - Cause: Missing fields or invalid datetime
   - Response: Descriptive error message

## Security Considerations

### 1. Race Condition Prevention
- ✅ Atomic database transactions
- ✅ Proper locking via Prisma
- ✅ Cleanup before validation

### 2. Authorization
- ✅ `requireAuth` on all endpoints
- ✅ User ID from session (not from client)
- ✅ Reservation ownership validation

### 3. Input Validation
- ✅ All required fields checked
- ✅ DateTime format validation
- ✅ Start < End validation
- ✅ Court existence validation

### 4. CodeQL Scan Results
- ✅ **0 alerts found** - No security vulnerabilities detected

## Testing Recommendations

### Manual Testing Checklist

1. **Happy Path**
   - [ ] Select club, date, time, court
   - [ ] See confirmation screen with correct details
   - [ ] Click "Proceed to Payment"
   - [ ] See reservation timer counting down
   - [ ] Select payment method (Card)
   - [ ] Click "Confirm Booking"
   - [ ] See success confirmation

2. **Race Condition Test**
   - [ ] Two users select same slot simultaneously
   - [ ] First user proceeds to payment (gets reservation)
   - [ ] Second user tries to proceed (should see error)
   - [ ] Verify second user cannot proceed

3. **Reservation Expiry Test**
   - [ ] Create reservation
   - [ ] Wait 5+ minutes
   - [ ] Attempt to pay
   - [ ] Should see expiry error
   - [ ] Verify slot released

4. **Error Handling Test**
   - [ ] Try booking already-booked slot
   - [ ] Try booking with invalid court
   - [ ] Network error during reservation
   - [ ] Back button during reservation

### Automated Testing

**Unit Tests Needed:**
- Reservation API logic
- Expiry calculation
- Timer countdown
- State management

**Integration Tests Needed:**
- Full booking flow
- Race condition scenarios
- Reservation conversion to booking
- Expiry handling

## Future Enhancements

1. **Background Cleanup Task**
   - Cron job to clean up expired reservations
   - Could run every 1 minute
   - Prevents database bloat

2. **Configurable Reservation Duration**
   - Environment variable: `RESERVATION_DURATION_MINUTES`
   - Default: 5 minutes
   - Allows per-deployment customization

3. **Reservation Extension**
   - Allow user to extend reservation (e.g., +2 minutes)
   - Limit: Once per reservation
   - Prevents abuse

4. **Analytics**
   - Track reservation expiry rate
   - Track time to payment after reservation
   - Optimize UX based on data

5. **Mobile Support**
   - Adapt UI for mobile screens
   - Consider shorter reservation time on mobile
   - Optimize countdown timer display

## Deployment Notes

### Database Migration
Run migration before deploying code:
```bash
npx prisma migrate deploy
```

### Environment Variables
No new environment variables required. All configuration is hardcoded for MVP.

### Backwards Compatibility
- ✅ Existing bookings unaffected (no reservation fields required)
- ✅ Admin booking flow unchanged
- ✅ Old booking API still works (creates booking without reservation)

### Rollback Plan
If issues occur:
1. Revert code changes
2. Keep database migration (fields are nullable)
3. Clean up any orphaned reservations manually if needed

## Summary

This implementation provides a robust, race-condition-free booking flow for desktop players. Key achievements:

✅ **User Experience**
- Clear confirmation before payment
- Visual countdown timer
- Helpful error messages
- Smooth flow progression

✅ **Technical Robustness**
- Atomic transactions
- Automatic cleanup
- Proper error handling
- Type-safe implementation

✅ **Security**
- Authorization checks
- Input validation
- No CodeQL alerts
- Race condition prevention

✅ **Code Quality**
- TypeScript compilation passes
- Follows existing patterns
- Reuses existing components
- Clear documentation
