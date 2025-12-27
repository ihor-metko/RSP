# Logo Theme Switch Feature

## Overview

This document describes the implementation of the theme switch feature for single logo uploads in the LogoTab component. This feature allows users to preview how their single logo will appear on both light and dark backgrounds.

## Feature Description

When uploading a single logo to be used across both light and dark themes, users can now:

1. **Toggle Background Preview**: Switch between light and dark backgrounds to see how the logo appears in different contexts
2. **Live Preview Updates**: The logo preview updates immediately when the background is changed
3. **State Persistence**: The selected background preference is saved and can be used later when rendering the logo

## User Interface

### Single Logo Mode
When "One logo for both themes" is selected:

```
┌─────────────────────────────────────────┐
│ Logo Count                              │
│ ○ One logo for both themes              │
│ ○ Two separate logos for different themes│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Primary Logo                            │
│ [Upload Field with Preview]             │
│ Upload a square image. SVG recommended. │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Preview Background                      │
│ ○ Light Background                      │
│   Preview logo on white background      │
│ ○ Dark Background                       │
│   Preview logo on dark background       │
│                                         │
│ Choose the background color for preview │
└─────────────────────────────────────────┘
```

### Dual Logo Mode
When "Two separate logos for different themes" is selected:
- The "Preview Background" control is hidden
- Each logo shows the background appropriate to its assigned theme

## Technical Implementation

### Data Structure

```typescript
export interface LogoData {
  logoCount: 'one' | 'two';
  logo: UploadedFile | null;
  logoTheme: 'light' | 'dark';
  secondLogo: UploadedFile | null;
  secondLogoTheme: 'light' | 'dark';
  previewBackground?: 'light' | 'dark'; // NEW: Background preview for single logo mode
}
```

### Component Logic

The `LogoTab` component implements the following logic:

```typescript
// Determine which background to use for preview
const effectivePreviewBackground = formData.logoCount === 'one' 
  ? (formData.previewBackground || 'light')  // Use selected preview for single logo
  : formData.logoTheme;                       // Use theme assignment for dual logos
```

### Preview Background Control

The RadioGroup control is conditionally rendered:

```typescript
{formData.logoCount === 'one' && (
  <RadioGroup
    label={t("logo.logoBackgroundLabel")}
    name="previewBackground"
    options={previewBackgroundOptions}
    value={formData.previewBackground || 'light'}
    onChange={(value) => handleChange('previewBackground', value)}
  />
)}
```

### Metadata Persistence

The selected background is saved in the metadata:

```typescript
const metadata = {
  logoTheme: formData.logoTheme,
  secondLogoTheme: formData.secondLogoTheme,
  logoCount: formData.logoCount,
  previewBackground: formData.previewBackground, // Persisted to database
};
```

## Integration Points

### 1. LogoTab Component
- **File**: `src/components/admin/EntityTabs/LogoTab.tsx`
- **Changes**: Added preview background control and state management

### 2. UploadField Component
- **File**: `src/components/admin/UploadField.client.tsx`
- **Usage**: Already supports `themeBackground` prop for preview rendering
- **CSS**: Uses `im-upload-field--theme-light` and `im-upload-field--theme-dark` classes

### 3. Entity Editors
- **OrganizationEditor**: Initializes `previewBackground` from metadata
- **ClubEditor**: Initializes `previewBackground` from metadata

### 4. Entity Logo Metadata
- **File**: `src/components/ui/EntityLogo.tsx`
- **Interface**: `EntityLogoMetadata` extended with `previewBackground` field

## Translation Keys

### English (`locales/en.json`)
```json
{
  "logo": {
    "logoBackgroundLabel": "Preview Background",
    "logoBackgroundLight": "Light Background",
    "logoBackgroundDark": "Dark Background",
    "previewLightDescription": "Preview logo on white background",
    "previewDarkDescription": "Preview logo on dark background",
    "logoBackgroundHelperText": "Choose the background color for the preview"
  }
}
```

### Ukrainian (`locales/uk.json`)
```json
{
  "logo": {
    "logoBackgroundLabel": "Фон попереднього перегляду",
    "logoBackgroundLight": "Світлий фон",
    "logoBackgroundDark": "Темний фон",
    "previewLightDescription": "Попередній перегляд логотипу на білому фоні",
    "previewDarkDescription": "Попередній перегляд логотипу на темному фоні",
    "logoBackgroundHelperText": "Виберіть колір фону для попереднього перегляду"
  }
}
```

## Styling

The feature uses existing CSS classes from `UploadField.css`:

```css
/* Light background preview */
.im-upload-field.im-upload-field--theme-light {
  background-color: #ffffff;
}

/* Dark background preview */
.im-upload-field.im-upload-field--theme-dark {
  background-color: #1a1a1a;
}
```

These fixed colors (not CSS variables) intentionally provide consistent preview backgrounds regardless of the current app theme.

## Design Principles

### 1. Minimal Changes
- Only appears in single logo mode
- Reuses existing UI components (RadioGroup)
- No changes to dual logo workflow

### 2. Semantic Classes
- Uses `im-*` prefixed classes per platform guidelines
- Maintains dark theme compatibility

### 3. State Management
- Clean separation between preview preference and theme assignment
- Proper persistence in metadata
- Default to 'light' background if not specified

### 4. User Experience
- Immediate visual feedback when switching backgrounds
- Clear labeling and descriptions
- Consistent with existing logo upload flow

## Future Enhancements

Potential improvements for future iterations:

1. **Smart Default**: Auto-detect logo colors and suggest optimal background
2. **Custom Backgrounds**: Allow users to test logos on custom brand colors
3. **Multiple Preview Contexts**: Show logo in various UI contexts (header, cards, etc.)
4. **Logo Guidelines**: Add visual guidelines for optimal logo design

## Testing Checklist

- [x] TypeScript compilation successful
- [x] Build completes without errors
- [x] Linting passes with no new warnings
- [x] Code review passes
- [x] Security scan passes
- [x] Existing tests continue to pass
- [ ] Manual UI testing (requires dev server)
- [ ] Single logo mode shows preview background control
- [ ] Dual logo mode hides preview background control
- [ ] Background switching updates preview immediately
- [ ] State persists after save
- [ ] Works in both organizations and clubs

## Related Files

- `src/components/admin/EntityTabs/LogoTab.tsx`
- `src/components/admin/UploadField.client.tsx`
- `src/components/admin/UploadField.css`
- `src/components/ui/EntityLogo.tsx`
- `src/components/admin/OrganizationEditor.client.tsx`
- `src/components/admin/ClubEditor.client.tsx`
- `locales/en.json`
- `locales/uk.json`

## Version History

- **v1.0** (2025-12-27): Initial implementation of theme switch feature
