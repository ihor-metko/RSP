# Operations Page Club Card Selector

## Overview

The Operations page now uses a card-based club selector instead of a dropdown menu, providing a more visual and user-friendly way to select clubs.

## Implementation

### Component: `OperationsClubCardSelector`

Location: `src/components/club-operations/OperationsClubCardSelector.tsx`

This component displays clubs as clickable cards, reusing the existing `AdminClubCard` component for consistency.

#### Features:

1. **Visual Card Display**: Shows clubs with images, names, addresses, and metadata
2. **Role-Based Filtering**: 
   - Root Admins see all clubs
   - Organization Admins see only clubs in their managed organizations
   - Club Admins see only their assigned club(s)
3. **Selection State**: Selected club is visually highlighted with an animated border and checkmark icon
4. **Responsive Layout**: Grid adapts from 1 to 4 columns based on screen size
5. **Accessibility**: 
   - Keyboard navigable (Enter and Space keys)
   - Screen reader friendly with ARIA attributes
   - Focus states for keyboard navigation
6. **Data Fetching**: Uses Zustand store to fetch clubs (no redundant API calls)

### Usage

The card selector is displayed on the Operations page when no club is currently selected. Once a club is selected, the traditional dropdown is shown in the controls section for quick switching.

```tsx
<OperationsClubCardSelector
  value={selectedClubId}
  onChange={handleClubChange}
/>
```

### Styling

CSS file: `src/components/club-operations/OperationsClubCardSelector.css`

- Follows the existing `im-*` class naming convention
- Supports dark mode
- Uses CSS variables defined in `globals.css`
- Responsive grid layout using Tailwind CSS utilities

### Testing

Tests: `src/__tests__/operations-club-card-selector.test.tsx`

Covers:
- Rendering club cards
- Click handling
- Keyboard navigation (Enter and Space)
- Selection highlighting
- Accessibility attributes

## User Experience

### Before
- Simple dropdown selector
- Text-only club names
- No visual preview of clubs

### After
- Visual card display with images
- Club metadata visible (address, stats, organization)
- More engaging and intuitive selection process
- Easier to distinguish between clubs visually

## Technical Details

### Dependencies
- `AdminClubCard`: Reused component from Admin Clubs page
- `useClubStore`: Zustand store for club data
- `useUserStore`: Zustand store for user/admin role information
- `CardListSkeleton`: Loading state component

### Responsive Breakpoints
- < 640px: 1 column
- 640px - 1023px: 2 columns
- 1024px - 1279px: 3 columns
- ≥ 1280px: 4 columns

### Accessibility Features
- `role="button"`: Marks cards as interactive buttons
- `tabindex="0"`: Makes cards keyboard focusable
- `aria-pressed`: Indicates selected state
- `aria-label`: Provides descriptive labels for screen readers
- Focus ring on keyboard focus
- Keyboard navigation with Enter and Space keys
