# Quick Booking Flow - Skip Pre-Filled Steps

## Overview
Updated the Admin Quick Booking Wizard to automatically skip steps when data is pre-filled, improving the user experience by navigating directly to the first step that requires user input.

## Changes Made

### 1. New Helper Functions in `types.ts`

#### `isStepPreFilled(stepId, predefinedData): boolean`
Checks if a specific step has pre-filled data based on the `predefinedData` prop:
- Step 1 (Organization): Checks for `organizationId`
- Step 2 (Club): Checks for `clubId`  
- Step 3 (DateTime): Checks for `date`, `startTime`, and `duration`
- Step 4 (Court): Checks for `courtId`
- Step 5 (User): Checks for `userId`
- Step 6 (Confirmation): Never pre-filled (always shown)

#### `getFirstUnfilledStepId(adminType, predefinedData): number`
Determines the first step that needs user input:
- Iterates through visible steps
- Finds the first step without pre-filled data
- Falls back to confirmation step if all steps are pre-filled

### 2. Updated AdminQuickBookingWizard Component

Changed the initial step calculation from:
```typescript
const firstStepId = getFirstVisibleStepId(adminType, predefinedData);
```

To:
```typescript
const firstStepId = getFirstUnfilledStepId(adminType, predefinedData);
```

This change is applied in two places:
1. Initial state calculation in `useState`
2. State reset when modal closes in `useEffect`

## How It Works

### Scenario 1: Club Admin Creating Booking from Operations Page
**Pre-filled Data:**
- `organizationId`: Auto-filled from club's organization
- `clubId`: Auto-filled from current club
- `courtId`: Selected court from calendar
- `date`: Selected date from calendar  
- `startTime`: Selected time slot from calendar
- `duration`: Default duration (60 minutes)

**Result:** Wizard opens directly to Step 5 (User Selection), skipping organization, club, datetime, and court steps.

### Scenario 2: Organization Admin from Bookings Page  
**Pre-filled Data:**
- `organizationId`: Auto-filled from managed organization

**Result:** Wizard opens directly to Step 2 (Club Selection), skipping organization step.

### Scenario 3: Root Admin with No Pre-filled Data
**Pre-filled Data:** None

**Result:** Wizard opens at Step 1 (Organization Selection), normal flow maintained.

## Benefits

1. **Improved UX**: Users don't have to click through steps with pre-selected data
2. **Faster Booking**: Reduces number of clicks required to complete a booking
3. **Context-Aware**: Leverages context (current page, selected items) to pre-fill data
4. **Consistent**: Works uniformly across all entry points

## Entry Points Using Pre-filled Data

1. **Operations Page (Club Specific)**: 
   - Calendar slot click → Pre-fills org, club, court, date, time
   - "New Booking" button → Pre-fills org, club only

2. **Admin Bookings Page**:
   - Root Admin: No pre-fill
   - Org Admin: Pre-fills organization
   - Club Admin: Pre-fills organization and club

## Testing

### Manual Testing Checklist
- [ ] Root admin: Wizard starts at organization selection (no pre-fill)
- [ ] Org admin: Wizard starts at club selection (org pre-filled)
- [ ] Club admin with single club: Wizard starts at date/time (org & club pre-filled)
- [ ] Operations page slot click: Wizard starts at user selection (all except user pre-filled)
- [ ] Back button navigation works correctly
- [ ] Step indicator shows correct progress
- [ ] Pre-filled data is correctly used during booking submission

### Automated Tests
Note: The existing test suite may need updates to accommodate the new behavior. The test mocks may need to handle the new helper functions and starting step logic.

## Future Enhancements

1. **Auto-load Pre-filled Entity Data**: Currently, the IDs are stored but the full entity details may need to be fetched when the wizard opens. This could be added in a future iteration.

2. **Visual Indication**: Consider adding a visual indicator in the step progress bar to show which steps were auto-filled.

3. **Edit Pre-filled Data**: Add ability to "go back" to pre-filled steps if user wants to change them (currently they're skipped entirely).

## Code Locations

- **Types**: `/src/components/AdminQuickBookingWizard/types.ts`
- **Component**: `/src/components/AdminQuickBookingWizard/AdminQuickBookingWizard.tsx`
- **Usage Examples**:
  - `/src/app/(pages)/admin/bookings/page.tsx`
  - `/src/app/(pages)/admin/operations/[clubId]/page.tsx`
