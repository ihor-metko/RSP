# Quick Booking Stepper Initialization Fix

## Overview
This document describes the fix applied to correct the Quick Booking stepper initialization so that it always starts with the "Date & Time" step for Club Admin and Organization Admin contexts, with organization and club automatically preselected.

## Problem Statement
The Quick Booking wizard was opening with incorrect first steps:
- For some admin types, the wizard was showing "Select Organization" or "Select Club" as the first step
- Organization and club should be automatically determined from the admin's context
- The workflow should start with "Date & Time" selection for Club Admin and Organization Admin

## Root Cause
The admin bookings page (`/admin/bookings/page.tsx`) was opening the `AdminQuickBookingWizard` without passing any `predefinedData`, which caused the wizard to show all applicable steps based on the admin type:
- Root Admin would see "Select Organization" first
- Organization Admin would see "Select Club" first
- Club Admin would correctly see "Date & Time" first (due to step visibility logic)

## Solution

### Automatic Context Detection
The fix adds logic to automatically determine and pass `predefinedData` when opening the Quick Booking wizard, based on the admin's role and managed entities:

#### For Club Admin
- **Behavior**: Automatically preselects the club and its organization
- **Implementation**: 
  - Uses the first club from `adminStatus.managedIds`
  - Fetches club details to get the `organizationId`
  - Passes both as `predefinedData`
- **Result**: First step is "Date & Time" ✓

#### For Organization Admin (Super Admin)
- **Behavior**: Automatically preselects the organization, and club if they manage only one
- **Implementation**:
  - Uses the first organization from `adminStatus.managedIds`
  - Fetches all clubs in that organization
  - If only one club exists, preselects it too
- **Result**: 
  - With one club: First step is "Date & Time" ✓
  - With multiple clubs: First step is "Select Club"

#### For Root Admin
- **Behavior**: No change - shows all steps
- **Result**: First step is "Select Organization" (existing behavior)

## Technical Implementation

### Files Modified
1. **`/src/app/(pages)/admin/bookings/page.tsx`**
   - Added imports: `useClubStore`, `PredefinedData` type
   - Added state: `wizardPredefinedData`
   - Updated `handleOpenBookingWizard()`: Now async, determines predefined data based on admin context
   - Updated `handleCloseBookingWizard()`: Clears predefined data
   - Updated `AdminQuickBookingWizard` component: Passes `predefinedData` prop

### Code Flow

```typescript
handleOpenBookingWizard() {
  if (club_admin) {
    // Fetch clubs
    // Find admin's club
    // Set predefinedData = { organizationId, clubId }
  }
  else if (organization_admin) {
    // Set predefinedData = { organizationId }
    // Fetch clubs in organization
    // If only 1 club: Set predefinedData.clubId
  }
  // Open wizard with predefinedData
}
```

### Step Visibility Logic (unchanged)
The existing step visibility logic in `types.ts` already handles predefined data correctly:

```typescript
// Step 1: Organization
shouldShow: (adminType, predefinedData) => 
  adminType === "root_admin" && !predefinedData?.organizationId

// Step 2: Club  
shouldShow: (adminType, predefinedData) => 
  (adminType === "root_admin" || adminType === "organization_admin") && 
  !predefinedData?.clubId

// Step 3: Date & Time
shouldShow: (_, predefinedData) => 
  !predefinedData?.date || !predefinedData?.startTime || !predefinedData?.duration
```

When `predefinedData` contains `organizationId` and/or `clubId`, the corresponding steps are skipped.

## Testing Scenarios

### Club Admin
1. Open Quick Booking wizard from admin bookings page
2. **Expected**: First step shown is "Date & Time"
3. **Expected**: Organization and club are preselected (not visible)
4. **Expected**: Can proceed directly to court selection after choosing time

### Organization Admin - Single Club
1. Organization Admin managing one club
2. Open Quick Booking wizard
3. **Expected**: First step shown is "Date & Time"
4. **Expected**: Organization and club are preselected
5. **Expected**: Workflow same as Club Admin

### Organization Admin - Multiple Clubs
1. Organization Admin managing multiple clubs
2. Open Quick Booking wizard
3. **Expected**: First step shown is "Select Club"
4. **Expected**: Organization is preselected
5. **Expected**: Can select from clubs in their organization
6. **Expected**: After selecting club, next step is "Date & Time"

### Root Admin
1. Open Quick Booking wizard
2. **Expected**: First step shown is "Select Organization"
3. **Expected**: Can select any organization
4. **Expected**: Next step is "Select Club", then "Date & Time"

## Benefits

1. **Improved User Experience**: Admins don't need to manually select organization/club when context is obvious
2. **Faster Workflow**: Fewer steps to complete a booking for Club Admin and single-club Organization Admin
3. **Logical Flow**: Booking process starts with availability check rather than administrative selection
4. **Maintains Flexibility**: Multi-club Organization Admins and Root Admins still have full control

## Comparison with Operations Page

The operations page (`/admin/operations/[clubId]/page.tsx`) already implemented this pattern correctly:
```typescript
handleCreateBooking() {
  setWizardPredefinedData({
    organizationId: club?.organizationId,
    clubId,
  });
}
```

This fix brings the admin bookings page in line with the operations page behavior.

## Future Enhancements

Potential improvements for future iterations:
1. Allow admins to change the preselected organization/club via a button or settings
2. Remember the last selected club for multi-club Organization Admins
3. Add a "Quick Booking" mode that skips even more steps for common scenarios
4. Provide keyboard shortcuts to jump between steps

## Related Documentation
- [Admin Quick Booking Feature](/docs/ADMIN_QUICK_BOOKING.md)
- [Quick Booking Flow Update](/docs/QUICK_BOOKING_FLOW_UPDATE.md)
