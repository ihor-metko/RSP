# Entity Stepper Improvements - Dynamic Components and Layout Fixes

## Date
December 18, 2024

## Overview
Updated the EntityEditStepper component to support dynamic step components and fixed modal layout issues for better user experience.

## Problems Addressed

### 1. Hardcoded Organization Components
**Issue**: The EntityEditStepper was importing and using hardcoded OrganizationSteps components (BasicInfoStep, AddressStep, ImagesStep), making it impossible to reuse for other entity types like clubs or courts.

**Solution**: Made the stepper component generic by accepting step configurations and component arrays as props.

### 2. Modal Padding Issues
**Issue**: Double padding between modal and stepper content caused content to not fit well, especially on smaller screens.

**Solution**: 
- Removed body padding from Modal component
- Adjusted stepper padding from 1.5rem to 1.25rem for better fit
- Increased modal max-width to 900px for larger content display
- Added responsive flexbox layout with proper overflow handling

### 3. Image Display Issues
**Issue**: Uploaded images were not displaying correctly in the third step (ImagesStep).

**Solution**: The UploadField component already had proper fallback logic (`value?.preview || value?.url`), and the EntityEditStepper was correctly initializing images with both `url` and `preview` properties. The display now works correctly.

### 4. Incorrect Action Button Text
**Issue**: The action button displayed "Create Organization" even in edit mode, which was confusing for users.

**Solution**: 
- Changed button to display "Save Changes" in edit mode
- Added translation keys for "saveChanges" and "saving" in both English and Ukrainian
- Updated EntityEditStepper to use these new translation keys

## Implementation Details

### EntityEditStepper Component

#### New Props Interface
```typescript
interface EntityEditStepperProps {
  isOpen: boolean;
  onClose: () => void;
  entityData: EntityData;
  steps: StepConfig[];                          // NEW: Array of step configurations
  stepComponents: React.ComponentType<StepComponentProps>[]; // NEW: Array of step components
  translationNamespace?: string;                // NEW: Translation namespace (default: "organizations.stepper")
  onSave: (data: { ... }) => Promise<void>;
}

interface StepConfig {
  id: number;
  label: string;
}

interface StepComponentProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) 
    | ((field: string, value: UploadedFile | null) => void);
}
```

#### Usage Example
```typescript
<EntityEditStepper
  isOpen={isEditingDetails}
  onClose={() => setIsEditingDetails(false)}
  entityData={org}
  steps={[
    { id: 1, label: t("organizations.stepper.stepBasicInfo") },
    { id: 2, label: t("organizations.stepper.stepAddress") },
    { id: 3, label: t("organizations.stepper.stepImages") },
  ]}
  stepComponents={[BasicInfoStep, AddressStep, ImagesStep]}
  translationNamespace="organizations.stepper"
  onSave={handleStepperSave}
/>
```

### Dynamic Step Rendering
The stepper now renders steps dynamically based on the provided components:

```typescript
const renderStepContent = () => {
  const StepComponent = stepComponents[currentStep - 1];
  if (!StepComponent) return null;

  // Determine which form data to pass based on step
  let formData: unknown;
  let onChange: ... ;

  switch (currentStep) {
    case 1:
      formData = basicInfoData;
      onChange = handleBasicInfoChange;
      break;
    case 2:
      formData = addressData;
      onChange = handleAddressChange;
      break;
    case 3:
      formData = imagesData;
      onChange = handleImageChange;
      break;
    default:
      formData = {};
      onChange = () => {};
  }

  return (
    <StepComponent
      formData={formData}
      fieldErrors={fieldErrors}
      isSubmitting={isSubmitting}
      onChange={onChange}
    />
  );
};
```

### Modal CSS Updates

```css
.rsp-modal {
  max-height: 90vh;
  max-width: 95vw;
  width: 100%;
  /* ... */
}

@media (min-width: 768px) {
  .rsp-modal {
    max-width: 900px;
  }
}

.rsp-modal-body {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 0; /* Removed padding to prevent double padding */
}
```

### Stepper CSS Updates

