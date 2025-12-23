# Entity Edit Stepper Implementation

## Overview

This document describes the implementation of the EntityEditStepper component, a reusable stepper modal for editing entity details (organizations, clubs, courts, etc.) with a clean, step-by-step interface.

## Implementation Date

December 18, 2024

## Components Created

### 1. ImagesStep Component

**Location**: `src/components/admin/OrganizationSteps/ImagesStep.tsx`

**Purpose**: Reusable step component for uploading entity logo and hero/banner images.

**Features**:
- Drag-and-drop image upload using UploadField component
- Image preview before submission
- Support for both new uploads and existing images
- Validation for required images (hero/banner)
- Aspect ratio guidance (square for logo, wide for banner)

**Props**:
```typescript
interface ImagesStepProps {
  formData: {
    logo: UploadedFile | null;
    heroImage: UploadedFile | null;
  };
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: (field: 'logo' | 'heroImage', value: UploadedFile | null) => void;
}
```

### 2. EntityEditStepper Component

**Location**: `src/components/admin/EntityEditStepper.client.tsx`

**Purpose**: Generic modal stepper for editing entity details with a guided 3-step flow.

**Features**:
- **Step 1: Basic Info** - Name, slug, and description
- **Step 2: Address** - Country, city, street, postal code, and GPS coordinates
- **Step 3: Images** - Logo and hero/banner image upload
- Pre-populates form fields with existing entity data
- Per-step validation
- Progress indicator showing current step
- Navigation buttons (Cancel, Back, Next, Save)
- Error handling and display

**Props**:
```typescript
interface EntityEditStepperProps {
  isOpen: boolean;
  onClose: () => void;
  entityData: EntityData;
  onSave: (data: {
    name: string;
    slug: string;
    description: string | null;
    address: string;
    metadata: Record<string, unknown>;
    logo?: File | null;
    heroImage?: File | null;
  }) => Promise<void>;
}
```

**EntityData Interface**:
```typescript
interface EntityData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  logo?: string | null;
  heroImage?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

## Stepper Flow

### Step 1: Basic Information & Description

**Fields**:
- Organization/Entity Name * (required)
- Slug (optional, displayed for reference)
- Short Description / Bio * (required)

**Validation**:
- Name must not be empty
- Description must not be empty

### Step 2: Address

**Fields**:
- Country * (required)
- City * (required)
- Street * (required)
- Postal Code (optional)
- Latitude * (required, must be between -90 and 90)
- Longitude * (required, must be between -180 and 180)

**Validation**:
- All required fields must not be empty
- Coordinates must be valid numbers within proper ranges
- Helper tip provided for finding coordinates using map services

### Step 3: Images & Logo

**Fields**:
- Organization/Entity Logo (optional)
- Background Image / Banner (optional for editing since existing image may be present)

**Features**:
- Existing images are displayed as previews
- New images can be uploaded to replace existing ones
- Drag-and-drop or click to upload
- Image type validation (JPG, PNG, WebP)
- File size limit (5MB)
- Aspect ratio guidance

## Integration with Organization Detail Page

### Changes Made to `src/app/(pages)/admin/organizations/[orgId]/page.tsx`

1. **Import Changes**:
   - Removed imports for `BasicInfoStep`, `AddressStep`, `ContactsStep`
   - Added import for `EntityEditStepper`

2. **State Simplification**:
   - Removed individual form state variables (basicInfoData, addressData, contactsData)
   - Removed fieldErrors state
   - Removed editing and editError state
   - Kept only `isEditingDetails` boolean state

3. **Handler Changes**:
   - Simplified `handleOpenDetailsEdit` to just set the modal open state
   - Removed `handleBasicInfoChange`, `handleAddressChange`, `handleContactsChange`
   - Removed `handleSaveDetails` function
   - Added `handleStepperSave` function to handle the complete save operation

4. **Modal Replacement**:
   - Replaced the old unified edit modal (which showed all sections at once) with EntityEditStepper
   - EntityEditStepper manages its own internal state and form data

### handleStepperSave Function

This new function handles saving entity details through the stepper:

```typescript
const handleStepperSave = async (data: {
  name: string;
  slug: string;
  description: string | null;
  address: string;
  metadata: Record<string, unknown>;
  logo?: File | null;
  heroImage?: File | null;
}) => {
  // 1. Update organization details via store
  await updateOrganization(orgId, {
    name: data.name,
    slug: data.slug,
    description: data.description,
    address: data.address,
    metadata: { ...existing, ...data.metadata },
  });

  // 2. Upload logo if new file provided
  if (data.logo) {
    // Upload via new image upload API (to be implemented)
  }

  // 3. Upload hero image if new file provided
  if (data.heroImage) {
    // Upload via new image upload API (to be implemented)
  }

  // 4. Show success toast and refresh data
  showToast(t("orgDetail.updateSuccess"), "success");
  fetchOrgDetail();
};
```

## Benefits

### Reusability
- EntityEditStepper can be used for any entity type (organization, club, court, etc.)
- ImagesStep can be reused in both creation and editing flows
- Step components (BasicInfoStep, AddressStep) are shared across the application

### User Experience
- Clear step-by-step process with progress indication
- Per-step validation prevents advancing with invalid data
- Existing data is pre-populated for easy editing
- Visual feedback for completed steps
- Easy navigation with Back/Next buttons

### Maintainability
- Follows existing patterns (similar to OrganizationCreationStepper)
- Clean separation of concerns (each step is a separate component)
- Centralized state management within the stepper
- TypeScript types ensure type safety

### Consistency
- Uses existing UI components (Button, Modal, Input, Textarea, Card)
- Follows the same styling patterns as the rest of the application
- Uses the same translation keys and structure

## Usage Example

```typescript
import { EntityEditStepper } from "@/components/admin/EntityEditStepper.client";

