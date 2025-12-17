# Organization Details Page Update

## Overview
This update transforms the Organization Details page to provide better organization information display and editing capabilities by reusing the existing stepper-based creation flow.

## Changes Made

### 1. Organization Overview Block
**Location**: Top section of the details page

**Features**:
- Displays organization logo (if available)
- Shows organization name prominently
- Displays short description
- Shows address with location icon
- Displays creation date
- Shows status (Active/Inactive based on archivedAt)

**UI Components**: 
- Prominent card with organization branding
- Icon-based metadata display
- Dark theme support with `im-*` classes

### 2. Organization Owner Section
**Location**: Dedicated section after overview

**Features**:
- Displays exactly one primary owner
- Shows owner's full name, email, and role badge
- "Change Owner" button to replace current owner
- Empty state when no owner assigned
- "Assign Owner" button in empty state

**Rules**:
- Only one owner can exist at a time
- Owner must be selected from existing SuperAdmins
- Uses the `/api/admin/organizations/set-owner` endpoint
- Previous owner is automatically unassigned when new owner is set

### 3. Editable Information Blocks
The organization information is now split into separate, editable blocks:

#### Basic Information Block
- **Fields**: Name, Slug, Description
- **Edit Action**: Opens modal with BasicInfoStep component
- **Reuses**: Step 1 from OrganizationCreationStepper

#### Address Block
- **Fields**: Country, City, Street, Postal Code, Latitude, Longitude
- **Edit Action**: Opens modal with AddressStep component
- **Reuses**: Step 2 from OrganizationCreationStepper
- **Note**: Full address is reconstructed from components

#### Contacts & Social Links Block
- **Fields**: Contact Email, Phone, Website, Social Links (Facebook, Instagram, LinkedIn)
- **Edit Action**: Opens modal with ContactsStep component
- **Reuses**: Step 3 from OrganizationCreationStepper
- **Note**: Social links stored in metadata

### 4. Reusable Stepper Components
**New Components Created**:
- `BasicInfoStep.tsx` - Handles name, slug, and description
- `AddressStep.tsx` - Handles full address with coordinates
- `ContactsStep.tsx` - Handles contact info and social links

**Location**: `src/components/admin/OrganizationSteps/`

**Usage**: 
- Used in both organization creation (full stepper) and editing (individual modals)
- Accept form data, field errors, and onChange handlers as props
- Maintain consistent validation across creation and editing

### 5. API Updates
**Endpoint**: `PUT /api/orgs/[orgId]`

**New Field Support**:
- Added `description` field to organization updates
- Description stored directly in Organization model
- Properly returned in GET and PUT responses

**Type Updates**:
- Updated `UpdateOrganizationPayload` to include description
- Updated `OrgDetail` interface to include description, logo, heroImage, metadata

### 6. UI/UX Enhancements
**Styling** (`page.css`):
- Overview block styles with logo display
- Owner section with avatar and role badge
- Social links display as clickable badges
- Empty state for owner section
- Consistent dark theme support
- Icon-based section headers

**Translations** (`en.json`):
- Added new keys for overview, owner, and section labels
- Added error messages for owner changes
- Added labels for new UI elements

## Technical Details

### Data Flow
1. **Fetching**: Organization data fetched via `/api/orgs/[orgId]` GET endpoint
2. **Editing**: Each section opens a modal with pre-populated form data
3. **Saving**: Updates sent via Zustand store's `updateOrganization` action
4. **Refreshing**: Page data refreshed after successful updates

### State Management
- Modal open/close states for each edit section
- Form data state for each editable section (basicInfo, address, contacts)
- Field errors tracking for validation
- Separate states for owner change modal

### Owner Management
- Uses existing SuperAdmin users only
- Calls `/api/admin/organizations/set-owner` endpoint
- Automatically handles ownership transfer
- Only one owner can exist at a time

## Files Modified

### New Files
- `src/components/admin/OrganizationSteps/BasicInfoStep.tsx`
- `src/components/admin/OrganizationSteps/AddressStep.tsx`
- `src/components/admin/OrganizationSteps/ContactsStep.tsx`
- `src/components/admin/OrganizationSteps/index.ts`

### Modified Files
- `src/app/(pages)/admin/organizations/[orgId]/page.tsx` - Main page component
- `src/app/(pages)/admin/organizations/[orgId]/page.css` - Styles for new UI
- `src/app/api/orgs/[orgId]/route.ts` - API route with description support
- `src/types/organization.ts` - Type definitions
- `locales/en.json` - English translations

## Testing Checklist
- [ ] Organization overview displays correctly
- [ ] Logo displays when available
- [ ] Description displays and can be edited
- [ ] Owner section shows current owner
- [ ] Change owner modal works correctly
- [ ] Basic info edit modal opens and saves
- [ ] Address edit modal opens and saves
- [ ] Contacts edit modal opens and saves
- [ ] Social links display as clickable badges
- [ ] All modals use dark theme correctly
- [ ] Validation works in all edit modals
- [ ] Empty states display correctly

## Notes
- The implementation follows the existing patterns in the codebase
- Reuses components from organization creation for consistency
- Uses Zustand store for state management
- Follows dark theme guidelines with `im-*` semantic classes
- All edits happen via modals, not inline
- Owner management is exclusive to this page (not in creation flow)
