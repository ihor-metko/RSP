# Translation System Documentation

## Overview

ArenaOne uses `next-intl` for internationalization (i18n) with support for multiple languages. Currently supported languages are:
- **English (en)** - Default language
- **Ukrainian (uk)**

## File Structure

```
/locales
  ├── en.json    # English translations
  └── uk.json    # Ukrainian translations

/src/i18n
  ├── config.ts  # i18n configuration
  ├── server.ts  # Server-side translation utilities
  ├── client.ts  # Client-side translation utilities
  └── request.ts # Request-level translation handling
```

## Using Translations

### In Client Components

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <p>{t("mySection.description")}</p>
    </div>
  );
}
```

### In Server Components

```tsx
import { getTranslations } from "next-intl/server";

export default async function MyServerComponent() {
  const t = await getTranslations();
  
  return (
    <div>
      <h1>{t("common.title")}</h1>
      <p>{t("mySection.description")}</p>
    </div>
  );
}
```

### With Namespaces (Scoped Translations)

```tsx
const t = useTranslations("admin.clubs");

// Now you can use shorter keys
t("title")  // instead of t("admin.clubs.title")
t("subtitle")  // instead of t("admin.clubs.subtitle")
```

### With Parameters

```tsx
// Translation key: "greeting": "Hello, {name}!"
t("greeting", { name: "John" })  // Output: "Hello, John!"

// Translation key: "slideOf": "Slide {current} of {total}"
t("slideOf", { current: 2, total: 5 })  // Output: "Slide 2 of 5"
```

## Translation Key Structure

The locale files follow a hierarchical structure:

```json
{
  "common": {
    // Common translations used across the app
    "loading": "Loading...",
    "error": "Error",
    "save": "Save"
  },
  "admin": {
    "clubs": {
      "title": "Clubs",
      "subtitle": "Manage all padel clubs"
    },
    "courts": {
      "new": {
        "title": "New Court",
        "steps": {
          "basic": "Basic",
          "pricing": "Pricing"
        }
      }
    }
  }
}
```

## Adding New Translations

### 1. Add Keys to English File

Edit `/locales/en.json`:

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature description",
    "button": "Click Me"
  }
}
```

### 2. Add Ukrainian Translations

Edit `/locales/uk.json` with corresponding Ukrainian translations:

```json
{
  "myFeature": {
    "title": "Моя функція",
    "description": "Це опис моєї функції",
    "button": "Натисни мене"
  }
}
```

### 3. Use in Your Component

```tsx
const t = useTranslations("myFeature");

return (
  <div>
    <h1>{t("title")}</h1>
    <p>{t("description")}</p>
    <button>{t("button")}</button>
  </div>
);
```

## Naming Conventions

1. **Use camelCase** for translation keys: `myFeatureName`, not `my-feature-name`
2. **Group related translations** under a common namespace
3. **Be descriptive** but concise: `createButton` not just `btn`
4. **Consistent terminology**: Use the same terms across all translations (e.g., always "Booking" not sometimes "Reservation")

## Common Translation Sections

### Common (`common`)
- Basic UI elements: buttons, labels, actions
- Status messages: loading, error, success
- Time/date formats: days, minutes, hours

### Admin (`admin`)
- Dashboard elements
- CRUD operations (Create, Read, Update, Delete)
- Form fields and validation messages
- Admin-specific UI

### Authentication (`auth`)
- Login/logout messages
- Registration forms
- Password reset

### Clubs (`clubs`, `clubDetail`)
- Club listing and details
- Club information display

### Courts (`admin.courts`)
- Court management
- Court creation wizard
- Court types and surfaces

### Booking (`booking`)
- Booking forms
- Time slot selection
- Booking status

## Best Practices

1. **Always use translations** for user-facing text
2. **Test in both languages** to ensure translations render correctly
3. **Keep translations up to date** when adding new features
4. **Use parameters** for dynamic content instead of string concatenation
5. **Avoid hardcoded text** in components
6. **Group related translations** logically in the JSON structure
7. **Use common keys** for repeated text across the app

## Troubleshooting

### Missing Translation Warnings

If you see warnings about missing translations:

1. Check if the key exists in `/locales/en.json`
2. Verify the key path is correct: `admin.clubs.title` not `admin.club.title`
3. Ensure you're using the correct namespace with `useTranslations()`

### Translation Not Updating

1. Restart the development server
2. Clear Next.js cache: `rm -rf .next`
3. Rebuild: `npm run build`

### Adding New Language

1. Create new locale file: `/locales/[lang].json`
2. Add language to config: `/src/i18n/config.ts`
3. Copy structure from `en.json` and translate
4. Update language selector if needed

## Examples

### Court Creation Page

The court creation page is a comprehensive example showing:
- Multi-step wizard with translated step names
- Form fields with translated labels and placeholders
- Validation messages
- Error handling
- Dynamic content (court types, surfaces, currencies)

See: `src/app/(pages)/admin/clubs/[id]/courts/new/page.tsx`

### Translation Keys

```json
"admin": {
  "courts": {
    "new": {
      "title": "New Court",
      "steps": { "basic": "Basic", "pricing": "Pricing" },
      "basicStep": {
        "title": "Basic Information",
        "courtName": "Court Name *",
        "courtNamePlaceholder": "Enter court name"
      },
      "errors": {
        "nameRequired": "Name is required"
      }
    }
  }
}
```

## Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js Internationalization](https://nextjs.org/docs/advanced-features/i18n-routing)
- Project locale files: `/locales/`

## Statistics

- **Total English keys**: 1308
- **Total Ukrainian keys**: 1230
- **Coverage**: ~94% (some minor admin error messages not translated)
- **Major pages translated**: 18+ pages fully translated

## Future Improvements

1. Add more languages (Spanish, French, etc.)
2. Translate remaining admin error messages
3. Add translation management tool
4. Implement fallback translations for missing keys
5. Add translation tests to CI/CD pipeline
