# Documentation Screenshots

This directory contains screenshots for the pre-sales documentation system.

## Folder Structure

```
Storage/docs-screenshots/
  root-admin/       # Screenshots for Root Admin role documentation
  org-owner/        # Screenshots for Organization Owner role documentation
  org-admin/        # Screenshots for Organization Admin role documentation
  club-owner/       # Screenshots for Club Owner role documentation
  club-admin/       # Screenshots for Club Admin role documentation
```

## File Naming Convention

Screenshots should be named using the step name with a `.png` extension. For example:
- `quick-booking.png`
- `crud-court.png`
- `create-organization.png`
- `edit-settings.png`

## Using DocsImagePlaceholder Component

The `DocsImagePlaceholder` component automatically generates the correct path to screenshots based on the role and step name:

```tsx
import { DocsImagePlaceholder } from '@/components/ui/docs';

// Example usage
<DocsImagePlaceholder 
  role="club-admin"
  step="quick-booking"
  alt="Quick booking process"
  caption="The quick booking interface for club administrators"
/>
```

This will automatically load the image from:
```
/Storage/docs-screenshots/club-admin/quick-booking.png
```

If the screenshot doesn't exist yet, a placeholder will be shown instead.

## Supported Roles

- `root-admin` - Root Administrator
- `org-owner` - Organization Owner
- `org-admin` - Organization Administrator
- `club-owner` - Club Owner
- `club-admin` - Club Administrator

## Adding New Screenshots

1. Take a screenshot of the relevant feature/page
2. Save it with a descriptive name (e.g., `quick-booking.png`)
3. Place it in the appropriate role folder
4. Update the documentation page to use `DocsImagePlaceholder` component
