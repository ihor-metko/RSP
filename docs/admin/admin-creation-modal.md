# Admin Creation Modal

## Overview

The admin creation functionality has been refactored from separate pages to a reusable modal component. This provides a better user experience by keeping users in context when creating new administrators.

## Components

### CreateAdminModal

Located at: `src/components/admin/admin-wizard/CreateAdminModal.tsx`

A reusable modal component that wraps the `CreateAdminWizard` component. It can be triggered from any page in the admin interface to create organization or club administrators.

**Usage:**

```typescript
import { CreateAdminModal } from "@/components/admin/admin-wizard";
import type { CreateAdminWizardConfig } from "@/types/adminWizard";

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const config: CreateAdminWizardConfig = {
    context: "organization", // or "club" or "root"
    defaultOrgId: "org-123",
    allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
    onSuccess: (userId) => {
      console.log("Admin created:", userId);
      setIsModalOpen(false);
    },
    onCancel: () => {
      setIsModalOpen(false);
    },
  };
  
  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Create Admin
      </button>
      
      <CreateAdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={config}
      />
    </>
  );
}
```

## Configuration

The modal accepts a `config` prop of type `CreateAdminWizardConfig`:

```typescript
interface CreateAdminWizardConfig {
  // Context determines the pre-selection behavior
  context: "root" | "organization" | "club";
  
  // Pre-selected organization ID (when accessed from org context)
  defaultOrgId?: string;
  
  // Pre-selected club ID (when accessed from club context)
  defaultClubId?: string;
  
  // Roles that can be assigned based on creator's permissions
  allowedRoles: AdminRole[];
  
  // Callback when admin is successfully created
  onSuccess?: (userId: string) => void;
  
  // Callback when wizard is cancelled
  onCancel?: () => void;
}
```

## Context Types

### Root Context
- Used by root admins
- Can select any organization
- Can create both organization and club admins

### Organization Context  
- Used when creating admins for a specific organization
- Organization is pre-selected
- Can create organization admins or club admins within that organization

### Club Context
- Used when creating admins for a specific club
- Both organization and club are pre-selected
- Only club admin role is available

## Workflow

1. User clicks "Create Admin" or "Invite Admin" button
2. Modal opens with the appropriate wizard configuration
3. User completes the 3-step wizard:
   - **Step 1**: Select Context (organization, club, role)
   - **Step 2**: Enter User Details (name, email, phone)
   - **Step 3**: Review & Confirm
4. On success:
   - Admin is created via `/api/admin/admins/create` endpoint
   - Success callback is triggered
   - Modal closes automatically
5. On cancel:
   - Cancel callback is triggered
   - Modal closes

## Where It's Used

### Organization Dashboard
- **Location**: `/admin/orgs/[orgId]/dashboard`
- **Trigger**: "Invite Club Admin" button in Quick Actions section
- **Context**: Organization context with pre-selected organization

### Club Detail Page
- **Location**: `/admin/clubs/[id]`
- **Component**: `ClubAdminsSection`
- **Note**: Uses its own modal with additional functionality for assigning existing users

## API Endpoint

The modal uses the centralized admin creation endpoint:

**POST** `/api/admin/admins/create`

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "ORGANIZATION_ADMIN",
  "organizationId": "org-123"
}
```

Or for club admins:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "role": "CLUB_ADMIN",
  "clubId": "club-456"
}
```

## Validations

- Email must be unique and in valid format
- Phone must be provided and in valid format
- Role must be either ORGANIZATION_ADMIN or CLUB_ADMIN
- Organization ID required for organization admins
- Club ID required for club admins
- User must have appropriate permissions to create admins

## Migration Notes

### Removed Pages

The following standalone pages were removed:
- `/admin/orgs/[orgId]/admins/create/page.tsx`
- `/admin/clubs/[id]/admins/create/page.tsx`

These have been replaced with the modal-based approach.

### Club Admin Creation

The club detail page already had a modal for managing club admins in the `ClubAdminsSection` component. This modal provides additional functionality (assigning existing users) that is specific to clubs, so it was kept separate from the `CreateAdminModal`.

## Future Enhancements

Potential improvements:
- Add support for bulk admin creation
- Integrate with email invitation system
- Add admin role transfer functionality
- Support for custom roles and permissions
