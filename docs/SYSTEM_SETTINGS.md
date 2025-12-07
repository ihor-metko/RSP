# System Settings

This document defines the coding rules and conventions for the RSP project. **Before starting any task, developers must first check these system settings and follow the rules.**

## Quick Reference

| Setting | Rule |
|---------|------|
| CSS Class Prefix | `im-*` for all custom CSS classes |
| Sport Name | Always "Padel" (never "Paddle") |
| Colors | Use CSS variables from `globals.css` |
| Themes | Support both light and dark modes |
| HTML | Use semantic, accessible elements |
| Language | English for all code and comments |

## How to Use

Import the system settings module before implementing any new component or feature:

```typescript
import { systemSettings, imClass, cssVar } from '@/lib/system-settings';

// Generate prefixed class names
const buttonClass = imClass('button'); // Returns: "im-button"

// Use CSS variables
const primaryColor = cssVar('primary'); // Returns: "var(--rsp-primary)"
```

---

## Rules in Detail

### 1. CSS Class Naming Convention

**Rule:** Always use the prefix `im-*` for all custom CSS/HTML classes.

#### ✅ Correct Usage

```html
<div className="im-card im-card-header">
  <button className="im-button im-button-primary">Submit</button>
</div>
```

```css
.im-card {
  background-color: var(--rsp-card-bg);
}

.im-button {
  background-color: var(--rsp-primary);
}
```

#### ❌ Incorrect Usage

```html
<div className="card card-header">
  <button className="button button-primary">Submit</button>
</div>
```

#### Helper Functions

```typescript
import { imClass, imClasses } from '@/lib/system-settings';

// Single class
imClass('button'); // "im-button"

// Multiple classes
imClasses(['button', 'button-primary']); // "im-button im-button-primary"
```

---

### 2. Branding and Terminology

**Rule:** Always use the word "Padel" correctly (not "Paddle").

| ✅ Correct | ❌ Incorrect |
|------------|--------------|
| Padel | Paddle |
| Padel court | Paddle court |
| Padel club | Paddle club |

```typescript
import { BrandTerms } from '@/lib/system-settings';

// Access the correct sport name
const sportName = BrandTerms.SPORT_NAME; // "Padel"
```

---

### 3. Global Colors and Design Tokens

**Rule:** Always use project-defined CSS variables from the global CSS file. Do not hardcode colors.

#### Available CSS Variables

| Variable | Purpose |
|----------|---------|
| `--rsp-background` | Page background color |
| `--rsp-foreground` | Primary text color |
| `--rsp-primary` | Primary action color |
| `--rsp-primary-hover` | Primary hover state |
| `--rsp-secondary` | Secondary action color |
| `--rsp-secondary-hover` | Secondary hover state |
| `--rsp-border` | Border color |
| `--rsp-card-bg` | Card background color |
| `--rsp-accent` | Accent color |

#### ✅ Correct Usage

```css
.im-card {
  background-color: var(--rsp-card-bg);
  border: 1px solid var(--rsp-border);
  color: var(--rsp-foreground);
}

.im-button {
  background-color: var(--rsp-primary);
}

.im-button:hover {
  background-color: var(--rsp-primary-hover);
}
```

#### ❌ Incorrect Usage

```css
.im-card {
  background-color: #ffffff; /* Don't hardcode colors */
  border: 1px solid #e5e7eb; /* Use CSS variables instead */
}
```

#### TypeScript Helper

```typescript
import { cssVar } from '@/lib/system-settings';

// Get CSS variable reference
const bgColor = cssVar('primary'); // "var(--rsp-primary)"
```

---

### 4. Dark/Light Theme Support

**Rule:** All components must respect the theme variables.

The theme system uses the `.dark` class on the document root. CSS variables automatically adapt:

```css
:root {
  --rsp-background: #ffffff;
  --rsp-foreground: #0A0A0A;
}

.dark {
  --rsp-background: #0A0A0A;
  --rsp-foreground: #EAEAEA;
}
```

#### Theme Configuration

```typescript
import { ThemeConfig } from '@/lib/system-settings';

// Available themes
ThemeConfig.themes; // ["light", "dark"]

// Dark mode CSS class
ThemeConfig.darkModeClass; // "dark"
```

---

### 5. Semantic HTML and Accessibility

**Rule:** Maintain semantic, accessible HTML.

#### Use Semantic Elements

| Instead of | Use |
|------------|-----|
| `<div>` for navigation | `<nav>` |
| `<div>` for main content | `<main>` |
| `<div>` for header | `<header>` |
| `<div>` for footer | `<footer>` |
| `<div>` for article | `<article>` |

#### Accessibility Requirements

- **Images:** Always include `alt` text
- **Interactive elements:** Must be keyboard accessible
- **ARIA labels:** Include where needed for screen readers
- **Focus states:** Ensure visible focus indicators

---

### 6. Language Standards

**Rule:** Write all English text correctly and clearly in code, comments, and documentation.

- Use clear, concise English
- Use `camelCase` for variables
- Use `PascalCase` for components
- Write descriptive comments

---

## Module API Reference

### Constants

| Export | Description |
|--------|-------------|
| `CSSClassPrefix` | The class prefix (`"im-"`) |
| `BrandTerms` | Brand terminology object |
| `CSSVariables` | CSS variable names |
| `ThemeConfig` | Theme configuration |
| `AccessibilityGuidelines` | A11y guidelines |
| `CodeStyleGuidelines` | Code style rules |
| `systemSettings` | Combined settings object |

### Functions

| Function | Description |
|----------|-------------|
| `imClass(name)` | Generate prefixed class name |
| `imClasses(names[])` | Generate multiple prefixed class names |
| `cssVar(variable)` | Get CSS variable reference |
| `isValidCSSClassName(name)` | Validate class name format |
| `validateBrandTerminology(text)` | Check for incorrect brand terms |

---

## Updating These Rules

To add new rules:

1. Update `/src/lib/system-settings.ts` with new constants or functions
2. Update this documentation file
3. Increment the `version` in `systemSettings`
4. Update the `lastUpdated` date

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-01 | Initial release |
