# Entity Colors System

## Overview

The Entity Colors system provides centralized color definitions for all entities in the ArenaOne application. This ensures consistent visual representation across cards, badges, list items, calendar blocks, and any other UI element representing an entity.

## Color Palette

| Entity | Color | Hex Code | Purpose |
|--------|-------|----------|---------|
| **Organization** | Blue | `#3b82f6` | Professional, trustworthy |
| **Club** | Emerald | `#10b981` | Growth, active community |
| **Court** | Amber | `#f59e0b` | Action, energy |
| **Booking** | Red | `#ef4444` | Important, attention-grabbing |

## Usage

### 1. Using the Badge Component

The simplest way to apply entity colors is through the Badge component:

```tsx
import { Badge } from "@/components/ui";

// Entity-specific badge
<Badge entityType="club">Club Name</Badge>
<Badge entityType="organization">Organization Name</Badge>
<Badge entityType="court">Court Name</Badge>
<Badge entityType="booking">Booking #123</Badge>
```

### 2. Using CSS Classes

Apply entity colors using predefined CSS classes:

```tsx
// Badge classes
<span className="entity-badge-organization">Organization</span>
<span className="entity-badge-club">Club</span>

// Card classes (adds left border accent)
<div className="entity-card-organization">Organization Card</div>
<div className="entity-card-club">Club Card</div>
```

### 3. Using CSS Variables

Reference entity colors in your CSS files:

```css
.my-component {
  /* Base colors */
  border-color: var(--entity-color-organization);
  background-color: var(--entity-color-club-light);
  
  /* Text colors */
  color: var(--entity-color-court-text);
  
  /* Border colors */
  border: 1px solid var(--entity-color-booking-border);
}
```

### 4. Using React Hooks

For dynamic styling in React components:

```tsx
import { useEntityColor, useEntityStyles } from "@/hooks/useEntityColor";

function MyComponent() {
  // Get color variants
  const colors = useEntityColor("club");
  
  return (
    <div style={{
      backgroundColor: colors.light,
      borderColor: colors.base,
      color: colors.text
    }}>
      Club Content
    </div>
  );
}
```

```tsx
// Pre-built style objects
const styles = useEntityStyles("organization");

<div style={styles.badge}>Badge</div>
<div style={styles.accent}>Card with accent</div>
```

### 5. Direct Import

For non-React contexts or utility functions:

```tsx
import { ENTITY_COLORS, getEntityColorValue } from "@/constants/entityColors";

// Direct access
const clubColor = ENTITY_COLORS.club; // "#10b981"

// Using helper function
const orgColor = getEntityColorValue("organization"); // "#3b82f6"
```

## Available Hooks

### `useEntityColor(entityType)`

Returns color variants for a given entity type:

```tsx
const colors = useEntityColor("club");
// Returns:
// {
//   base: "#10b981",
//   light: "#d1fae5",
//   dark: "rgba(16, 185, 129, 0.15)",
//   text: "#065f46",
//   textDark: "#6ee7b7",
//   cssVar: "var(--entity-color-club)",
//   cssVarLight: "var(--entity-color-club-light)",
//   cssVarText: "var(--entity-color-club-text)",
//   cssVarBorder: "var(--entity-color-club-border)"
// }
```

### `useEntityStyles(entityType)`

Returns pre-built style objects:

```tsx
const styles = useEntityStyles("court");
// Returns:
// {
//   badge: { backgroundColor, color, border },
//   border: { borderColor },
//   text: { color },
//   background: { backgroundColor },
//   accent: { borderLeftColor, borderLeftWidth, borderLeftStyle }
// }
```

### `useEntityClassName(entityType, variant)`

Generates CSS class names:

```tsx
const badgeClass = useEntityClassName("organization", "badge");
// Returns: "entity-badge-organization"

const cardClass = useEntityClassName("club", "card");
// Returns: "entity-card-club"
```

## CSS Classes Reference

### Badge Classes
- `entity-badge-organization` - Blue badge for organizations
- `entity-badge-club` - Emerald badge for clubs
- `entity-badge-court` - Amber badge for courts
- `entity-badge-booking` - Red badge for bookings

### Card Classes
- `entity-card-organization` - Adds blue left border accent
- `entity-card-club` - Adds emerald left border accent
- `entity-card-court` - Adds amber left border accent
- `entity-card-booking` - Adds red left border accent

## Dark Mode Support

All entity colors automatically adjust for dark mode:
- Background colors become more transparent
- Text colors are lightened for better contrast
- Border colors remain consistent

The system uses CSS custom properties that are overridden in dark mode, ensuring seamless theme transitions.

## Files

### Core Files
- `src/constants/entityColors.ts` - Color definitions and TypeScript types
- `src/app/globals.css` - CSS custom properties and utility classes
- `src/hooks/useEntityColor.ts` - React hooks for dynamic styling
- `src/components/ui/Badge.tsx` - Badge component with entity color support

### Demo & Documentation
- `src/components/examples/EntityColorsDemo.tsx` - Visual demonstration
- `docs/ENTITY_COLORS.md` - This documentation file

## Migration Guide

### Updating Existing Components

1. **Replace hardcoded colors** with entity colors:
   ```tsx
   // Before
   <div style={{ borderColor: "#10b981" }}>Club</div>
   
   // After
   <div style={{ borderColor: "var(--entity-color-club)" }}>Club</div>
   ```

2. **Update component CSS files**:
   ```css
   /* Before */
   .club-card {
     border-color: #10b981;
   }
   
   /* After */
   .club-card {
     border-color: var(--entity-color-club);
   }
   ```

3. **Use Badge component** for entity labels:
   ```tsx
   // Before
   <span className="bg-blue-500 text-white px-2 py-1 rounded">
     Organization
   </span>
   
   // After
   <Badge entityType="organization">Organization</Badge>
   ```

## Best Practices

1. **Consistency**: Always use entity colors for entity-related UI elements
2. **Accessibility**: Entity colors are chosen for good contrast ratios
3. **Maintainability**: Update colors in one place (`entityColors.ts`) instead of scattered throughout the codebase
4. **Semantic Usage**: Use entity colors only for their respective entities
5. **Dark Mode**: Always test entity colors in both light and dark modes

## Future Enhancements

The entity colors system is designed to support:
- Organization-specific color overrides (configured per organization)
- Dynamic color generation based on entity properties
- Additional entity types as the application grows
- Color theme customization at the organization level

## Support

For questions or issues related to the entity colors system:
1. Check this documentation
2. Review the demo component (`EntityColorsDemo.tsx`)
3. Examine existing implementations in card components
4. Consult the `.github/copilot-settings.md` for project guidelines
