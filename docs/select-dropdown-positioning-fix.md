# Select Dropdown Positioning Fix

## Overview
Fixed a visual bug in the Select component where dropdowns would appear much higher than expected when rendered above the input element due to insufficient space below.

## Problem Description
When a Select component was positioned near the bottom of the viewport and there wasn't enough space below to display the dropdown, the component correctly attempted to render the dropdown above the input. However, due to a positioning calculation issue, the dropdown would appear disconnected from the trigger element, appearing much higher than expected.

## Root Cause
The issue was in the `useDropdownPosition` hook (`src/hooks/useDropdownPosition.ts`). When calculating the available space above the trigger element, the hook did not account for the `VIEWPORT_PADDING` constant, which caused positioning inconsistencies.

### Before Fix
```typescript
const spaceAbove = rect.top - offset;
```

This calculation didn't account for the minimum viewport padding (8px), which meant:
1. The `actualMaxHeight` would be calculated without considering viewport constraints
2. When the position was clamped to `VIEWPORT_PADDING` later, the dropdown would appear disconnected from the trigger

## Solution
Updated the `useDropdownPosition` hook to:
1. Account for `VIEWPORT_PADDING` when calculating available space above
2. Ensure minimum dropdown height with `Math.max(0, ...)`
3. Apply viewport padding clamping only to "top" placement to maintain proper alignment

### After Fix
```typescript
const spaceAbove = rect.top - offset - VIEWPORT_PADDING;
const actualMaxHeight = Math.min(maxHeight, Math.max(0, availableSpace - SAFE_ZONE_BUFFER));

// For top placement, apply viewport padding clamping
if (placement === "bottom") {
  top = rect.bottom + offset;
} else {
  top = rect.top - actualMaxHeight - offset;
  top = Math.max(VIEWPORT_PADDING, top);
}
```

## Changes Made

### Files Modified
1. **src/hooks/useDropdownPosition.ts**
   - Line 77: Added `VIEWPORT_PADDING` to space above calculation
   - Line 86: Added `Math.max(0, ...)` to ensure non-negative height
   - Lines 89-97: Restructured position calculation to handle "top" placement correctly

### Files Added
2. **src/__tests__/select-dropdown-positioning.test.tsx**
   - Comprehensive tests for dropdown positioning behavior
   - Tests for both "below" and "above" placements
   - Viewport padding validation
   - Width matching verification
   - Selection functionality when positioned above

## Testing

### Unit Tests
Created 5 new tests covering:
- ✅ Dropdown positioned below when space is available
- ✅ Dropdown positioned above when space below is insufficient
- ✅ Viewport padding respected when positioning above
- ✅ Trigger width matching
- ✅ Selection works when dropdown is positioned above

All tests pass:
```
Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

### Manual Testing
To manually verify the fix:
1. Navigate to any page with Select components (e.g., Admin pages with filters)
2. Scroll the page so a Select component is near the bottom of the viewport
3. Open the Select dropdown
4. Verify the dropdown appears directly above the input with proper alignment
5. Verify the dropdown doesn't overlap with or appear disconnected from the trigger

## Behavior

### Below Placement (Default)
When sufficient space exists below the trigger:
- Dropdown appears below the input
- Top edge positioned at `trigger.bottom + offset`
- No viewport padding adjustment needed

### Above Placement (When space is limited)
When insufficient space exists below:
- Dropdown appears above the input
- Bottom edge positioned at `trigger.top - offset`
- Top edge clamped to `VIEWPORT_PADDING` (8px) minimum
- Height adjusted to fit available space

## Impact
- ✅ Fixes visual bug with dropdown positioning
- ✅ Maintains smooth transitions between below/above positioning
- ✅ Respects viewport boundaries
- ✅ No breaking changes to existing functionality
- ✅ All existing tests continue to pass

## Components Affected
All Select components across the application inherit this fix, including:
- `Select` component in `src/components/ui/Select.tsx`
- `SortSelect` in list controls
- `StatusFilter`, `RoleFilter` components
- `OrgSelector`, `ClubSelector` components
- Any custom components using the Select component

## Future Considerations
- The fix maintains the existing API and behavior
- `VIEWPORT_PADDING` (8px) and `SAFE_ZONE_BUFFER` (20px) constants can be adjusted if needed
- The dropdown positioning recalculates on scroll and resize events
- Consider adding visual regression tests for dropdown positioning in different scenarios
