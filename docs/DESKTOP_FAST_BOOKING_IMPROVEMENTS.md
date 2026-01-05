# Desktop Fast Booking Improvements

## Summary

This document describes the desktop-specific improvements made to the fast booking flow for players, implementing proper restrictions and UX enhancements.

## Changes Implemented

### 1. Date Selection Improvements

**Changes:**
- Replaced the native HTML date input with the custom `DateInput` component
- The DateInput component includes an integrated calendar UI for visual date selection
- Manual date entry is disabled - users can only select dates from the calendar
- Past dates are automatically blocked using the `minDate` prop set to today's date

**Files Modified:**
- `src/components/PlayerQuickBooking/Step1DateTime.tsx`

**Implementation Details:**
```typescript
<DateInput
  label={t("common.date")}
  value={data.date}
  onChange={(date) => onChange({ date })}
  minDate={getTodayDateString()}
  disabled={isLoading}
  aria-label={t("common.date")}
/>
```

### 2. Time and Duration Selection Updates

**Changes:**
- Time selection now offers 30-minute increments
- Available hours: 8:00 AM to 10:00 PM (8:00–22:00)
- Duration options: 30 minutes to 3 hours in 30-minute steps
  - 30 minutes
  - 1 hour
  - 1.5 hours (90 minutes)
  - 2 hours
  - 2.5 hours (150 minutes)
  - 3 hours

**Files Modified:**
- `src/components/PlayerQuickBooking/types.ts`
- `src/components/PlayerQuickBooking/Step1DateTime.tsx`

**Constants Updated:**
```typescript
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 22;
export const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];
```

**UX Enhancement:**
Duration display now shows hours when appropriate for better readability:
- "30 minutes" → "30 minutes"
- "60 minutes" → "1 hour"
- "90 minutes" → "1.5 hours"
- "120 minutes" → "2 hours"
- "150 minutes" → "2.5 hours"
- "180 minutes" → "3 hours"

### 3. Price Range Display

**Changes:**
- Estimated price now shows a range (min-max) when multiple courts with different prices are available
- Single price shown when all courts have the same price
- More informative hint message based on price variance

**Files Modified:**
- `src/components/PlayerQuickBooking/PlayerQuickBooking.tsx`
- `src/components/PlayerQuickBooking/Step1DateTime.tsx`
- `src/components/PlayerQuickBooking/types.ts`

**Implementation Details:**
```typescript
// Calculate price range
const prices = courts.map(c => Math.round((c.defaultPriceCents / MINUTES_PER_HOUR) * duration));
const minPrice = Math.min(...prices);
const maxPrice = Math.max(...prices);

// Display logic
{estimatedPriceRange && estimatedPriceRange.min !== estimatedPriceRange.max ? (
  <>
    {formatPrice(estimatedPriceRange.min)} - {formatPrice(estimatedPriceRange.max)}
  </>
) : estimatedPrice !== null ? (
  formatPrice(estimatedPrice)
) : (
  <span className="opacity-50">--</span>
)}
```

### 4. Alternative Duration Suggestions

**Changes:**
- When no courts are available for the selected duration, the system automatically checks alternative durations
- Displays up to 3 closest alternative durations that have available courts
- Quick selection buttons allow users to change duration without returning to the previous step
- User-friendly message explains the situation and offers alternatives

**Files Modified:**
- `src/components/PlayerQuickBooking/PlayerQuickBooking.tsx`
- `src/components/PlayerQuickBooking/Step2Courts.tsx`
- `src/components/PlayerQuickBooking/types.ts`

**Algorithm:**
1. When fetching courts returns empty results
2. Check all other duration options in DURATION_OPTIONS
3. Filter durations that have available courts
4. Sort by proximity to the originally selected duration
5. Display top 3 alternatives with quick-select buttons

**User Experience:**
- Clear message: "No courts are available for the selected duration."
- Friendly suggestion: "We can suggest the closest available options:"
- Clickable duration buttons that immediately refetch courts with the new duration

### 5. Translation Updates

**Files Modified:**
- `locales/en.json`
- `locales/uk.json`

**New Translation Keys:**

