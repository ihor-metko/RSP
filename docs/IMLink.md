# IMLink Component

A reusable link component that extends Next.js Link with consistent styling and the ability to appear as a button while maintaining link semantics.

## Features

- **Semantic**: Uses proper `<Link>` element for navigation
- **Versatile**: Can be styled as a regular link or as a button
- **Theme-aware**: Adapts to light and dark themes using CSS variables
- **Accessible**: Maintains link semantics even when styled as a button
- **Consistent**: Uses `im-*` CSS classes following platform conventions
- **Reusable**: Works across player and admin pages

## Usage

### Import

```tsx
import { IMLink } from "@/components/ui";
// or
import { IMLink } from "@/components/ui/IMLink";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `href` | `string` | Yes | - | Navigation destination URL |
| `children` | `React.ReactNode` | Yes | - | Link content (text, icons, etc.) |
| `className` | `string` | No | `""` | Additional CSS classes |
| `asButton` | `boolean` | No | `false` | Style the link as a button |
| `variant` | `"primary" \| "outline" \| "danger"` | No | `"primary"` | Button style variant (only applies when `asButton` is `true`) |
| `size` | `"small" \| "medium"` | No | `"medium"` | Button size (only applies when `asButton` is `true`) |
| `...props` | `LinkProps` | No | - | All other Next.js Link props |

## Examples

### Regular Link (Default)

```tsx
<IMLink href="/clubs">View All Clubs</IMLink>
```

### Link in Navigation

```tsx
<nav>
  <IMLink href="/">Home</IMLink>
  <IMLink href="/clubs">Clubs</IMLink>
  <IMLink href="/bookings">My Bookings</IMLink>
</nav>
```

### Button-Styled Link (Primary)

```tsx
<IMLink href="/admin/clubs/new" asButton variant="primary">
  Create Club
</IMLink>
```

### Button-Styled Link (Outline)

```tsx
<IMLink href="/clubs/export" asButton variant="outline">
  Export Data
</IMLink>
```

### Button-Styled Link (Danger)

```tsx
<IMLink href="/admin/clubs/delete" asButton variant="danger">
  Delete Club
</IMLink>
```

### Small Button-Styled Link

```tsx
<IMLink href="/settings" asButton variant="outline" size="small">
  Settings
</IMLink>
```

### With Custom ClassName

```tsx
<IMLink href="/clubs" className="my-custom-class">
  View Clubs
</IMLink>

<IMLink href="/admin/clubs/new" asButton variant="primary" className="w-full">
  Create Club
</IMLink>
```

## Real-World Examples

### Admin Page Actions

```tsx
import { PageHeader, Button, IMLink } from "@/components/ui";

function AdminClubsPage() {
  return (
    <main>
      <PageHeader
        title="Admin - Clubs"
        description="Manage all padel clubs"
      />
      
      <div className="im-admin-clubs-actions-right">
        <Button onClick={handleQuickCreate} variant="outline">
          Quick Create
        </Button>
        <IMLink href="/admin/clubs/new" asButton variant="primary">
          Create Club
        </IMLink>
      </div>
      
      {/* Page content */}
    </main>
  );
}
```

### Club Card Actions

```tsx
function ClubCard({ club }: { club: Club }) {
  return (
    <div className="club-card">
      <h3>{club.name}</h3>
      <p>{club.location}</p>
      
      <div className="club-card-actions">
        <IMLink href={`/clubs/${club.id}`} asButton variant="primary">
          View Details
        </IMLink>
        <IMLink href={`/clubs/${club.id}/book`} asButton variant="outline">
          Book Court
        </IMLink>
      </div>
    </div>
  );
}
```

### Mixed Actions (Buttons and Links)

```tsx
function CourtManagement({ clubId }: { clubId: string }) {
  return (
    <div className="actions-bar">
      {/* Button for modal/in-page action */}
      <Button onClick={handleQuickCreate} variant="outline">
        Quick Create
      </Button>
      
      {/* Link for navigation to new page */}
      <IMLink href={`/admin/clubs/${clubId}/courts/new`} asButton variant="primary">
        Create Court
      </IMLink>
    </div>
  );
}
```

## CSS Classes

### Regular Link

| Class | Description |
|-------|-------------|
| `.im-link` | Base link styling with primary color and hover effects |

### Button-Styled Link

| Class | Description |
|-------|-------------|
| `.im-link--button` | Base button styling |
| `.im-link--button-outline` | Outline variant styling |
| `.im-link--button-danger` | Danger variant styling |
| `.im-link--button-small` | Small size styling |

## CSS Variables

The component uses these CSS variables for theming:

```css
:root {
  --rsp-primary: #1ABC9C;
  --rsp-primary-hover: #16A085;
  --rsp-accent: #0A0A0A;
  --rsp-foreground: #0A0A0A;
  --rsp-border: #e5e7eb;
  --rsp-card-bg: #f9fafb;
}

.dark {
  /* Dark mode variables automatically applied */
}
```

## When to Use Button vs Link

### Use Button (`<Button>`)
- Triggering in-page actions (opening modals, submitting forms, etc.)
- Actions that don't navigate to a new page
- Examples: "Quick Create", "Delete", "Submit"

### Use Button-Styled Link (`<IMLink asButton>`)
- Navigating to a new page or route
- Actions that change the URL
- Examples: "Create Club", "View Details", "Settings"
- Benefits: Better SEO, works with browser navigation, accessible as links

## Accessibility

- **Link Semantics**: Even when styled as a button, the component uses a proper `<a>` tag, making it accessible as a link
- **Keyboard Navigation**: Supports standard link keyboard interactions (Enter key, Cmd/Ctrl+Click)
- **Screen Readers**: Announced as a link, not a button
- **Focus Visible**: Provides clear focus indicators for keyboard navigation

## Design Patterns

### Primary Action

```tsx
<IMLink href="/admin/clubs/new" asButton variant="primary">
  Create New Club
</IMLink>
```

### Secondary Action

```tsx
<IMLink href="/admin/clubs/export" asButton variant="outline">
  Export Data
</IMLink>
```

### Destructive Action

```tsx
<IMLink href="/admin/clubs/123/delete" asButton variant="danger">
  Delete Club
</IMLink>
```

### Navigation Link

```tsx
<IMLink href="/clubs">Browse Clubs</IMLink>
```

## Backwards Compatibility

The component maintains full backwards compatibility. Existing code using IMLink without the `asButton` prop will continue to work as regular links:

```tsx
// Old code still works
<IMLink href="/clubs">View Clubs</IMLink>

// New button-styled usage
<IMLink href="/clubs" asButton variant="primary">View Clubs</IMLink>
```