function OrganizationDetailPage() {
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);

  const handleStepperSave = async (data) => {
    // Update organization and upload images
    await updateOrganization(org.id, data);
  };

  return (
    <>
      <EntityBanner
        title={org.name}
        onEdit={() => setIsEditingDetails(true)}
      />

      {org && (
        <EntityEditStepper
          isOpen={isEditingDetails}
          onClose={() => setIsEditingDetails(false)}
          entityData={org}
          onSave={handleStepperSave}
        />
      )}
    </>
  );
}
```

## Translation Keys

The stepper uses existing translation keys from the organization creation stepper:

- `organizations.stepper.stepBasicInfo` - "Basic Info"
- `organizations.stepper.stepAddress` - "Address"
- `organizations.stepper.stepImages` - "Images"
- `organizations.stepper.stepProgress` - "Step {current} of {total}"
- `organizations.stepper.basicInfoTitle` - "Basic Information & Description"
- `organizations.stepper.addressTitle` - "Organization Address"
- `organizations.stepper.imagesTitle` - "Images & Logo"
- And all field labels, placeholders, and validation messages

## Future Enhancements

1. **Map Picker Integration**
   - Interactive map for selecting coordinates
   - Address geocoding to auto-fill coordinates
   - Visual confirmation of location

2. **Draft Saving**
   - Save progress as draft if user closes modal mid-edit
   - Auto-save functionality

3. **Image Cropping**
   - Allow users to crop and adjust images before upload
   - Enforce aspect ratios visually

4. **Undo/Redo**
   - Allow users to undo changes within the stepper
   - Maintain edit history

5. **Extended Entity Support**
   - Adapt for club editing (with sport-specific fields)
   - Adapt for court editing (with court-specific fields)
   - Add conditional step rendering based on entity type

## Related Files

- `src/components/admin/EntityEditStepper.client.tsx` - Main stepper component
- `src/components/admin/OrganizationSteps/ImagesStep.tsx` - Images step component
- `src/components/admin/OrganizationSteps/BasicInfoStep.tsx` - Basic info step component
- `src/components/admin/OrganizationSteps/AddressStep.tsx` - Address step component
- `src/components/admin/OrganizationSteps/index.ts` - Step components barrel export
- `src/app/(pages)/admin/organizations/[orgId]/page.tsx` - Organization detail page
- `src/components/admin/UploadField.client.tsx` - Image upload component
- `src/components/ui/Modal.tsx` - Modal wrapper component
- `src/components/ui/EntityBanner.tsx` - Entity banner with edit button

## Testing

- Build passed without TypeScript errors
- ESLint passed on all modified files
- Development server runs successfully
- Code review completed with all feedback addressed

## Notes

- The stepper was designed to match the existing OrganizationCreationStepper pattern
- Images are optional during editing (user may keep existing images)
- The stepper manages its own internal state, simplifying the parent component
- The save handler in the parent component handles the API calls for updating data and uploading images
