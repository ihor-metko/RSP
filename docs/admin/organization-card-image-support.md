# Organization Admin Card - Image Support Implementation

## Overview
Updated the Organization Admin card component to support and display images, consistent with how images are handled in Club and Court cards.

## Implementation Date
December 15, 2024

## Changes Made

### 1. Type Definition Updates
**File**: `src/types/organization.ts`

Added optional image fields to the `Organization` interface:
```typescript
export interface Organization {
  // ... existing fields
  logo?: string | null;
  heroImage?: string | null;
  // ... rest of fields
}
```

### 2. Component Updates
**File**: `src/components/admin/AdminOrganizationCard.tsx`

#### Added Image Support
- Imports image utility functions: `isValidImageUrl`, `getSupabaseStorageUrl`
- Converts stored image paths to full Supabase Storage URLs
- Implements image priority logic:
  1. **heroImage** (primary) - Full-width hero image
  2. **logo** (fallback) - Displayed with object-contain
  3. **placeholder** (default) - Shows first letter of organization name

#### Image Section Structure
```tsx
<div className="im-admin-org-card-image">
  {/* Image or placeholder */}
  <div className="im-admin-org-status">
    {/* Status badge overlay */}
  </div>
</div>
```

#### Content Restructuring
- Moved organization name and slug from header to content section
- Name remains clickable when `onView` prop is provided
- Content section now follows image (not in colored header)

### 3. Styling Updates
**File**: `src/components/admin/AdminOrganizationCard.css`

#### New Image Styles
- **Image Container**: 16:9 aspect ratio (matching Club cards)
- **Hero Image**: Full cover with zoom effect on hover
- **Logo Image**: Object-contain with card background
- **Placeholder**: Organization entity color background with white letter
- **Status Badge**: Positioned top-right with overlay

#### Key CSS Classes
- `.im-admin-org-card-image` - Image container with 16:9 aspect ratio
- `.im-admin-org-hero-image` - Main image styling
- `.im-admin-org-hero-image--logo` - Logo-specific styling
- `.im-admin-org-image-placeholder` - Placeholder container
- `.im-admin-org-image-placeholder-text` - First letter display

### 4. Test Coverage
**File**: `src/__tests__/admin-organization-card.test.tsx`

Added 5 new test cases:
1. Display heroImage when provided
2. Display logo when heroImage is not provided
3. Display placeholder with first letter when no images provided
4. Prefer heroImage over logo when both are provided
5. Verify alt text for accessibility

All 17 tests passing ✅

## Design Decisions

### Text Placement
**Decision**: Placed text in card body under the image (not overlaid)

**Rationale**:
- Matches existing Club card pattern
- Better readability and contrast
- Improved accessibility for screen readers
- Cleaner separation of visual elements
- Consistent with design system

### Image Priority
**Decision**: heroImage → logo → placeholder

**Rationale**:
- heroImage provides best visual presentation (16:9)
- logo serves as acceptable fallback
- placeholder maintains visual consistency

### Aspect Ratio
**Decision**: 16:9 aspect ratio for images

**Rationale**:
- Matches Club and Court card implementations
- Industry standard for hero images
- Works well with responsive grid layouts
- Optimal for various image content

## Backward Compatibility

✅ **Fully backward compatible**

- Both `logo` and `heroImage` are optional fields
- Existing organizations without images show placeholder
- No database migrations required
- API endpoints don't need immediate updates
- Card gracefully handles missing image data

## Usage Example

```tsx
<AdminOrganizationCard
  organization={{
    id: "org-123",
    name: "Padel Arena",
    slug: "padel-arena",
    heroImage: "organizations/hero-123.jpg", // Optional
    logo: "organizations/logo-123.png",       // Optional
    clubCount: 5,
    // ... other fields
  }}
  onView={(orgId) => router.push(`/admin/organizations/${orgId}`)}
/>
```

## Future Enhancements

When adding organization image upload functionality:

1. **Database Schema**: Add `logo` and `heroImage` columns to Organization model
2. **API Updates**: Include image fields in GET/POST/PUT endpoints
3. **Upload UI**: Add image upload fields in organization creation/edit forms
4. **Storage**: Use existing Supabase Storage `uploads` bucket with `organizations/` prefix
5. **Validation**: Implement image size/format validation (similar to Club images)

## Styling Consistency

Follows established patterns from Club and Court cards:
- Uses `im-*` semantic class naming convention
- Supports dark theme with CSS variables
- Consistent hover effects (translateY + scale)
- Status badge overlay pattern
- Responsive grid layout

## Accessibility

- Descriptive alt text: "Hero image for [Organization Name]" or "Logo for [Organization Name]"
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly structure
- Color contrast compliance maintained

## Files Modified

1. `src/types/organization.ts` - Added image fields to interface
2. `src/components/admin/AdminOrganizationCard.tsx` - Implemented image support
3. `src/components/admin/AdminOrganizationCard.css` - Added image styling
4. `src/__tests__/admin-organization-card.test.tsx` - Added image tests

## Testing Checklist

- [x] All existing tests pass
- [x] New image display tests pass
- [x] TypeScript compilation successful
- [x] ESLint passes with no errors
- [x] Code review feedback addressed
- [x] CodeQL security scan passes
- [x] Build completes successfully
- [x] Backward compatibility verified

## Security Review

✅ **No security vulnerabilities detected**
- CodeQL analysis: 0 alerts
- Image URLs properly sanitized via utility functions
- No XSS vulnerabilities introduced
- Follows existing image handling patterns
