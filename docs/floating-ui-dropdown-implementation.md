# Floating UI Dropdown Implementation

## Overview
This document describes the migration of dropdown positioning from manual calculations to @floating-ui/react for the Select and Multiselect components.

## Problem Statement
The previous implementation used manual positioning calculations with `getBoundingClientRect()` which, while functional, had limitations:
- Required manual handling of all edge cases
- More code to maintain
- Potential bugs in complex scenarios
- No standardization across the industry

## Solution
Migrated to **@floating-ui/react**, the industry-standard library for positioning floating elements, used by major UI libraries like Headless UI, Radix UI, and Mantine.

## Implementation Details

### Dependencies Added
- `@floating-ui/react` v0.27.16 (verified: no vulnerabilities)

### Files Modified

#### 1. `src/hooks/useDropdownPosition.ts`
Complete rewrite to use Floating UI:

**Before:** Manual position calculation with `getBoundingClientRect()`
```typescript
// 145 lines of manual calculations
const calculatePosition = () => {
  const rect = trigger.getBoundingClientRect();
  // Manual flip logic
  // Manual shift logic
  // Manual size constraints
  // ...
};
```

**After:** Floating UI with middleware
```typescript
// 50 lines using Floating UI
const { x, y, refs, placement } = useFloating({
  placement: "bottom-start",
  middleware: [
    offset(4),
    flip({ padding: 8, fallbackPlacements: ["top-start", "bottom-start"] }),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ availableHeight, elements }) {
        const constrainedHeight = Math.min(maxHeight, availableHeight);
        elements.floating.style.maxHeight = `${constrainedHeight}px`;
      },
    }),
  ],
  whileElementsMounted: autoUpdate,
});
```

**Key Improvements:**
- 65% less code (145 lines → 50 lines)
- Automatic position updates via `autoUpdate`
- Industry-standard middleware system
- Better edge case handling
- More maintainable

#### 2. `src/components/ui/Select.tsx`
**Change:** Removed inline `maxHeight` style (now handled by Floating UI's `size` middleware)

```diff
  style={{
    position: 'fixed',
    top: `${dropdownPosition.top}px`,
    left: `${dropdownPosition.left}px`,
    width: `${dropdownPosition.width}px`,
-   maxHeight: `${dropdownPosition.maxHeight}px`,
  }}
```

#### 3. `src/components/ui/Multiselect.tsx`
**Change:** Same as Select - removed inline `maxHeight` style

#### 4. `src/__tests__/useDropdownPosition.test.tsx`
**Change:** Updated tests to mock Floating UI instead of testing manual calculations

**Before:** Tests verified specific position calculations
**After:** Tests verify Floating UI integration

#### 5. `docs/portal-dropdowns-implementation.md`
**Change:** Updated documentation to reflect Floating UI implementation

## Floating UI Configuration

### Middlewares Used

1. **offset(4)**
   - Adds 4px spacing between trigger and dropdown
   - Prevents dropdown from touching trigger element

2. **flip({ padding: 8, fallbackPlacements: ["top-start", "bottom-start"] })**
   - Automatically flips dropdown above trigger when space below is insufficient
   - Maintains 8px padding from viewport edges
   - Fallback order: bottom-start → top-start

3. **shift({ padding: 8 })**
   - Shifts dropdown horizontally to stay within viewport
   - Prevents horizontal overflow
   - Maintains 8px padding from viewport edges

4. **size({ padding: 8, apply: ... })**
   - Dynamically constrains dropdown height based on available space
   - Prevents vertical overflow
   - Applies maxHeight inline for immediate effect

5. **autoUpdate**
   - Automatically recalculates position on:
     - Window scroll
     - Window resize
     - Content changes
     - Layout shifts

## Benefits

### 1. **Robustness**
- Handles all edge cases automatically
- Battle-tested by thousands of projects
- Regular updates from Floating UI team

### 2. **Maintainability**
- 65% less code to maintain
- Standard API familiar to many developers
- Self-documenting with middleware names

### 3. **Performance**
- Optimized calculations with requestAnimationFrame
- Efficient event batching
- No unnecessary recalculations

### 4. **Features**
- Smart flipping when space is limited
- Viewport boundary detection
- Dynamic height adjustment
- Automatic repositioning
- Support for scrollable containers

### 5. **Future-Proof**
- Easy to add more middlewares
- Compatible with future Floating UI features
- Well-documented API

## Testing

### Unit Tests
- ✅ All 5 tests pass in `useDropdownPosition.test.tsx`
- Tests verify Floating UI integration
- Mock Floating UI for predictable testing

### Build
- ✅ TypeScript compilation succeeds
- ✅ No linting errors introduced
- ✅ All pre-existing tests pass

### Security
- ✅ CodeQL scan: 0 vulnerabilities
- ✅ npm audit: @floating-ui/react has no vulnerabilities

## Migration Notes

### Backward Compatibility
✅ **No breaking changes** - all existing usages work without modification

### Component API
- Select component API unchanged
- Multiselect component API unchanged
- useDropdownPosition interface unchanged

### Styling
- All CSS classes preserved
- Dark theme support maintained
- Animations work as before

## Future Enhancements

With Floating UI, these features are now easy to add:

1. **Arrow/pointer** - Use `arrow` middleware
2. **Boundary constraints** - Add `boundary` option to flip/shift
3. **Hide on scroll** - Use `hide` middleware
4. **Transition animations** - Use Floating UI's transition utilities
5. **Virtual elements** - Support positioning relative to coordinates
6. **Multiple placements** - Easy to support more placement options

## References

- [Floating UI Documentation](https://floating-ui.com/)
- [Floating UI React](https://floating-ui.com/docs/react)
- [Middlewares](https://floating-ui.com/docs/middleware)
- [Tutorial](https://floating-ui.com/docs/tutorial)

## Conclusion

The migration to @floating-ui/react provides a robust, maintainable, and future-proof solution for dropdown positioning. The implementation follows industry best practices and reduces code complexity while improving reliability.
