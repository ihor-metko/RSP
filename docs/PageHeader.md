# PageHeader Component

A universal, reusable page header component for both player and admin pages in the ArenaOne platform.

## Features

- **Universal**: Works consistently across player and admin pages
- **Theme-aware**: Adapts to light and dark themes using CSS variables
- **Responsive**: Proper spacing for mobile and desktop layouts
- **Accessible**: Uses semantic HTML elements (`<header>`, `<h1>`)
- **Semantic CSS**: Uses `im-*` CSS classes for styling

## Usage

### Import

```tsx
import { PageHeader } from "@/components/ui";
// or
import { PageHeader } from "@/components/ui/PageHeader";
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Main page title |
| `description` | `string` | No | Short subtitle or description |
| `actions` | `React.ReactNode` | No | Buttons or other interactive elements |
| `className` | `string` | No | Additional CSS classes for the container |

## Examples

### Basic Title Only

```tsx
<PageHeader title="Clubs" />
```

### With Description

```tsx
<PageHeader
  title="My Bookings"
  description="View and manage your court reservations"
/>
```

### Player Page Example

```tsx
import { PageHeader, Button, IMLink } from "@/components/ui";

function PlayerClubsPage() {
  return (
    <main className="p-8">
      <PageHeader
        title="Clubs"
        description="Find and book padel courts at the best clubs near you"
        actions={
          <IMLink href="/clubs/search" asButton variant="primary">
            Search Clubs
          </IMLink>
        }
      />
      {/* Page content */}
    </main>
  );
}
```

### Admin Page Example

```tsx
import { PageHeader, Button, IMLink } from "@/components/ui";

function AdminClubsPage() {
  return (
    <main className="p-8">
      <PageHeader
        title="Admin - Clubs"
        description="Manage all padel clubs"
        actions={
          <>
            <Button variant="outline" onClick={handleQuickCreate}>
              Quick Create
            </Button>
            <IMLink href="/admin/clubs/new" asButton variant="primary">
              Create Club
            </IMLink>
          </>
        }
      />
      {/* Page content */}
    </main>
  );
}
```

### Booking Page Example

```tsx
import { PageHeader, Button } from "@/components/ui";

function BookingsOverview() {
  return (
    <main className="p-8">
      <PageHeader
        title="Bookings"
        description="All your upcoming and past bookings"
        actions={
          <>
            <Button variant="outline">Export</Button>
            <Button>New Booking</Button>
          </>
        }
      />
      {/* Bookings list */}
    </main>
  );
}
```

### Coach Management Example

```tsx
import { PageHeader, Button } from "@/components/ui";

function CoachManagement() {
  return (
    <main className="p-8">
      <PageHeader
        title="Coach Management"
        description="Manage coaches and their availability"
        actions={
          <Button>Add Coach</Button>
        }
      />
      {/* Coaches table */}
    </main>
  );
}
```

## CSS Classes

The component uses the following semantic CSS classes:

| Class | Description |
|-------|-------------|
| `.im-page-header` | Main container |
| `.im-page-header-content` | Content wrapper for title and description |
| `.im-title` | Page title (h1 element) |
| `.im-description` | Subtitle/description paragraph |
| `.im-actions` | Actions container for buttons/links |

## CSS Variables

The component uses these CSS variables for theming:

```css
:root {
  --im-page-header-bg: transparent;
  --im-page-header-text: var(--rsp-foreground);
  --im-page-header-border: var(--rsp-border);
}
```

The description uses Tailwind's `text-gray-500` (light mode) and `text-gray-400` (dark mode) for muted text styling, consistent with other components in the codebase.

## Responsive Behavior

- **Desktop (≥768px)**: Title/description and actions displayed side-by-side
- **Mobile (<768px)**: Title/description stacked on top, actions below with full-width option
