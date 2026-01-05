# Documentation Components Usage Guide

This guide explains how to use the reusable documentation components created for ArenaOne's client-facing documentation.

## Available Components

### 1. DocsPage
Main wrapper component for documentation pages.

```tsx
import { DocsPage } from "@/components/ui/DocsPage";

<DocsPage 
  title="Your Page Title"
  sidebar={<YourSidebarContent />} // optional
>
  {/* Your page content */}
</DocsPage>
```

**Props:**
- `title` (string, required): The page title
- `sidebar` (ReactNode, optional): Optional sidebar content
- `children` (ReactNode, required): Page content
- `className` (string, optional): Additional CSS classes

### 2. DocsSection
Section container with title and content area.

```tsx
import { DocsSection } from "@/components/ui/DocsSection";

<DocsSection title="Section Title">
  <p>Your section content goes here...</p>
</DocsSection>
```

**Props:**
- `title` (string, required): The section title
- `children` (ReactNode, required): Section content
- `className` (string, optional): Additional CSS classes

### 3. DocsList
Bulleted or numbered lists.

```tsx
import { DocsList } from "@/components/ui/DocsList";

// Simple list with items array
<DocsList 
  type="bulleted" // or "numbered"
  items={["Item 1", "Item 2", "Item 3"]}
/>

// Complex list with children
<DocsList type="numbered">
  <li>First item with <strong>formatting</strong></li>
  <li>Second item</li>
</DocsList>
```

**Props:**
- `type` ("bulleted" | "numbered", optional, default: "bulleted"): List style
- `items` (string[], optional): Simple text items
- `children` (ReactNode, optional): For complex list items
- `className` (string, optional): Additional CSS classes

### 4. DocsNote
Highlighted note boxes for important information.

```tsx
import { DocsNote } from "@/components/ui/DocsNote";

// Info note (default)
<DocsNote type="info">
  This is an informational note.
</DocsNote>

// Warning note
<DocsNote type="warning">
  Warning: This action cannot be undone!
</DocsNote>
```

**Props:**
- `type` ("info" | "warning", optional, default: "info"): Note type
- `children` (ReactNode, required): Note content
- `className` (string, optional): Additional CSS classes

### 5. DocsCTA
Call-to-action button component.

```tsx
import { DocsCTA } from "@/components/ui/DocsCTA";

<DocsCTA href="/docs/getting-started">
  Get Started Now
</DocsCTA>
```

**Props:**
- `href` (string, required): URL to navigate to
- `children` (ReactNode, required): Button text/content
- `className` (string, optional): Additional CSS classes

## Complete Example

```tsx
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsList } from "@/components/ui/DocsList";
import { DocsNote } from "@/components/ui/DocsNote";
import { DocsCTA } from "@/components/ui/DocsCTA";

export default function MyDocPage() {
  return (
    <DocsPage title="Getting Started">
      <DocsSection title="Introduction">
        <p>Welcome to our documentation...</p>
      </DocsSection>

      <DocsSection title="Key Features">
        <DocsList 
          type="bulleted"
          items={[
            "Easy to use",
            "Fast performance",
            "Secure by default"
          ]}
        />
      </DocsSection>

      <DocsSection title="Important">
        <DocsNote type="info">
          Make sure to read the prerequisites before continuing.
        </DocsNote>
      </DocsSection>

      <DocsSection title="Next Steps">
        <p>Ready to begin?</p>
        <DocsCTA href="/docs/setup">
          Continue to Setup
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
```

## Styling

All components use `im-docs-*` semantic CSS classes that integrate with the ArenaOne dark theme:

- `im-docs-page` - Page wrapper
- `im-docs-section` - Section container
- `im-docs-list` - List styling
- `im-docs-note` - Note box styling
- `im-docs-cta` - CTA button styling

These classes automatically support dark mode through CSS variables like:
- `var(--im-text-primary)`
- `var(--im-text-secondary)`
- `var(--im-border)`
- `var(--im-surface)`
- `var(--im-primary)`

## Best Practices

1. **Always use DocsPage as the root wrapper** for documentation pages
2. **Structure content with DocsSection** for proper spacing and hierarchy
3. **Use DocsList** instead of plain `<ul>` or `<ol>` for consistent styling
4. **Highlight important information** with DocsNote (info/warning)
5. **Guide users to next actions** with DocsCTA buttons
6. **Import from @/components/ui** to ensure proper tree-shaking

## Example Page

See `/docs/for-clubs/components-example` for a live demonstration of all components.
