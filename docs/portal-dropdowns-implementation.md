# Portal-Based Dropdowns Implementation

## Overview
This document describes the implementation of portal-based rendering for dropdown components (Select, DateInput, and Multiselect) to fix layout issues in scrollable containers.

## Problem Statement
Previously, dropdown components rendered their panels using `position: absolute` within their parent containers. This caused issues when the components were used inside scrollable containers:
- Dropdowns would render inside the scrollable container
- Opening a dropdown could cause internal scrolling
- Dropdowns could be clipped by `overflow: hidden` containers
- Poor UX as dropdowns didn't appear as true overlays

## Solution
Implemented portal-based rendering where dropdown panels are rendered at the document root, outside the normal DOM hierarchy, similar to modal dialogs.

## Components Added

### 1. Portal Component (`src/components/ui/Portal.tsx`)
A reusable component that uses React's `createPortal` to render children outside the parent DOM hierarchy.

**Features:**
- Renders children into document.body by default
- Supports custom container element
- Handles mounting/unmounting lifecycle
- Simple, focused implementation

**Usage:**
```tsx
<Portal>
  <div className="dropdown-menu">Menu content</div>
</Portal>
```

### 2. useDropdownPosition Hook (`src/hooks/useDropdownPosition.ts`)
A custom hook that calculates optimal positioning for portal-rendered dropdowns using **@floating-ui/react**.

**Features:**
- Uses Floating UI's `useFloating` for robust position calculation
- Automatically flips dropdown above trigger if not enough space below (via `flip` middleware)
- Shifts dropdown to stay within viewport boundaries (via `shift` middleware)
- Dynamically adjusts maxHeight based on available space (via `size` middleware)
- Auto-updates position on scroll, resize, and content changes (via `autoUpdate`)
- Returns `null` when dropdown is closed (no unnecessary calculations)
- Configurable offset, max height, and width matching

**Middlewares Used:**
- `offset`: Adds spacing between trigger and dropdown
- `flip`: Automatically flips to opposite side when space is limited
- `shift`: Prevents overflow outside viewport boundaries
- `size`: Constrains dropdown height based on available space
- `autoUpdate`: Keeps position synced with DOM changes

**Parameters:**
- `triggerRef`: Reference to the trigger element
- `listboxRef`: Reference to the dropdown element (for Floating UI to track)
- `isOpen`: Whether the dropdown is open
- `offset`: Spacing between trigger and dropdown (default: 4px)
- `maxHeight`: Maximum dropdown height (default: 300px)
- `matchWidth`: Whether to match trigger width (default: true)

**Returns:**
```typescript
{
  top: number;        // Fixed position from top of viewport
  left: number;       // Fixed position from left of viewport
  width: number;      // Calculated width
  maxHeight: number;  // Maximum height (actual constraint applied via size middleware)
  placement: "bottom" | "top";  // Where dropdown appears
}
```

## Components Updated

### 1. Select Component (`src/components/ui/Select.tsx`)
**Changes:**
- Added `Portal` wrapper around dropdown options
- Added `triggerRef` for position calculation
- Added `useDropdownPosition` hook
- Applied fixed positioning with calculated position
- Added portal-specific CSS class for styling

**Before:**
```tsx
{open && (
  <ul className="im-select-options">
    {/* options */}
  </ul>
)}
```

**After:**
```tsx
{open && dropdownPosition && (
  <Portal>
    <ul 
      className="im-select-options im-select-options-portal"
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        maxHeight: `${dropdownPosition.maxHeight}px`,
      }}
    >
      {/* options */}
    </ul>
  </Portal>
)}
```

### 2. DateInput Component (`src/components/ui/DateInput.tsx`)
**Changes:**
- Added `Portal` wrapper around calendar popup
- Added `inputContainerRef` for position calculation
- Added `useDropdownPosition` hook
- Applied fixed positioning with calculated position
- Added portal-specific CSS class

**Configuration:**
- `matchWidth: false` - Calendar doesn't need to match input width
- `maxHeight: 400` - More space for calendar display

### 3. Multiselect Component (`src/components/ui/Multiselect.tsx`)
**Changes:**
- Added `Portal` wrapper around dropdown
- Added `triggerRef` for position calculation
- Added `useDropdownPosition` hook
- Applied fixed positioning with calculated position
- Added portal-specific CSS class

## CSS Updates

### Select.css
**Removed:**
- `position: absolute`
- `top: calc(100% + 0.25rem)`
- `left: 0`
- `width: 100%`

