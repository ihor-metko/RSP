# PlayerQuickBooking Implementation Summary

## Overview
Implemented a universal PlayerQuickBooking mechanism for the platform, fully adapted to player users with support for preselected data and conditional step rendering.

## Components Created

### 1. Core Component
- **PlayerQuickBooking.tsx**: Main wizard component with dynamic step rendering
- **PlayerQuickBooking.css**: Styling for the component (reuses existing wizard styles)
- **types.ts**: TypeScript types and utility functions

### 2. Step Components
- **Step0SelectClub.tsx**: Club selection step (conditional - skipped if club preselected)
- **Step1DateTime.tsx**: Date & Time selection step (conditional - skipped if dateTime preselected)
- **Step2Courts.tsx**: Court selection step (conditional - skipped if court preselected)
- **Step3Payment.tsx**: Payment method selection step (always required)
- **Step4Confirmation.tsx**: Booking confirmation step (always shown after payment)

## Key Features

### Multi-Step Flow with Conditional Rendering
The wizard dynamically determines visible steps based on preselected data:
```typescript
// Example: When club is preselected, wizard starts at Step 1 (DateTime)
<PlayerQuickBooking 
  preselectedClubId="club-123"
  isOpen={true}
  onClose={handleClose}
/>

// Example: When all data is preselected, wizard goes straight to Payment
<PlayerQuickBooking 
  preselectedClubId="club-123"
  preselectedCourtId="court-456"
  preselectedDateTime={{ date: "2024-12-25", startTime: "10:00", duration: 60 }}
  isOpen={true}
  onClose={handleClose}
/>
```

### Preselection Support
The component accepts three optional preselection props:
1. **preselectedClubId**: Skips club selection step
2. **preselectedCourtId**: Skips court selection step
3. **preselectedDateTime**: Skips date/time selection step

### Step Visibility Logic
```typescript
function determineVisibleSteps(
  preselectedClubId?: string,
  preselectedCourtId?: string,
  preselectedDateTime?: { date: string; startTime: string; duration: number }
): BookingStepConfig[]
```

Steps are automatically filtered based on what data is already provided.

### Payment Processing
- Step 3 displays booking summary and payment method selection
- Supports Card, Apple Pay, and Google Pay (UI only - backend integration needed)
- Creates booking with "reserved" status via existing `/api/bookings` endpoint

### Confirmation Step
- Step 4 shows successful booking confirmation
- Displays booking reference ID
- Shows complete booking details summary
- Provides close button to dismiss modal

## Integration

### Club Detail Page
Updated `/src/app/(pages)/(player)/clubs/[id]/page.tsx`:
```typescript
// Before
<QuickBookingWizard
  clubId={club.id}
  isOpen={isQuickBookingOpen}
  onClose={handleQuickBookingClose}
  onBookingComplete={handleQuickBookingComplete}
/>

// After
<PlayerQuickBooking
  preselectedClubId={club.id}
  isOpen={isQuickBookingOpen}
  onClose={handleQuickBookingClose}
  onBookingComplete={handleQuickBookingComplete}
/>
```

## Translation Keys Added

### English (locales/en.json)
```json
{
  "wizard": {
    "steps": {
      "selectClub": "Select Club",
      "confirmation": "Confirmation"
    },
    "step0Title": "Select a club",
    "selectClubDescription": "Choose a club where you'd like to play",
    "loadingClubs": "Loading clubs...",
    "noClubsAvailable": "No clubs available at the moment",
    "club": "Club",
    "totalPaid": "Total Paid",
    "bookingReference": "Booking Reference",
    "bookingDetails": "Booking Details",
    "closeAndViewBookings": "Close"
  },
  "booking": {
    "playerQuickBooking": {
      "title": "Quick Booking"
    }
  }
}
```

## API Endpoints Used

### 1. Fetch Clubs
- **GET /api/clubs**: Fetches list of all clubs for Step 0

### 2. Fetch Club Details
- **GET /api/clubs/:clubId**: Fetches specific club data when preselected

### 3. Fetch Available Courts
- **GET /api/clubs/:clubId/available-courts**: Fetches courts available for selected date/time

### 4. Fetch Court Details
- **GET /api/courts/:courtId**: Fetches specific court data when preselected

