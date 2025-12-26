# Entity Page Layout System

## Overview
The entity page layout system provides a unified, consistent layout structure for all entity detail pages (Organization, Club, Court) across the ArenaOne platform.

## Purpose
- Ensure consistent padding and spacing across all entity pages
- Provide a single source of truth for entity page layouts
- Make it easy to maintain and evolve the layout system
- Support page-specific customization through modifier classes

## Base Class

### `.entity-page-content`
The main container class for entity page content, applied immediately below the `EntityBanner` component.

**Default Styles:**
- Padding: `px-4 md:px-8 py-6 md:py-8` (responsive)
- Max-width: `1400px`
- Centering: `margin: 0 auto`

**Usage:**
```tsx
<main className="entity-page">
  <EntityBanner {...bannerProps} />
  
  <div className="entity-page-content">
    {/* Your page content here */}
  </div>
</main>
```

## Modifier Classes

### `.entity-page-content--compact`
For pages that need tighter vertical spacing.
- Reduces padding: `py-4 md:py-6`

**Usage:**
```tsx
<div className="entity-page-content entity-page-content--compact">
  {/* Compact layout content */}
</div>
```

### `.entity-page-content--narrow`
For pages that need less width (e.g., court detail page).
- Max-width: `1200px`

**Usage:**
```tsx
<div className="entity-page-content entity-page-content--narrow">
  {/* Narrower layout content */}
</div>
```

### `.entity-page-content--wide`
For pages that need more width.
- Max-width: `1600px`

**Usage:**
```tsx
<div className="entity-page-content entity-page-content--wide">
  {/* Wider layout content */}
</div>
```

### `.entity-page-content--full`
For pages that need full width (no max-width constraint).
- Max-width: `none`

**Usage:**
```tsx
<div className="entity-page-content entity-page-content--full">
  {/* Full width content */}
</div>
```

## Current Implementation

### Admin Pages
- **Organization Detail** (`/admin/organizations/[orgId]`): Uses base `.entity-page-content`
- **Club Detail** (`/admin/clubs/[id]`): Uses base `.entity-page-content`
- **Court Detail** (`/admin/courts/[courtId]`): Uses `.entity-page-content.entity-page-content--narrow`

### Player Pages
- **Club Detail** (`/clubs/[id]`): Uses base `.entity-page-content`

## Deprecated Classes (Backward Compatibility)

The following classes are deprecated but remain functional for backward compatibility:

- `.rsp-club-content` - Use `.entity-page-content` instead
- `.im-admin-club-content` - Use `.entity-page-content` instead
- `.im-court-detail-container` - Use `.entity-page-content.entity-page-content--narrow` instead

These classes will be removed in a future update. Please migrate to the new system.

## Best Practices

1. **Always use `entity-page-content`** for new entity pages
2. **Keep EntityBanner untouched** - This class only affects the content below the banner
3. **Use modifiers sparingly** - Only when the default layout doesn't meet specific needs
4. **Combine modifiers if needed** - e.g., `entity-page-content entity-page-content--narrow entity-page-content--compact`
5. **Maintain consistency** - Use the same modifier across similar pages

## Migration Guide

### From `.rsp-club-content` or `.im-admin-club-content`

**Before:**
```tsx
import "@/components/ClubDetailPage.css";

<div className="rsp-club-content">
  {/* content */}
</div>
```

**After:**
```tsx
import "@/components/ClubDetailPage.css";
import "@/components/EntityPageLayout.css";

<div className="entity-page-content">
  {/* content */}
</div>
```

### From `.im-court-detail-container`

**Before:**
```tsx
<div className="im-court-detail-container">
  {/* content */}
</div>
```

**After:**
```tsx
import "@/components/EntityPageLayout.css";

<div className="entity-page-content entity-page-content--narrow">
  {/* content */}
</div>
```

## File Location
`/src/components/EntityPageLayout.css`

## Related Components
- `EntityBanner` - Hero banner component for entity pages
- Entity detail pages (Organization, Club, Court)

## Future Enhancements
- Additional modifier classes as needed (e.g., `--dense`, `--spacious`)
- Dark mode specific adjustments
- Print-friendly layouts
