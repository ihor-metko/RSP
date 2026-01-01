# Courts Price Range Display

## Overview

The Courts List Block on the Club Detail Page (player view) now displays the price range of all courts in a club. This helps players quickly understand the pricing at a glance before viewing individual court details.

## Feature Description

### Location
- **Page**: Club Detail Page (`/clubs/[id]`)
- **Section**: Courts Carousel Section
- **Position**: In the section header, to the right of "Available Courts" title

### Display Logic

The price range is calculated from all available courts at the club and displayed according to these rules:

1. **Multiple Prices**: Shows range format
   - Example: `$40.00 - $60.00 per hour`
   - Displayed when courts have different `defaultPriceCents` values

2. **Single Price**: Shows single value
   - Example: `$50.00 per hour`
   - Displayed when all courts have the same price

3. **No Courts**: Hidden
   - Price range is not displayed when no courts are available
   - Also hidden during loading state

### Responsive Design

- **Mobile (< 640px)**: Stacks vertically
  ```
  Available Courts
  $40.00 - $60.00 per hour
  ```

- **Desktop (≥ 640px)**: Horizontal layout
  ```
  Available Courts              $40.00 - $60.00 per hour
  ```

## Implementation Details

### Data Source

- **Endpoint**: `GET /api/clubs/:clubId/courts`
- **Field**: `defaultPriceCents` (integer, in cents)
- **Access Level**: Player-facing, publicly accessible
- **Admin Data**: None - only uses public pricing information

### Calculation

```typescript
// Calculate min and max from courts array
const priceRange = useMemo(() => {
  if (!courts || courts.length === 0) return null;
  
  const prices = courts.map(c => c.defaultPriceCents);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  return { minPrice, maxPrice };
}, [courts]);

// Format for display
const displayText = priceRange 
  ? formatPriceRange(priceRange.minPrice, priceRange.maxPrice)
  : null;
```

### Styling

- **Color**: Primary theme color (`--rsp-primary`)
- **Font Size**: Small (sm) on mobile, base on desktop
- **Font Weight**: Medium (500)
- **Alignment**: Right-aligned on desktop, left-aligned on mobile

## Examples

### Example 1: Club with Courts at Different Prices

**Courts**:
- Court 1 (Indoor): $40.00/hour
- Court 2 (Outdoor): $30.00/hour
- Court 3 (Indoor Premium): $60.00/hour

**Display**: 
```
Available Courts              $30.00 - $60.00 per hour
```

### Example 2: Club with Courts at Same Price

**Courts**:
- Court 1: $50.00/hour
- Court 2: $50.00/hour
- Court 3: $50.00/hour

**Display**:
```
Available Courts              $50.00 per hour
```

### Example 3: Club with No Courts

**Courts**: None

**Display**:
```
Available Courts
(No price range shown)
```

## Benefits

1. **Quick Pricing Overview**: Players can see pricing at a glance
2. **Better Decision Making**: Helps players choose clubs that fit their budget
3. **Transparency**: Clear and upfront pricing information
4. **User Experience**: Reduces need to check individual court cards for pricing
5. **Mobile-Friendly**: Responsive design works well on all screen sizes

## Testing

The feature includes comprehensive test coverage:

- ✅ Price range calculation with various court configurations
- ✅ Formatting for single vs. multiple prices
- ✅ Edge cases (empty arrays, zero prices, null values)
- ✅ Conditional display logic
- ✅ Integration with courts data

## Technical Notes

- **Performance**: Price calculation is memoized to prevent unnecessary recalculations
- **Type Safety**: Fully typed with TypeScript
- **Accessibility**: Includes `data-testid` for automated testing
- **Maintainability**: Centralized utility functions for reuse across the app
