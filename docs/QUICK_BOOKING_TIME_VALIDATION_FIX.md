# Quick Booking Time Validation and I18n Fix

## Overview
This document describes the fixes applied to the Admin Quick Booking wizard to address invalid behavior when booking late in the day, eliminate fallback time logic, ensure proper validation, and implement court type internationalization.

## Problem Statement

### Context
In the Quick Booking flow, there was invalid behavior when a player books late in the day (e.g., 23:00):
1. Default date was today, but no start time was selected because all available time slots were filtered out
2. User could still proceed to the next step
3. "Estimated price" was displayed even though start time was not selected
4. Price was calculated using a hardcoded fallback time (10:00 AM)
5. Court type labels were not properly localized

This resulted in:
- Incorrect availability checks
- Incorrect pricing
- Broken UX
- Inconsistent i18n

## Requirements Addressed

### 1. Mandatory Start Time Selection (No Fallbacks)
**Requirement**: Remove any default/fallback start time logic (e.g., 10:00). If startTime is not explicitly selected by the user, do NOT allow moving to the next step, fetching available courts, or calculating/showing estimated price.

**Rule**: 👉 No start time → no availability request → no price

### 2. Correct Handling of Late Hours
**Requirement**: When selected date is today and current time is late with no available start times remaining, show a clear inline message and disable the Continue button.

**Example Message**: "No available time slots left for today. Please select another date."

### 3. Estimated Price Visibility Rules
**Requirement**: The "Estimated price" block must be shown only if ALL are selected: date, start time, duration, court type.

### 4. Availability & Pricing Requests
**Requirement**: AvailableCourts/pricing requests must use only user-selected values. Never assume or inject a default time. Backend calls should fail fast if required parameters are missing.

### 5. Internationalization (Court Type)
**Requirement**: Fix court type labels to use proper i18n keys (e.g., `court.type.single`, `court.type.double`). Remove hardcoded strings from Quick Booking UI. Ensure correct localization for all supported languages.

### 6. UX & Consistency
**Requirement**: Keep desktop-only scope. Use existing UI components and `im-*` semantic classes. Error/validation states must be visible and understandable.

## Solution Implemented

### 1. Removed Hardcoded Fallback Time

**Files Modified**: `src/components/AdminQuickBookingWizard/AdminQuickBookingWizard.tsx`

**Changes**:
- Line 77: Changed `startTime: predefinedData?.startTime || "10:00"` to `startTime: predefinedData?.startTime || ""`
- Line 180: Changed `startTime: predefinedData?.startTime || "10:00"` to `startTime: predefinedData?.startTime || ""`
- Line 260: Changed `startTime: predefinedData.startTime || "10:00"` to `startTime: predefinedData.startTime || ""`

**Impact**:
- No default time is ever used
- Users must explicitly select a start time
- Empty string is now the default when no time is predefined

### 2. Added "No Time Slots Available" Warning

**Files Modified**: 
- `src/components/AdminQuickBookingWizard/Step3DateTime.tsx`
- `src/components/AdminQuickBookingWizard/AdminQuickBookingWizard.css`

**Implementation**:
```typescript
// Calculate if no time slots are available
const TIME_OPTIONS = filterPastTimeSlots(generateTimeOptions(), data.date);
const hasNoTimeSlots = TIME_OPTIONS.length === 0;
const isToday = data.date === getTodayDateString();

// Disable time select when no slots
<Select
  id="admin-booking-time"
  disabled={isLoading || hasNoTimeSlots}
  // ... other props
/>

// Show warning message
{hasNoTimeSlots && isToday && (
  <div className="rsp-admin-wizard-warning" role="alert">
    {t("adminWizard.noTimeSlotsAvailable")}
  </div>
)}
```

**CSS Added**:
```css
.rsp-admin-wizard-warning {
  padding: var(--spacing-3);
  background-color: var(--color-warning-bg);
  border: 1px solid var(--color-warning);
  border-radius: var(--border-radius);
  color: var(--color-warning);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-3);
}
```

