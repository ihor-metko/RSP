# Visual Verification Guide for Entity Page Layout

## Purpose
This guide helps verify that the unified entity page layout is working correctly across all entity pages.

## What to Check

### 1. Layout Consistency
All entity pages should have:
- **Same horizontal padding**: 1rem (16px) on mobile, 2rem (32px) on desktop
- **Same vertical padding**: 1.5rem (24px) on mobile, 2rem (32px) on desktop
- **Centered content**: Content should be centered on the page
- **Consistent max-width**: 
  - Organization & Club: 1400px
  - Court: 1200px

### 2. EntityBanner
The banner at the top of each page should be **unchanged**:
- Full-width background image
- Logo and title overlay
- Edit button (if applicable)
- Status badges

### 3. Content Area
Below the banner, all pages should have:
- Consistent spacing from the banner
- Same padding on left and right
- Content properly contained within max-width

### 4. Responsive Behavior
Test on different screen sizes:
- **Mobile (< 768px)**: Smaller padding (px-4 py-6)
- **Desktop (≥ 768px)**: Larger padding (px-8 py-8)
- Content should remain readable and well-spaced at all sizes

## Pages to Test

### Admin Pages
1. **Organization Detail Page**
   - URL: `/admin/organizations/{orgId}`
   - Should use base `entity-page-content`
   - Max-width: 1400px

2. **Club Detail Page**
   - URL: `/admin/clubs/{id}`
   - Should use base `entity-page-content`
   - Max-width: 1400px

3. **Court Detail Page**
   - URL: `/admin/courts/{courtId}`
   - Should use `entity-page-content--narrow`
   - Max-width: 1200px

### Player Pages
4. **Club Detail Page (Player)**
   - URL: `/clubs/{id}`
   - Should use base `entity-page-content`
   - Max-width: 1400px

## How to Test

### 1. Visual Inspection
For each page:
1. Navigate to the page
2. Observe the EntityBanner (should look the same as before)
3. Observe the content area padding
4. Check that content is centered
5. Verify max-width constraint (use browser DevTools)

### 2. Browser DevTools
1. Open browser DevTools (F12)
2. Inspect the main content `<div>` below EntityBanner
3. Verify it has class `entity-page-content`
4. Check computed styles:
   - Padding left/right should be 1rem or 2rem
   - Padding top/bottom should be 1.5rem or 2rem
   - Max-width should be 1400px or 1200px
   - Margin should be `0 auto`

### 3. Responsive Testing
1. Resize browser window from wide to narrow
2. Observe padding changes at 768px breakpoint
3. Verify content remains readable
4. Check that layout doesn't break

### 4. Compare Before/After
If possible, compare with screenshots from before the change:
- Overall layout should look the same
- Only subtle padding differences (should be more consistent now)
- No layout breaks or unexpected spacing

## Expected Results

### ✅ Success Indicators
- [ ] All entity pages have consistent padding
- [ ] Content is properly centered
- [ ] Max-width constraints are working
- [ ] EntityBanner is unchanged
- [ ] No layout breaks on mobile or desktop
- [ ] Smooth transition between breakpoints
- [ ] Content is readable at all sizes

### ❌ Failure Indicators
- Content is off-center or misaligned
- Inconsistent padding between pages
- Content extends beyond max-width
- EntityBanner looks different
- Layout breaks at certain screen sizes
- Content is cramped or has too much space

## Test Checklist

Use this checklist to verify each page:

### Organization Detail Page (`/admin/organizations/{orgId}`)
- [ ] EntityBanner displays correctly
- [ ] Content padding is correct
- [ ] Content is centered
- [ ] Max-width is 1400px
- [ ] Responsive behavior works
- [ ] No visual regressions

### Club Detail Page (`/admin/clubs/{id}`)
- [ ] EntityBanner displays correctly
- [ ] Content padding is correct
- [ ] Content is centered
- [ ] Max-width is 1400px
- [ ] Responsive behavior works
- [ ] No visual regressions

### Court Detail Page (`/admin/courts/{courtId}`)
- [ ] No banner (has breadcrumbs and header instead)
- [ ] Content padding is correct
- [ ] Content is centered
- [ ] Max-width is 1200px
- [ ] Responsive behavior works
- [ ] No visual regressions

### Player Club Detail Page (`/clubs/{id}`)
- [ ] EntityBanner displays correctly
- [ ] Content padding is correct
- [ ] Content is centered
- [ ] Max-width is 1400px
- [ ] Responsive behavior works
- [ ] No visual regressions

## Reporting Issues

If you find any visual regressions or layout issues:

1. **Take a screenshot** showing the issue
2. **Note the page URL** where the issue occurs
3. **Describe the issue** (what's wrong vs what you expected)
4. **Note the screen size** where the issue appears
5. **Include browser info** (Chrome, Firefox, Safari, etc.)

## Additional Notes

- The Court detail page doesn't use EntityBanner (it has a different header style)
- Player-facing pages may have additional content not present in admin pages
- Dark mode should work the same as before (no dark mode specific changes)
- Print layouts are not affected by these changes