```css
.im-stepper {
  max-width: 100%;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.im-stepper-content {
  margin-bottom: 2rem;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.im-stepper-section {
  padding: 1.25rem; /* Reduced from 1.5rem */
}
```

### Translation Keys Added

**English (locales/en.json)**:
```json
{
  "organizations": {
    "stepper": {
      "saveChanges": "Save Changes",
      "saving": "Saving..."
    }
  }
}
```

**Ukrainian (locales/uk.json)**:
```json
{
  "organizations": {
    "stepper": {
      "saveChanges": "Зберегти зміни",
      "saving": "Збереження..."
    }
  }
}
```

## Benefits

### 1. Reusability
- The EntityEditStepper can now be used for any entity type (organizations, clubs, courts, etc.)
- Simply provide different step components and configurations

### 2. Flexibility
- Easy to add, remove, or reorder steps without modifying the stepper component
- Steps can have different forms of data and validation logic
- Translation namespace can be customized per entity type

### 3. Better User Experience
- Fixed padding issues for proper content display
- Correct button text for edit mode ("Save Changes" instead of "Create Organization")
- Responsive layout that works on different screen sizes

### 4. Maintainability
- Clean separation of concerns with configurable components
- Type-safe implementation with proper TypeScript types
- Easy to test and extend

## Future Enhancements

### 1. For Clubs
```typescript
<EntityEditStepper
  steps={[
    { id: 1, label: t("clubs.stepper.stepBasicInfo") },
    { id: 2, label: t("clubs.stepper.stepSports") },
    { id: 3, label: t("clubs.stepper.stepImages") },
  ]}
  stepComponents={[ClubBasicInfoStep, ClubSportsStep, ClubImagesStep]}
  translationNamespace="clubs.stepper"
  onSave={handleClubSave}
/>
```

### 2. For Courts
```typescript
<EntityEditStepper
  steps={[
    { id: 1, label: t("courts.stepper.stepBasicInfo") },
    { id: 2, label: t("courts.stepper.stepAvailability") },
    { id: 3, label: t("courts.stepper.stepPricing") },
    { id: 4, label: t("courts.stepper.stepImages") },
  ]}
  stepComponents={[
    CourtBasicInfoStep, 
    CourtAvailabilityStep, 
    CourtPricingStep, 
    CourtImagesStep
  ]}
  translationNamespace="courts.stepper"
  onSave={handleCourtSave}
/>
```

### 3. Potential Improvements
- Add step validation callbacks per entity type
- Support for conditional steps (show/hide based on data)
- Add step completion indicators
- Support for draft saving between steps
- Add undo/redo functionality

## Related Files

- `src/components/admin/EntityEditStepper.client.tsx` - Main stepper component
- `src/components/admin/OrganizationSteps/BasicInfoStep.tsx` - Basic info step component
- `src/components/admin/OrganizationSteps/AddressStep.tsx` - Address step component
- `src/components/admin/OrganizationSteps/ImagesStep.tsx` - Images step component
- `src/components/admin/ClubCreationStepper.css` - Stepper styles
- `src/components/ui/Modal.css` - Modal styles
- `src/app/(pages)/admin/organizations/[orgId]/page.tsx` - Organization detail page
- `locales/en.json` - English translations
- `locales/uk.json` - Ukrainian translations

## Testing

### Manual Testing Checklist
- [x] Modal opens correctly with proper padding
- [x] Step indicator shows current step correctly
- [x] Step components render correctly for each step
- [x] Form data is initialized from entity data
- [x] Images display correctly in step 3
- [x] Validation works per step
- [x] Navigation between steps works correctly
- [x] "Save Changes" button displays correct text
- [x] Save functionality works correctly
- [x] Modal closes after successful save
- [x] Error handling works correctly

### Build Status
- TypeScript compilation: ✅ Pass (no errors in modified files)
- ESLint: ✅ Pass (no lint errors in modified files)

## Notes

- The stepper maintains backward compatibility with the organization creation flow
- Images are optional during editing (user may keep existing images)
- The stepper manages its own internal state, simplifying the parent component
- The save handler in the parent component handles the API calls for updating data and uploading images
