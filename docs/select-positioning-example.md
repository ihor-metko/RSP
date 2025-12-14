# Select Component Positioning Examples

## Visual Demonstration

### Scenario 1: Select Near Top of Viewport
When a Select component is positioned near the top of the viewport:
```
┌─────────────────────────────────┐
│ [Viewport Top - 8px padding]    │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ Select Input            ▼│   │ ← Trigger
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Option 1                │   │
│  │ Option 2                │   │ ← Dropdown (below)
│  │ Option 3                │   │
│  │ Option 4                │   │
│  └─────────────────────────┘   │
│                                 │
│         [Rest of Page]          │
└─────────────────────────────────┘
```
**Behavior**: Dropdown appears below because there's sufficient space.

---

### Scenario 2: Select Near Bottom of Viewport (FIXED)
When a Select component is positioned near the bottom:

**Before Fix** (Bug):
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐   │
│  │ Option 1                │   │ ← Dropdown appears
│  │ Option 2                │   │   much higher than
│  │ Option 3                │   │   expected
│  └─────────────────────────┘   │
│                                 │
│         [Large Gap]             │ ← Visual bug: gap
│                                 │
│  ┌─────────────────────────┐   │
│  │ Select Input            ▼│   │ ← Trigger
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│ [Viewport Bottom - No Space]    │
└─────────────────────────────────┘
```

**After Fix** (Correct):
```
┌─────────────────────────────────┐
│                                 │
│  ┌─────────────────────────┐   │
│  │ Option 1                │   │
│  │ Option 2                │   │ ← Dropdown appears
│  │ Option 3                │   │   directly above
│  │ Option 4                │   │   trigger
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Select Input            ▼│   │ ← Trigger
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│ [Viewport Bottom - No Space]    │
└─────────────────────────────────┘
```
**Behavior**: Dropdown now correctly appears directly above the trigger with proper alignment.

---

### Scenario 3: Select Near Very Top (Edge Case)
When a Select must flip to "above" but there's limited space:

```
┌─────────────────────────────────┐
│ [Viewport Top - 8px padding]    │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ Option 1                │   │ ← Dropdown clamped to
│  │ Option 2                │   │   viewport padding
│  └─────────────────────────┘   │   (scrollable if needed)
│  ┌─────────────────────────┐   │
│  │ Select Input            ▼│   │ ← Trigger
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│ [Viewport Bottom - No Space]    │
└─────────────────────────────────┘
```
**Behavior**: Dropdown respects minimum viewport padding (8px) and adjusts height accordingly.

---

## Technical Details

### Positioning Logic

1. **Calculate Available Space**:
   - `spaceBelow = viewportHeight - triggerBottom - offset`
   - `spaceAbove = triggerTop - offset - VIEWPORT_PADDING`

2. **Determine Placement**:
   - If `spaceBelow >= maxHeight` OR `spaceBelow > spaceAbove`: Place below
   - Otherwise: Place above

3. **Calculate Position**:
   - **Below**: `top = triggerBottom + offset`
   - **Above**: `top = triggerTop - actualMaxHeight - offset`
     - Then clamp: `top = Math.max(VIEWPORT_PADDING, top)`

### Constants
- `VIEWPORT_PADDING = 8px` - Minimum distance from viewport edges
- `SAFE_ZONE_BUFFER = 20px` - Extra buffer for available space calculation
- Default `offset = 4px` - Gap between trigger and dropdown
- Default `maxHeight = 300px` - Maximum dropdown height

### CSS Animation
The dropdown uses a slide-in animation for smooth appearance:
```css
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Usage in Application

### Components Using Select
The fix automatically applies to all Select-based components:

1. **Filter Components**
   - `SortSelect` - Sort options in list views
   - `StatusFilter` - Status filtering
   - `RoleFilter` - Role filtering

2. **Selector Components**
   - `OrgSelector` - Organization selection
   - `ClubSelector` - Club selection
   - `OperationsClubSelector` - Operations club picker

3. **Form Components**
   - Any form using the `Select` component
   - Admin forms with dropdowns
   - Booking forms with options

### Testing Recommendations

To verify the fix works correctly:

1. **Manual Testing Steps**:
   - Navigate to pages with Select components (e.g., Admin Users, Operations)
   - Scroll so the Select is near the bottom of the viewport
   - Open the dropdown
   - Verify it appears directly above the input with no gap
   - Verify selection works correctly
   - Verify dropdown closes after selection

2. **Different Screen Sizes**:
   - Test on desktop (1920x1080, 1366x768)
   - Test on tablet (768x1024)
   - Test on mobile (375x667, 414x896)

3. **Scroll Positions**:
   - Test with Select at various scroll positions
   - Test inside scrollable containers
   - Test with page zoom at different levels

---

## Troubleshooting

### Issue: Dropdown still appears disconnected
**Solution**: Ensure the trigger element has proper positioning and the Portal is rendering correctly.

### Issue: Dropdown flickers when opening
**Solution**: This is expected behavior due to position calculation. The animation helps smooth this transition.

### Issue: Dropdown doesn't flip to above
**Solution**: Check that there's actually insufficient space below. The logic requires `spaceBelow < maxHeight` AND `spaceBelow <= spaceAbove`.

### Issue: Options are cut off at viewport edge
**Solution**: The dropdown respects `VIEWPORT_PADDING` (8px) and will reduce height if necessary. Consider using fewer options or enabling scrolling.