**Added:**
```css
.im-select-options-portal {
  z-index: 9999;
  animation: slideDown 0.15s ease-out;
}
```

### DateInput.css
**Removed:**
- `position: absolute`
- `top: calc(100% + 0.5rem)`
- Media query for small screens

**Added:**
```css
.im-date-input-popup-portal {
  z-index: 9999;
}
```

### Multiselect.css
**Removed:**
- `position: absolute`
- `z-index: 50`
- `width: 100%`
- `margin-top: 1`

**Added:**
```css
.rsp-multiselect-dropdown-portal {
  z-index: 9999;
  animation: slideDown 0.15s ease-out;
}
```

## Benefits

1. **Industry-Standard Positioning**: Uses @floating-ui/react, the same library used by major UI frameworks
2. **No Internal Scrolling**: Dropdowns render outside scrollable containers, preventing internal scrolling
3. **True Overlay Behavior**: Dropdowns appear above all content with `z-index: 9999`
4. **No Clipping**: Dropdowns are never clipped by `overflow: hidden` containers
5. **Smart Positioning**: Automatically flips above trigger when space is limited below
6. **Viewport Awareness**: Shifts to stay within viewport boundaries (no overflow)
7. **Dynamic Height**: Automatically adjusts maxHeight based on available space
8. **Responsive**: Auto-updates position on scroll, resize, and content changes
9. **Consistent UX**: Behaves like modal/popover components
10. **Dark Theme Support**: All existing dark theme styles preserved
11. **Accessibility**: All ARIA attributes and keyboard interactions maintained
12. **Performance**: Optimized position calculations with requestAnimationFrame

## Interaction Model
All existing interactions remain unchanged:
- Click trigger to open/close
- Click outside to close
- Escape key to close
- Arrow keys for navigation
- Enter/Space to select
- Tab to close and move focus

## Testing Recommendations

1. **Normal Context**: Verify dropdowns work in regular page flow
2. **Scrollable Containers**: Test inside containers with `overflow: auto` or `overflow: scroll`
3. **Limited Space**: Test near bottom/top of viewport (should flip automatically)
4. **Window Resize**: Verify dropdowns reposition correctly when window resizes
5. **Scrolling**: Verify dropdowns reposition when container or window scrolls
6. **Dark Theme**: Verify all styling works in dark mode
7. **Accessibility**: Test with keyboard navigation and screen readers

## Implementation Notes

- All components check `dropdownPosition` is not `null` before rendering portal
- Position calculations use Floating UI's internal optimization (requestAnimationFrame)
- Event listeners are properly cleaned up when dropdown closes via `autoUpdate`
- Portal mount/unmount is handled automatically by React
- Existing click-outside detection still works with portal rendering
- Floating UI middlewares are applied in order: offset → flip → shift → size
- The `size` middleware dynamically sets maxHeight inline, so CSS maxHeight is not needed

## Migration Guide

No migration needed! The changes are backward compatible. All existing usages of Select, DateInput, and Multiselect components work without modification.

## Floating UI Integration

This implementation uses **@floating-ui/react** (v0.27.16) for positioning.

### Why Floating UI?
- **Industry Standard**: Used by popular libraries like Headless UI, Radix UI, and Mantine
- **Battle-Tested**: Handles complex edge cases automatically
- **Maintainable**: Updates and improvements handled by the Floating UI team
- **Feature-Rich**: Extensive middleware system for customization
- **Performance**: Optimized for minimal recalculations

### Configuration
The current setup uses these middlewares:
```typescript
middleware: [
  offset(4),                    // 4px gap from trigger
  flip({                        // Flip when space is limited
    padding: 8,
    fallbackPlacements: ["top-start", "bottom-start"],
  }),
  shift({ padding: 8 }),       // Stay within viewport
  size({                        // Adjust height to fit
    padding: 8,
    apply({ availableHeight, elements }) {
      const constrainedHeight = Math.min(maxHeight, availableHeight);
      elements.floating.style.maxHeight = `${constrainedHeight}px`;
    },
  }),
]
```

## Future Enhancements

Potential improvements for future iterations:
1. Add animation for position changes (smooth transition when flipping) - use Floating UI's transition styles
2. Support for custom z-index override
3. Boundary element support (constrain dropdown within specific container) - use `boundary` option in shift/flip
4. Collision detection with other overlays
5. Touch device optimizations
6. Add `hide` middleware to detect when trigger is scrolled out of view
