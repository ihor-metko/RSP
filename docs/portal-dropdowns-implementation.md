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
A custom hook that calculates optimal positioning for portal-rendered dropdowns.

**Features:**
- Calculates position based on trigger element's bounding rect
- Automatically flips dropdown above trigger if not enough space below
- Recalculates position on scroll and resize
- Returns `null` when dropdown is closed (no unnecessary calculations)
- Configurable offset, max height, and width matching

**Parameters:**
- `triggerRef`: Reference to the trigger element
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
  maxHeight: number;  // Actual max height based on available space
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

1. **No Internal Scrolling**: Dropdowns render outside scrollable containers, preventing internal scrolling
2. **True Overlay Behavior**: Dropdowns appear above all content with `z-index: 9999`
3. **No Clipping**: Dropdowns are never clipped by `overflow: hidden` containers
4. **Smart Positioning**: Automatically flips above trigger when space is limited below
5. **Responsive**: Recalculates position on scroll and resize
6. **Consistent UX**: Behaves like modal/popover components
7. **Dark Theme Support**: All existing dark theme styles preserved
8. **Accessibility**: All ARIA attributes and keyboard interactions maintained

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
- Position calculations use `requestAnimationFrame` for smooth updates
- Event listeners are properly cleaned up when dropdown closes
- Portal mount/unmount is handled automatically by React
- Existing click-outside detection still works with portal rendering

## Migration Guide

No migration needed! The changes are backward compatible. All existing usages of Select, DateInput, and Multiselect components work without modification.

## Future Enhancements

Potential improvements for future iterations:
1. Add animation for position changes (smooth transition when flipping)
2. Support for custom z-index override
3. Boundary element support (constrain dropdown within specific container)
4. Collision detection with other overlays
5. Touch device optimizations
