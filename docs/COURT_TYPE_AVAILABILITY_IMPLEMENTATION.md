# Fast Booking – Court Type Handling and Availability (Desktop MVP)

## Overview

This implementation adds court type availability checking to the fast booking flow, ensuring that players can only see and select court types (Single/Double) that are actually available in the selected club.

## Problem

Previously, the fast booking flow would always show both "Single" and "Double" court type options, even if a club only had courts of one type. This could lead to confusion when players selected a court type that had no available courts.

## Solution

The implementation adds the following features:

1. **New API Endpoint**: `/api/clubs/[id]/court-types`
   - Returns a list of available court types for a specific club
   - Only considers published courts
   - Returns types: `["Single"]`, `["Double"]`, or `["Double", "Single"]`

2. **Dynamic Court Type Filtering**
   - Fetches available court types when a club is selected
   - Hides court type options that are not available
   - Auto-selects the first available type if the current selection becomes unavailable

3. **UX Improvements**
   - Players only see court types that exist in the club
   - No confusion about unavailable options
   - Smooth integration with existing date/time/duration validation

## Implementation Details

### API Endpoint

**Location**: `src/app/api/(player)/clubs/[id]/court-types/route.ts`

**Response Format**:
```json
{
  "availableTypes": ["Single", "Double"]
}
```

**Features**:
- Only counts published courts (`isPublished: true`)
- Filters out invalid court types
- Returns sorted array for consistency
- Returns 404 if club not found
- Returns 500 on internal errors

### Component Changes

#### PlayerQuickBooking Component

**New State Fields**:
```typescript
availableCourtTypes: ("Single" | "Double")[]
isLoadingCourtTypes: boolean
```

**New Function**: `fetchAvailableCourtTypes()`
- Fetches court types from the API
- Auto-selects first available type if current selection is unavailable
- Defaults to both types on error (graceful degradation)

**useEffect Hook**:
- Triggers when club is selected or modal opens with preselected club
- Calls `fetchAvailableCourtTypes()` automatically

#### Step1DateTime Component

**New Props**:
```typescript
availableCourtTypes?: ("Single" | "Double")[]
```

**Behavior**:
- Filters radio options based on `availableCourtTypes`
- Only renders court type selection if types are available
- Defaults to showing both types if not provided (backward compatibility)

### Type Updates

**Location**: `src/components/PlayerQuickBooking/types.ts`

Added new fields to `PlayerQuickBookingState`:
```typescript
availableCourtTypes: ("Single" | "Double")[];
isLoadingCourtTypes: boolean;
```

## Testing

### Unit Tests

**Location**: `src/__tests__/court-types-api.test.ts`

**Test Coverage**:
- ✅ Returns both types for clubs with both court types
- ✅ Returns only Single for clubs with only Single courts
- ✅ Returns only Double for clubs with only Double courts
- ✅ Returns empty array for clubs with no published courts
- ✅ Ignores courts with null or invalid types
- ✅ Returns 404 for non-existent clubs
- ✅ Handles database errors gracefully

All tests pass successfully.

### Linting

- ✅ ESLint passes with no new warnings
- ✅ TypeScript compilation succeeds (no new errors)

## User Experience

### Scenario 1: Club with both court types
- User selects club
- API returns `["Double", "Single"]`
- Both "Single" and "Double" options are shown
- User can select either option

### Scenario 2: Club with only Double courts
- User selects club
- API returns `["Double"]`
- Only "Double" option is shown
- "Single" option is hidden
- Current selection auto-switches to "Double" if it was "Single"

### Scenario 3: Club with only Single courts
- User selects club
- API returns `["Single"]`
- Only "Single" option is shown
- "Double" option is hidden
- Current selection auto-switches to "Single" if it was "Double"

### Scenario 4: Club with no published courts
- User selects club
- API returns `[]`
- No court type options are shown
- User cannot proceed to court selection

### Error Handling

If the API request fails:
- Gracefully falls back to showing both court types
- Player can still proceed with booking
- No error message is shown (silent failure)

## Integration with Existing Features

This implementation works seamlessly with:
- ✅ Date selection and validation
- ✅ Time selection (business hours)
- ✅ Duration selection
- ✅ Price estimation
- ✅ Alternative duration suggestions
- ✅ Preselected club/court/datetime flow
- ✅ Real-time availability updates via WebSocket

## Future Enhancements

Potential improvements for future iterations:

1. **Show unavailable types with hint**
   - Display greyed-out options with explanation
   - "No Single courts available at this club"

2. **Court type preferences**
   - Remember user's preferred court type
   - Auto-select preferred type when available

3. **Availability indicators**
   - Show count of available courts per type
   - e.g., "Double (3 courts available)"

4. **Performance optimization**
   - Cache court types per club
   - Reduce redundant API calls

## Backward Compatibility

- ✅ No breaking changes to existing APIs
- ✅ Defaults to showing both types if data not available
- ✅ Works with preselected data flow
- ✅ Mobile flow unaffected

## Files Changed

1. `src/app/api/(player)/clubs/[id]/court-types/route.ts` - New API endpoint
2. `src/components/PlayerQuickBooking/types.ts` - Updated types
3. `src/components/PlayerQuickBooking/PlayerQuickBooking.tsx` - Main component logic
4. `src/components/PlayerQuickBooking/Step1DateTime.tsx` - UI filtering
5. `src/__tests__/court-types-api.test.ts` - New test file

## Summary

This implementation successfully addresses the requirements by:
- ✅ Checking court type availability before displaying options
- ✅ Hiding unavailable court types from the UI
- ✅ Preventing selection of unavailable court types
- ✅ Maintaining consistency with existing validation
- ✅ Providing a simple, MVP-ready solution