### 5. Fetch Court Pricing
- **GET /api/courts/:courtId/price-timeline**: Fetches pricing rules for accurate cost calculation

### 6. Create Booking
- **POST /api/bookings**: Creates booking with status "reserved"

## Usage Patterns

### Pattern 1: Full Wizard (Home Page)
```typescript
<PlayerQuickBooking 
  isOpen={isOpen}
  onClose={handleClose}
  onBookingComplete={handleComplete}
/>
```
User goes through all steps: Club → DateTime → Court → Payment → Confirmation

### Pattern 2: From Club Page
```typescript
<PlayerQuickBooking 
  preselectedClubId="club-123"
  isOpen={isOpen}
  onClose={handleClose}
  onBookingComplete={handleComplete}
/>
```
User goes through: DateTime → Court → Payment → Confirmation

### Pattern 3: From Court Schedule
```typescript
<PlayerQuickBooking 
  preselectedClubId="club-123"
  preselectedCourtId="court-456"
  preselectedDateTime={{ date: "2024-12-25", startTime: "10:00", duration: 60 }}
  isOpen={isOpen}
  onClose={handleClose}
  onBookingComplete={handleComplete}
/>
```
User goes through: Payment → Confirmation

## Validation and Error Handling

### Availability Checks
- Fetches available courts based on selected date/time
- Shows loading states while fetching data
- Displays error messages when API calls fail

### Conflict Resolution
- Backend returns 409 status for already-booked slots
- UI displays user-friendly error message
- Allows user to select different time/court

### Form Validation
- Prevents proceeding to next step without required selections
- Disables "Continue" button until step is complete
- Shows estimated price dynamically as selections change

## Future Enhancements

### Payment Integration
Current implementation creates bookings with "reserved" status. Future work needed:
1. Integrate with payment provider (Stripe, PayPal, etc.)
2. Process actual payment in Step 3
3. Update booking status to "paid" after successful payment
4. Handle payment failures and retries

### Multiple Players Per Booking
Extend to support inviting other players:
1. Add player invitation step
2. Split payment among players
3. Send notifications to invited players

### Cancel/Reschedule
Add booking management features:
1. Cancel booking option
2. Reschedule booking to different time
3. Refund processing

## Testing

### Test File
- **player-quick-booking.test.tsx**: Basic tests for component rendering and step navigation

### Test Coverage
- ✅ Renders wizard when open
- ✅ Hides when closed
- ✅ Shows club selection for full wizard
- ✅ Skips club selection when preselected
- ✅ Shows date/time selection
- ✅ Navigates through steps
- ✅ Shows step indicators for visible steps only
- ✅ Handles preselection scenarios

## Files Modified/Created

### New Files
1. src/components/PlayerQuickBooking/PlayerQuickBooking.tsx
2. src/components/PlayerQuickBooking/PlayerQuickBooking.css
3. src/components/PlayerQuickBooking/types.ts
4. src/components/PlayerQuickBooking/Step0SelectClub.tsx
5. src/components/PlayerQuickBooking/Step1DateTime.tsx
6. src/components/PlayerQuickBooking/Step2Courts.tsx
7. src/components/PlayerQuickBooking/Step3Payment.tsx
8. src/components/PlayerQuickBooking/Step4Confirmation.tsx
9. src/components/PlayerQuickBooking/index.ts
10. src/__tests__/player-quick-booking.test.tsx

### Modified Files
1. locales/en.json - Added translation keys
2. src/app/(pages)/(player)/clubs/[id]/page.tsx - Integrated PlayerQuickBooking

## Build Status
✅ Build passes successfully
✅ No linting errors
✅ TypeScript compilation successful

## Reusability and Maintainability

### Modular Design
- Each step is a separate component
- Shared types and utilities in types.ts
- Consistent styling using existing im-* classes
- Reuses existing UI components (Modal, Select)

### Extensibility
- Easy to add new steps (e.g., player invitations)
- Can extend payment methods
- Can add more validation logic
- Can enhance with additional API calls

### Consistency
- Follows existing patterns from QuickBookingWizard
- Uses established dark theme classes
- Maintains accessibility (ARIA labels, roles)
- Type-safe with TypeScript
