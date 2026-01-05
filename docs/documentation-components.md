# Documentation Components Guide

This guide explains how to use the reusable documentation components in the ArenaOne project, specifically designed for the pre-sales and client documentation flow.

## Quick Start

Import components from the centralized `docs` module:

```tsx
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsCallout,
  DocsList,
  DocsNote,
  DocsCTA,
  DocsScreenshot,
  DocsRoleCard,
  DocsRoleGrid,
  DocsFeatureList,
  DocsSteps,
} from "@/components/ui/docs";
```

## Core Components

### DocsPage

Main wrapper for a documentation page. Provides layout and structure.

```tsx
<DocsPage title="Getting Started">
  {/* Page content */}
</DocsPage>
```

### DocsSection

Represents a major section on a documentation page.

```tsx
<DocsSection title="Overview">
  <p>This section covers the basics...</p>
</DocsSection>
```

### DocsSubsection

Represents a subsection within a DocsSection for better content hierarchy.

```tsx
<DocsSubsection title="Subtopic 1">
  <p>Details about subtopic 1...</p>
</DocsSubsection>
```

## Content Components

### DocsCallout

Highlighted callout box for emphasizing key points or benefits.

```tsx
<DocsCallout title="Key Benefit">
  This feature saves you hours of manual work every week.
</DocsCallout>
```

### DocsList

Bulleted or numbered lists styled consistently.

```tsx
{/* Simple list with items array */}
<DocsList 
  type="bulleted" 
  items={["Feature 1", "Feature 2", "Feature 3"]} 
/>

{/* Numbered list with children */}
<DocsList type="numbered">
  <li>First step with <strong>emphasis</strong></li>
  <li>Second step</li>
</DocsList>
```

### DocsNote

Highlighted note box with different types (info, warning, success).

```tsx
<DocsNote type="info">
  This is an informational note about the feature.
</DocsNote>

<DocsNote type="warning">
  Warning: This action cannot be undone.
</DocsNote>

<DocsNote type="success">
  Your setup is complete and ready to use!
</DocsNote>
```

### DocsFeatureList

Specialized list component for displaying product features with icons.

```tsx
<DocsFeatureList
  title="Key Features"
  features={[
    "Real-time court availability",
    "Automated booking confirmations",
    "Multi-club management"
  ]}
  icon="✓"
/>
```

### DocsSteps

Visually enhanced component for displaying step-by-step instructions with numbered steps.

```tsx
<DocsSteps
  steps={[
    {
      title: "Sign Up",
      description: "Create your account with email and password"
    },
    {
      title: "Configure Settings",
      description: "Set up your club preferences and working hours"
    },
    {
      title: "Go Live",
      description: "Publish your club and start accepting bookings"
    }
  ]}
/>
```

## Navigation Components

### DocsCTA

Call-to-action button for navigation.

```tsx
<DocsCTA href="/docs/getting-started">
  Get Started Now
</DocsCTA>

<DocsCTA href="/docs/overview" variant="secondary">
  Learn More
</DocsCTA>
```

### DocsSidebar

Sidebar navigation for documentation pages (used in layouts).

```tsx
<DocsSidebar 
  items={[
    { title: "Overview", href: "/docs/overview" },
    { title: "Getting Started", href: "/docs/getting-started" }
  ]}
  currentPath="/docs/overview"
/>
```

## Pre-Sales Specific Components

### DocsRoleCard

Card component for displaying user roles in pre-sales documentation.

```tsx
<DocsRoleCard
  name="Root Admin"
  description="Manage organizations and system settings"
  href="/docs/pre-sales/root-admin/overview"
  icon="👑"
/>
```

### DocsRoleGrid

Responsive grid container for displaying multiple DocsRoleCard components.

```tsx
<DocsRoleGrid
  roles={[
    {
      name: "Root Admin",
      description: "Manage the entire system",
      href: "/docs/pre-sales/root-admin/overview",
      icon: "👑"
    },
    {
      name: "Club Owner",
      description: "Manage your club",
      href: "/docs/pre-sales/club-owner/crud-courts",
      icon: "🎾"
    }
  ]}
/>
```

## Visual Components

### DocsScreenshot

Displays screenshots or visual placeholders in documentation.

```tsx
{/* With image */}
<DocsScreenshot 
  src="/images/screenshots/dashboard.png" 
  alt="Dashboard overview"
  caption="The main dashboard showing key metrics"
/>

{/* Placeholder mode (no src) */}
<DocsScreenshot 
  alt="Feature screenshot coming soon"
  caption="Screenshot will be added in the next update"
/>
```

## Complete Example

Here's a complete example showing how to build a pre-sales documentation page:

```tsx
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DocsPage,
  DocsSection,
  DocsSubsection,
  DocsCallout,
  DocsFeatureList,
  DocsNote,
  DocsCTA,
  DocsScreenshot,
} from "@/components/ui/docs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("docs.preSales.example");
  
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ExamplePage() {
  const t = await getTranslations("docs.preSales.example");
  
  return (
    <DocsPage title={t("title")}>
      <DocsSection title="Overview">
        <p>Introduction to this feature...</p>

        <DocsCallout title="Key Benefit">
          Save time and improve efficiency with this feature.
        </DocsCallout>

        <DocsSubsection title="Core Capabilities">
          <DocsFeatureList
            features={[
              "Automated workflows",
              "Real-time updates",
              "Comprehensive reporting",
            ]}
          />
        </DocsSubsection>

        <DocsNote type="info">
          This feature is available to all club administrators.
        </DocsNote>

        <DocsScreenshot
          alt="Feature Dashboard"
          caption="The feature dashboard provides a comprehensive overview"
        />

        <DocsCTA href="/docs/next-steps">
          Continue to Next Steps
        </DocsCTA>
      </DocsSection>
    </DocsPage>
  );
}
```

## Styling Conventions

All documentation components follow these conventions:

- Use `im-docs-*` prefix for all CSS classes
- Support both light and dark themes via CSS variables
- Use semantic class names (e.g., `im-docs-section-title`, `im-docs-callout-content`)
- Responsive design with mobile-first approach

## CSS Variables

Components use these CSS variables for theming:

- `--im-text-primary`: Primary text color
- `--im-text-secondary`: Secondary text color
- `--im-bg-primary`: Primary background color
- `--im-bg-secondary`: Secondary background color
- `--im-bg-tertiary`: Tertiary background color
- `--im-border-primary`: Border color
- `--im-accent-primary`: Accent color for highlights and CTAs

## Best Practices

1. **Use semantic structure**: Always wrap content in DocsSection components
2. **Add subsections for hierarchy**: Use DocsSubsection to create clear content hierarchy
3. **Emphasize key points**: Use DocsCallout for important benefits or features
4. **Provide visual context**: Include DocsScreenshot placeholders even if images aren't ready
5. **Guide users**: Always add DocsCTA buttons to guide users to the next step
6. **Use appropriate notes**: Choose the right DocsNote type (info, warning, success) for context
7. **List features clearly**: Use DocsFeatureList for product capabilities
8. **Centralized imports**: Always import from `@/components/ui/docs` for consistency
