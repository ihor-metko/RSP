# DangerZone Component Implementation

## Overview
This document describes the implementation of the DangerZone component and the refactoring of destructive actions from EntityBanner.

## Changes Made

### 1. New Component: DangerZone (`src/components/ui/DangerZone.tsx`)
A reusable component for displaying destructive actions in a clearly marked danger zone.

**Features:**
- Clear "Danger Zone" heading with warning icon
- Distinct danger styling (red border/theme)
- Individual action blocks with descriptions
- Support for different action variants (danger, warning)
- Responsive design
- Accessible and keyboard-navigable

**Props:**
```typescript
interface DangerAction {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  onAction: () => void | Promise<void>;
  isProcessing?: boolean;
  variant?: 'danger' | 'warning';
  show?: boolean;
}

interface DangerZoneProps {
  actions: DangerAction[];
  className?: string;
  title?: string;
}
```

### 2. EntityBanner Refactoring
**Removed:**
- `onTogglePublish` prop
- `isTogglingPublish` prop
- Publish/Unpublish button logic and UI
- All destructive action functionality

**Kept:**
- Status badge display (read-only)
- Edit button functionality
- All visual display features

**Result:** EntityBanner is now purely read-only for displaying entity information.

### 3. Admin Club Detail Page Updates (`src/app/(pages)/admin/clubs/[id]/page.tsx`)

**Changes:**
- Removed publish/unpublish props from EntityBanner usage
- Removed Delete button from actions bar
- Added DangerZone section at the bottom of the page
- Moved Publish/Unpublish actions to DangerZone with confirmation modals
- Moved Delete Club action to DangerZone with confirmation modal

**DangerZone Actions:**
1. **Publish/Unpublish Club** - Variant changes based on current state
2. **Delete Club** - Only visible to root admins

### 4. Admin Organization Detail Page Updates (`src/app/(pages)/admin/organizations/[orgId]/page.tsx`)

**Changes:**
- Removed publish/unpublish props from EntityBanner usage
- Added DangerZone section at the bottom of the page
- Moved Publish/Unpublish actions to DangerZone with confirmation modals

**DangerZone Actions:**
1. **Publish/Unpublish Organization** - Variant changes based on current state

### 5. Translation Updates
Added new translation keys in both English and Ukrainian:

```json
"dangerZone": {
  "title": "Danger Zone",
  "processing": "Processing...",
  "publishClubDescription": "Make this club visible to the public...",
  "unpublishClubDescription": "Hide this club from public view...",
  "deleteClubDescription": "Permanently delete this club...",
  "publishClubConfirm": "Are you sure you want to publish...",
  "unpublishClubConfirm": "Are you sure you want to unpublish...",
  // ... organization variants
}
```

### 6. Type Updates
Added `metadata` field to:
- `ClubDetail` interface in `src/types/club.ts`
- `ClubWithDetails` interface in player club page

## UI/UX Improvements

1. **Clear Visual Hierarchy**: Destructive actions are now grouped together at the bottom of the page
2. **Danger Styling**: Red border and danger-themed colors clearly indicate dangerous operations
3. **Explicit Confirmations**: All destructive actions require confirmation via modal dialogs
4. **Action Context**: Each action has a title and description explaining what it does
5. **No Green for Destructive**: Unpublish uses destructive styling (red), not positive colors
6. **Responsive Design**: DangerZone adapts to mobile screens

## Testing

### Updated Tests
- Updated `organization-detail-banner.test.tsx` to reflect EntityBanner no longer having publish/unpublish buttons
- All tests pass successfully

### Manual Testing Needed
1. Navigate to admin club detail page
2. Verify EntityBanner shows only status badge (no action buttons)
3. Scroll to bottom and verify DangerZone section appears
4. Test Publish/Unpublish with confirmation modal
5. Test Delete (as root admin) with confirmation modal

## Architecture Decisions

1. **Reusable Component**: DangerZone is designed to be reusable for other entities (courts, coaches, etc.)
2. **Centralized Location**: All destructive actions are in one place at the bottom
3. **Separation of Concerns**: EntityBanner is purely display, DangerZone handles actions
4. **Consistent Pattern**: Same pattern used for both clubs and organizations

## Future Enhancements

1. Could add DangerZone to court detail pages
2. Could add archive/restore actions to DangerZone
3. Could add export/import actions if needed
4. Could enhance with more sophisticated confirmation (e.g., type name to confirm)