English:
```json
{
  "common": {
    "hour": "hour",
    "hours": "hours"
  },
  "booking": {
    "quickBooking": {
      "noCourtsForDuration": "No courts are available for the selected duration.",
      "alternativeDurationsAvailable": "We can suggest the closest available options:"
    }
  },
  "wizard": {
    "priceRangeHint": "Price range based on available courts"
  }
}
```

Ukrainian:
```json
{
  "common": {
    "hour": "година",
    "hours": "години"
  },
  "booking": {
    "quickBooking": {
      "noCourtsForDuration": "Немає доступних кортів для вибраної тривалості.",
      "alternativeDurationsAvailable": "Ми можемо запропонувати найближчі доступні варіанти:"
    }
  },
  "wizard": {
    "priceRangeHint": "Діапазон цін на основі доступних кортів"
  }
}
```

## Technical Details

### State Management

Added to `PlayerQuickBookingState`:
```typescript
alternativeDurations: number[];
estimatedPriceRange: { min: number; max: number } | null;
```

### Component Props

Updated `Step2CourtsProps`:
```typescript
interface Step2CourtsProps {
  courts: BookingCourt[];
  selectedCourtId: string | null;
  onSelectCourt: (court: BookingCourt) => void;
  isLoading: boolean;
  error: string | null;
  currentDuration: number;  // For context
  alternativeDurations?: number[];
  onSelectAlternativeDuration?: (duration: number) => void;
}
```

Updated `Step1DateTimeProps`:
```typescript
interface Step1DateTimeProps {
  data: PlayerBookingStep1Data;
  onChange: (data: Partial<PlayerBookingStep1Data>) => void;
  estimatedPrice: number | null;
  estimatedPriceRange?: { min: number; max: number } | null;
  isLoading?: boolean;
}
```

## Desktop-Only Implementation

All changes are desktop-focused. The mobile flow remains unchanged and continues to use the mobile-specific implementation defined in `docs/player-mobile-flow.md`.

## Testing Considerations

### Manual Testing Checklist

1. **Date Selection:**
   - [ ] Calendar popup opens when clicking the date input
   - [ ] Past dates are disabled and cannot be selected
   - [ ] Manual text entry is blocked
   - [ ] Selected date displays correctly in the input

2. **Time Selection:**
   - [ ] Time options start at 8:00
   - [ ] Time options end at 22:00 (last option 21:30)
   - [ ] All options are in 30-minute increments

3. **Duration Selection:**
   - [ ] All 6 duration options are available
   - [ ] Display shows "1 hour", "2 hours", etc. for whole hours
   - [ ] Display shows "30 minutes" for half hours

4. **Price Range:**
   - [ ] Shows range when courts have different prices
   - [ ] Shows single price when all courts same price
   - [ ] Updates when duration changes
   - [ ] Displays appropriate hint text

5. **Alternative Durations:**
   - [ ] Appears when no courts available for selected duration
   - [ ] Shows up to 3 alternatives
   - [ ] Clicking alternative duration refetches courts
   - [ ] Alternative buttons are styled consistently
   - [ ] Message is clear and helpful

6. **Mobile:**
   - [ ] Mobile flow is unaffected
   - [ ] No breaking changes to mobile UI

## Future Enhancements

Potential improvements for future iterations:

1. **Smart Duration Suggestions:**
   - Consider court-specific opening hours
   - Factor in existing bookings to suggest optimal durations
   - Show "most popular" duration based on historical data

2. **Price Optimization:**
   - Highlight best-value courts in the range
   - Show price per hour for easier comparison
   - Display peak/off-peak pricing indicators

3. **Calendar Enhancements:**
   - Show availability indicators on calendar dates
   - Highlight popular booking dates
   - Multi-day booking support

4. **Performance:**
   - Cache alternative duration checks
   - Prefetch likely duration alternatives
   - Optimize parallel court availability requests

## Backward Compatibility

All changes are backward compatible:
- No breaking changes to existing APIs
- Mobile flow remains unchanged
- Existing bookings and data structures unaffected
- Only UI/UX improvements to the desktop flow

## Browser Support

The DateInput component and calendar UI are compatible with:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (though mobile uses simplified flow)

## Accessibility

All improvements maintain accessibility standards:
- Calendar navigation with keyboard (arrow keys, Enter, Escape)
- ARIA labels on all interactive elements
- Screen reader friendly messages
- Focus management in modals
- High contrast support