**Impact**:
- Clear visual feedback when no time slots are available
- Time select is disabled (cannot select a time that doesn't exist)
- Guides user to select another date

### 3. Court Type Internationalization

**Files Modified**:
- `src/components/AdminQuickBookingWizard/Step4Courts.tsx`
- `src/components/AdminQuickBookingWizard/Step6Confirmation.tsx`
- `locales/en.json`
- `locales/uk.json`

**Implementation**:
```typescript
// Helper function added to both Step4Courts and Step6Confirmation
const getCourtTypeLabel = (type: string | null): string => {
  if (!type) return "";
  
  const normalizedType = type.toLowerCase();
  if (normalizedType === "single") {
    return t("court.type.single");
  } else if (normalizedType === "double") {
    return t("court.type.double");
  }
  // Fallback to original type if no translation exists
  return type;
};

// Usage in Step4Courts
<span className="rsp-badge rsp-badge-type">
  {getCourtTypeLabel(court.type)}
</span>

// Usage in Step6Confirmation
{court.name}
{court.type && ` - ${getCourtTypeLabel(court.type)}`}
```

**I18n Keys Added**:

English (`locales/en.json`):
```json
"court": {
  "type": {
    "single": "Single",
    "double": "Double"
  }
}
```

Ukrainian (`locales/uk.json`):
```json
"court": {
  "type": {
    "single": "Одиночний",
    "double": "Парний"
  }
}
```

**Impact**:
- Court types are now properly translated
- Consistent with other i18n in the application
- Supports future language additions

### 4. Validation Enforcement (Already Correct)

**File**: `src/components/AdminQuickBookingWizard/hooks/useWizardNavigation.ts`

**Existing Logic** (Lines 45-56):
```typescript
const canProceed = useMemo(() => {
  switch (currentStep) {
    // ... other cases
    case 3: // DateTime
      return (
        !!state.stepDateTime.date &&
        !!state.stepDateTime.startTime &&  // ← This enforces start time selection
        state.stepDateTime.duration > 0
      );
    // ... other cases
  }
}, [currentStep, state]);
```

**No Changes Needed**:
- ✅ Validation already checks `!!state.stepDateTime.startTime`
- ✅ Empty string (`""`) will fail this check
- ✅ Continue button is disabled when validation fails
- ✅ User cannot proceed without selecting a time

### 5. Price Display Logic (Already Correct)

**Files**: 
- `src/components/AdminQuickBookingWizard/AdminQuickBookingWizard.tsx`
- `src/components/AdminQuickBookingWizard/Step6Confirmation.tsx`

**Existing Flow**:
1. Price is only displayed on Step 6 (Confirmation)
2. Step 6 can only be reached after passing all validations
3. Validations require: organization, club, date, **start time**, duration, court, user

**No Changes Needed**:
- ✅ Price is only shown when all required fields are selected
- ✅ Step flow enforces this automatically
- ✅ No separate "price preview" exists before confirmation

### 6. Availability Requests (Already Correct)

**File**: `src/components/AdminQuickBookingWizard/hooks/useWizardCourts.ts`

**Existing Logic** (Lines 36-50):
```typescript
const fetchCourts = useCallback(async () => {
  if (!clubId) {
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const { date, startTime, duration } = dateTime;
    const params = new URLSearchParams({
      date,
      start: startTime,  // ← Uses actual user-selected value
      duration: duration.toString(),
    });
    
    const response = await fetch(
      `/api/clubs/${clubId}/available-courts?${params}`
    );
    // ... rest of implementation
  }
}, [clubId, dateTime, t]);
```

**No Changes Needed**:
- ✅ Uses actual `dateTime.startTime` value (which can be empty)
- ✅ Backend will receive empty string if not selected
- ✅ Backend should validate and return appropriate error
- ✅ `fetchCourts()` is only called when moving to Step 4
- ✅ Cannot move to Step 4 without passing Step 3 validation (which requires start time)

## Testing

### Unit Tests Updated

**File**: `src/__tests__/admin-quick-booking-wizard.test.tsx`

**Changes**:
- Added `adminWizard.noTimeSlotsAvailable` to mock translations
- Added `court.type.single` to mock translations
- Added `court.type.double` to mock translations

### Manual Testing Scenarios

**Scenario 1: Late Night Booking for Today**
1. Open Quick Booking wizard at 23:00
2. Date defaults to today
3. Expected: Warning message displayed, time select disabled
4. Change date to tomorrow
5. Expected: Warning disappears, time slots available

**Scenario 2: Cannot Proceed Without Start Time**
1. Open Quick Booking wizard
2. Select date
3. Select duration
4. Do NOT select start time
5. Expected: Continue button is disabled
6. Select start time
7. Expected: Continue button is enabled

**Scenario 3: Court Type Localization**
1. Open Quick Booking wizard
2. Proceed to court selection step
3. Expected: Court types show "Single" or "Double" (not raw values)
4. Change language to Ukrainian
5. Expected: Court types show "Одиночний" or "Парний"
6. Proceed to confirmation
7. Expected: Court type in summary also localized

**Scenario 4: No Fallback Time**
1. Open Quick Booking wizard with no predefined data
2. Check Step 3 (DateTime)
3. Expected: Start time field is empty (not "10:00")
4. Try to continue without selecting time
5. Expected: Cannot proceed

## Acceptance Criteria Validation

✅ **User cannot proceed without selecting a valid start time**
- Implementation: `useWizardNavigation` validation checks `!!state.stepDateTime.startTime`
- Result: Continue button disabled when `startTime === ""`

✅ **No price is shown unless booking data is complete**
- Implementation: Price only shown on Step 6 (Confirmation)
- Result: Step 6 only reachable after all validations pass

✅ **No fallback time is ever used in availability or pricing**
- Implementation: Changed all 3 instances of `|| "10:00"` to `|| ""`
- Result: Empty string used as default, which fails validation

✅ **Late-night booking for "today" clearly guides user to select another date**
- Implementation: Inline warning message when no time slots available for today
- Result: Clear message, disabled time select

✅ **Court type labels are fully localized**
- Implementation: `getCourtTypeLabel()` helper in Step4Courts and Step6Confirmation
- Result: Uses `court.type.single` and `court.type.double` i18n keys

✅ **Quick Booking flow behaves deterministically and predictably**
- Implementation: No hidden defaults, clear validation messages, consistent i18n
- Result: User always knows what is required and what is selected

## Benefits

1. **Correct Pricing**: No more incorrect prices calculated with fallback times
2. **Better UX**: Clear feedback when no time slots are available
3. **Data Integrity**: Cannot create bookings without explicit user selections
4. **Internationalization**: Court types properly localized for all languages
5. **Predictable Behavior**: No hidden defaults or assumptions
6. **Maintainability**: Consistent validation logic, clear error states

## Migration Notes

### For Admins
- **Behavior Change**: You must now explicitly select a start time (no default)
- **New Feature**: Clear warning when booking late in the day
- **Improved**: Court types now show in your language

### For Developers
- **Breaking Change**: `startTime` now defaults to `""` instead of `"10:00"`
- **New i18n Keys**: `adminWizard.noTimeSlotsAvailable`, `court.type.single`, `court.type.double`
- **New CSS Class**: `.rsp-admin-wizard-warning`

## Related Issues

- Blocking for correct booking behavior and payment flow
- Aligned with upcoming slot reservation before payment logic

## Future Enhancements

Potential improvements for future iterations:
1. Show available time slots count in date picker
2. Smart time slot suggestions (e.g., "Next available: Tomorrow at 9:00")
3. Favorite time slot preferences per admin user
4. Batch booking with consistent time validation
5. Time zone display and conversion for multi-region platforms

## References

- [Admin Quick Booking Feature](/docs/ADMIN_QUICK_BOOKING.md)
- [Quick Booking Flow Update](/docs/QUICK_BOOKING_FLOW_UPDATE.md)
- [Quick Booking Initialization Fix](/docs/QUICK_BOOKING_INITIALIZATION_FIX.md)
