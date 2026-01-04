# Documentation Components Hierarchy

## Complete Component List

### Core Layout Components (Pre-existing)
```
DocsPage (Main page wrapper)
├── DocsSection (Major sections)
│   └── DocsSubsection (Subsections within sections)
└── DocsSidebar (Navigation sidebar)
```

### Content Components (Pre-existing)
```
DocsCallout (Highlighted callout boxes)
DocsList (Bulleted or numbered lists)
DocsNote (Info/Warning/Success notes)
DocsCTA (Call-to-action buttons)
DocsScreenshot (Screenshots and placeholders)
```

### Pre-Sales Specific Components (New)
```
DocsRoleCard (Individual role card)
DocsRoleGrid (Grid container for role cards)
DocsFeatureList (Feature list with icons)
DocsSteps (Step-by-step instructions)
```

## Component Count

- **Pre-existing components:** 9
- **New components:** 4
- **Total components:** 13

## Import Structure

### Before (scattered imports)
```tsx
import { DocsPage } from "@/components/ui/DocsPage";
import { DocsSection } from "@/components/ui/DocsSection";
import { DocsCallout } from "@/components/ui/DocsCallout";
// etc...
```

### After (centralized import)
```tsx
import {
  DocsPage,
  DocsSection,
  DocsCallout,
  DocsRoleCard,
  DocsRoleGrid,
  DocsFeatureList,
  DocsSteps,
} from "@/components/ui/docs";
```

## Component Dependencies

```
DocsRoleGrid
└── depends on: DocsRoleCard

DocsRoleCard
└── depends on: IMLink

DocsFeatureList
└── depends on: DocsList

DocsCTA
└── depends on: IMLink

DocsSidebar
└── depends on: IMLink, next-intl (useTranslations)
```

## Typical Page Structure

```tsx
<DocsPage title="Page Title">
  <DocsSection title="Section 1">
    <p>Introduction text</p>
    
    <DocsCallout title="Key Point">
      Important information
    </DocsCallout>
    
    <DocsSubsection title="Subsection">
      <DocsFeatureList
        title="Features"
        features={["Feature 1", "Feature 2"]}
      />
    </DocsSubsection>
    
    <DocsNote type="info">
      Additional information
    </DocsNote>
    
    <DocsScreenshot
      alt="Screenshot description"
      caption="Caption text"
    />
    
    <DocsCTA href="/next-page">
      Continue to Next Page
    </DocsCTA>
  </DocsSection>
</DocsPage>
```

## Role-Based Landing Page Structure

```tsx
<DocsPage title="Pre-Sales Documentation">
  <DocsSection title="Overview">
    <p>Introduction</p>
  </DocsSection>
  
  <DocsSection title="Select Your Role">
    <DocsRoleGrid
      roles={[
        {
          name: "Root Admin",
          description: "Manage the entire system",
          href: "/docs/pre-sales/root-admin/overview",
          icon: "👑"
        },
        // More roles...
      ]}
    />
  </DocsSection>
</DocsPage>
```

## Step-by-Step Guide Structure

```tsx
<DocsPage title="Create Organization">
  <DocsSection title="Getting Started">
    <DocsCallout title="Prerequisites">
      You need Root Admin access
    </DocsCallout>
    
    <DocsSteps
      steps={[
        {
          title: "Step 1",
          description: "Description of step 1"
        },
        {
          title: "Step 2",
          description: "Description of step 2"
        },
      ]}
    />
    
    <DocsNote type="success">
      You're all set!
    </DocsNote>
    
    <DocsCTA href="/next-guide">
      Next: Configure Settings
    </DocsCTA>
  </DocsSection>
</DocsPage>
```

## CSS Class Hierarchy

All components follow the `im-docs-*` naming convention:

```
im-docs-page
├── im-docs-page-title
├── im-docs-page-sidebar
└── im-docs-page-content

im-docs-section
├── im-docs-section-title
└── im-docs-section-content

im-docs-subsection
├── im-docs-subsection-title
└── im-docs-subsection-content

im-docs-callout
├── im-docs-callout-title
└── im-docs-callout-content

im-docs-list
└── im-docs-list-item

im-docs-note
├── im-docs-note-icon
└── im-docs-note-content

im-docs-cta
├── im-docs-cta--primary
└── im-docs-cta--secondary

im-docs-screenshot
├── im-docs-screenshot-container
├── im-docs-screenshot-image
├── im-docs-screenshot-placeholder
└── im-docs-screenshot-caption

im-docs-role-grid

im-docs-role-card
├── im-docs-role-card-icon
├── im-docs-role-card-title
└── im-docs-role-card-description

im-docs-feature-list
├── im-docs-feature-list-title
├── im-docs-feature-list-items
├── im-docs-feature-list-item
├── im-docs-feature-list-icon
└── im-docs-feature-list-text

im-docs-steps

im-docs-step
├── im-docs-step-number
├── im-docs-step-content
├── im-docs-step-title
└── im-docs-step-description
```

## Color Variables Used

All components use CSS variables for theming:

- `--im-text-primary` - Primary text
- `--im-text-secondary` - Secondary text
- `--im-text-on-accent` - Text on accent backgrounds
- `--im-bg-primary` - Primary background
- `--im-bg-secondary` - Secondary background
- `--im-bg-tertiary` - Tertiary background
- `--im-border-primary` - Borders
- `--im-accent-primary` - Accent color
- `--im-accent-primary-rgb` - Accent color RGB values

## Component Characteristics

| Component | Interactive | Responsive | Icons | Theme Support |
|-----------|-------------|------------|-------|---------------|
| DocsPage | No | Yes | No | Yes |
| DocsSection | No | Yes | No | Yes |
| DocsSubsection | No | Yes | No | Yes |
| DocsCallout | No | Yes | No | Yes |
| DocsList | No | Yes | No | Yes |
| DocsNote | No | Yes | Yes | Yes |
| DocsCTA | Yes | Yes | No | Yes |
| DocsScreenshot | No | Yes | Yes | Yes |
| DocsSidebar | Yes | Yes | No | Yes |
| DocsRoleCard | Yes | Yes | Yes | Yes |
| DocsRoleGrid | No | Yes | No | Yes |
| DocsFeatureList | No | Yes | Yes | Yes |
| DocsSteps | No | Yes | Yes | Yes |
