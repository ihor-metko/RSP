# Court Images Implementation

## Overview
This document describes the implementation of court image display across the ArenaOne platform.

## Implementation Summary

### Feature: Display Court Images on Court Pages
Goal: Update the courts list/detail pages to display court images, similar to how images are shown on the detailed club page.

## Changes Made

### 1. Court Detail Page (Player View)
**File**: `src/app/(pages)/(player)/courts/[courtId]/page.tsx`

#### Changes:
- Added image utilities import: `isValidImageUrl`, `getSupabaseStorageUrl`
- Implemented responsive court image section with:
  - Full-width image display with responsive heights (h-64 md:h-80 lg:h-96)
  - Gradient overlay for better text readability (from-black/60 via-black/20 to-transparent)
  - Court name and badges overlaid on the image
  - Automatic fallback to card-based layout when no image is available
  - Accessibility: Alt text uses court name

#### Image Display Details:
- **Image URL Processing**: Uses `getSupabaseStorageUrl()` to convert stored paths to full Supabase Storage URLs
- **Validation**: Uses `isValidImageUrl()` to check if image URL is valid before displaying
- **Responsive Heights**:
  - Mobile: h-64 (16rem / 256px)
  - Tablet: h-80 (20rem / 320px)
  - Desktop: h-96 (24rem / 384px)
- **Overlay Design**: 
  - Gradient from black/60 at bottom to transparent at top
  - White text with backdrop blur effects on badges
  - Court name displayed in large bold text (3xl md:4xl)

#### Fallback Behavior:
When no image is available (`!hasImage`), the page displays:
- Card-based header with court name and badges
- Traditional layout without image section
- Same information, different visual presentation

### 2. Admin Courts List Page
**File**: `src/app/(pages)/admin/courts/page.tsx`

#### Status:
✅ **Already implemented** - No changes needed

The admin courts list page already uses the `CourtCard` component which includes built-in image support via the `imageUrl` field.

### 3. CourtCard Component
**Files**: 
- `src/components/CourtCard.tsx`
- `src/components/courts/CourtCard.tsx`

#### Status:
✅ **Already implemented** - Image support already exists

The CourtCard component includes:
- Image display with proper handling of `imageUrl` field
- Placeholder SVG icon when no image is available
- Responsive image sizing
- Lazy loading for performance
- Accessibility with alt text

## Technical Details

### Image Storage and Processing
Images are stored in Supabase Storage in the "uploads" bucket. The database stores only relative file paths (e.g., "clubs/uuid.jpg").

**Utility Functions**:
- `getSupabaseStorageUrl(storedPath)`: Converts stored paths to full Supabase Storage public URLs
- `isValidImageUrl(url)`: Validates if a URL is valid for display
- Handles full URLs (HTTP/HTTPS) and relative paths
- Falls back gracefully when Supabase URL is not configured

### Data Structure
Court objects include an `imageUrl` field:
```typescript
interface Court {
  id: string;
  name: string;
  type?: string | null;
  surface?: string | null;
  indoor: boolean;
  defaultPriceCents: number;
  imageUrl?: string | null;  // ← Image URL field
  // ... other fields
}
```

## Error Handling

### Missing Images
- **Player Court Detail Page**: Falls back to card-based layout without image
- **Court Cards**: Display placeholder icon with court icon SVG
- **No Breaking Layout**: Image absence doesn't break page layout

### Failed Image Loading
- Uses standard HTML image error handling
- Browser falls back to alt text
- Placeholder icons provide visual fallback in CourtCard

## Responsive Design

### Mobile (< 768px)
- Court image height: 16rem (256px)
- Single column layout
- Touch-optimized controls

### Tablet (768px - 1024px)
- Court image height: 20rem (320px)
- Two-column grid for court lists
- Optimized spacing

### Desktop (> 1024px)
- Court image height: 24rem (384px)
- Three-column grid for court lists
- Full-width image hero

## Accessibility

### Alt Text
- Court detail page: Uses court name as alt text
- CourtCard: Uses court name as alt text
- Descriptive text for screen readers

### Semantic HTML
- Proper use of `<img>` tags with alt attributes
- Section elements for image containers
- ARIA labels where appropriate

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus states maintained
- No image-only content (all info available in text)

## Styling

### CSS Classes Used
- `tm-court-image-section`: Container for image section
- Tailwind utility classes for responsive design
- Gradient overlays using Tailwind's gradient utilities
- Backdrop blur effects for badges

### Dark Theme Support
- All styles compatible with dark theme
- Badge colors adjusted for dark mode
- Gradient overlays work in both themes

## Testing

### Manual Testing
✅ Court detail page renders correctly with images
✅ Court detail page falls back gracefully without images
✅ Admin courts list displays images in CourtCard
✅ Responsive layout works across all breakpoints
✅ Accessibility: Alt text present on all images

### Automated Testing
✅ Existing CourtCard tests pass (7/7 tests)
✅ Build completes successfully
✅ Linting passes for modified files

## Future Enhancements

### Potential Improvements
1. **Image Optimization**: Add Next.js Image component for automatic optimization
2. **Gallery View**: Allow multiple images per court with carousel
3. **Upload UI**: Admin interface for uploading/managing court images
4. **Image Validation**: Server-side validation of image dimensions and formats
5. **CDN Integration**: Consider CDN for faster image delivery

### Placeholder Images
Currently uses SVG icons as placeholders. Could add:
- Sport-specific default images (padel court, tennis court, etc.)
- Custom placeholder images for different court types
- Branded placeholder images

## Performance

### Optimizations
- Lazy loading on CourtCard images
- Image URL validation before rendering
- Memoization of image URL processing
- No unnecessary re-renders

### Metrics
- Build time: No significant impact
- Page load: Minimal impact with lazy loading
- First contentful paint: Not affected by changes

## Maintenance Notes

### Code Locations
- **Player Court Detail**: `src/app/(pages)/(player)/courts/[courtId]/page.tsx`
- **Admin Courts List**: `src/app/(pages)/admin/courts/page.tsx`
- **CourtCard Component**: `src/components/courts/CourtCard.tsx`, `src/components/CourtCard.tsx`
- **Image Utilities**: `src/utils/image.ts`
- **Type Definitions**: `src/types/court.ts`

### Dependencies
- `@/utils/image`: Image URL processing utilities
- Next.js: Framework
- Supabase Storage: Image storage backend
- Tailwind CSS: Styling

## Compatibility

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Graceful degradation for older browsers

### Framework Version
- Next.js 15.1.0
- React 18.2.0
- TypeScript 5.x

## Deployment Notes

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL for image storage

### Database Schema
No schema changes required. Uses existing `imageUrl` field on Court table.

### Migration Path
No migration needed. Existing courts without images will show fallback layouts.
