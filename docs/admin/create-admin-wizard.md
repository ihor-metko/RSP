# Universal Create Admin Wizard

## Overview

The Universal Create Admin Wizard is a reusable multi-step form component that handles admin creation across all contexts in the ArenaOne platform.

## Features

- **Three-step wizard flow**:
  1. Context selection (organization/club)
  2. User details entry
  3. Review & confirm

- **Context-aware behavior**:
  - Automatically pre-fills organization/club based on access level
  - Adapts allowed roles based on creator's permissions
  - Validates authorization server-side

- **Comprehensive validation**:
  - Email format and uniqueness checks
  - Phone format validation
  - Role-based authorization
  - Inline error display

- **Fully reusable**:
  - Configurable via props
  - Works in root, org, and club contexts
  - Single component handles all scenarios

## Usage

### Root Admin Context

```tsx
import { CreateAdminWizard } from "@/components/admin/admin-wizard";

const config = {
  context: "root",
  allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
  onSuccess: (userId) => router.push(`/admin/users/${userId}`),
  onCancel: () => router.push("/admin/users"),
};

<CreateAdminWizard config={config} />
```

### Organization Context

```tsx
const config = {
  context: "organization",
  defaultOrgId: "org-123",
  allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
  onSuccess: (userId) => router.push(`/admin/orgs/${orgId}/dashboard`),
  onCancel: () => router.push(`/admin/orgs/${orgId}/dashboard`),
};

<CreateAdminWizard config={config} />
```

### Club Context

```tsx
const config = {
  context: "club",
  defaultOrgId: "org-123",
  defaultClubId: "club-456",
  allowedRoles: ["CLUB_ADMIN"],
  onSuccess: (userId) => router.push(`/admin/clubs/${clubId}`),
  onCancel: () => router.push(`/admin/clubs/${clubId}`),
};

<CreateAdminWizard config={config} />
```

## Access Points

The wizard is available at the following routes:

- `/admin/admins/create` - Root/Org admin context
- `/admin/orgs/[orgId]/admins/create` - Organization context
- `/admin/clubs/[id]/admins/create` - Club context

## Configuration Options

### CreateAdminWizardConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `context` | `"root" \| "organization" \| "club"` | Yes | Current context |
| `allowedRoles` | `AdminRole[]` | Yes | Roles that can be assigned |
| `defaultOrgId` | `string` | No | Pre-selected organization ID |
| `defaultClubId` | `string` | No | Pre-selected club ID |
| `onSuccess` | `(userId: string) => void` | No | Success callback |
| `onCancel` | `() => void` | No | Cancel callback |

## Authorization Rules

### Root Admin
- Can create any admin type
- Can select any organization
- Has access to all roles

### Organization Admin
- Can create admins for their managed organizations only
- Can create both org and club admins within their orgs
- Cannot create admins for other organizations

### Club Admin
- **Cannot create any admins** (403 Forbidden)

## API Endpoint

### POST /api/admin/admins/create

Creates a new admin user with role assignment.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+380501234567",
  "role": "ORGANIZATION_ADMIN",
  "organizationId": "org-123"
}
```

**Response:**
```json
{
  "userId": "user-789",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "ORGANIZATION_ADMIN",
  "message": "Admin created successfully. An invitation email will be sent."
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Organization/Club not found
- `409` - Email already exists

## Known Limitations

- **Phone field**: Currently validated but not stored in the database
  - The User model doesn't include a phone field yet
  - Phone data is collected for future use
  - TODO: Add phone field to User schema

## Testing

The wizard has comprehensive test coverage:

- 16 unit tests covering all scenarios
- Tests for authentication, authorization, validation
- All tests passing

Run tests:
```bash
npm test -- src/__tests__/admin-create-admin.test.ts
```

## File Structure

```
src/
├── components/admin/admin-wizard/
│   ├── CreateAdminWizard.client.tsx  # Main wizard component
│   ├── CreateAdminWizard.css         # Wizard styles
│   ├── SelectContextStep.tsx          # Step 1: Context selection
│   ├── UserDataStep.tsx               # Step 2: User details
│   ├── ReviewStep.tsx                 # Step 3: Review
│   └── index.ts                       # Exports
├── types/adminWizard.ts               # TypeScript types
├── app/
│   ├── (pages)/admin/
│   │   ├── admins/create/page.tsx          # Root context
│   │   ├── orgs/[orgId]/admins/create/page.tsx  # Org context
│   │   └── clubs/[id]/admins/create/page.tsx    # Club context
│   └── api/admin/admins/create/route.ts    # API endpoint
└── __tests__/admin-create-admin.test.ts    # Tests
```

## Styling

The wizard follows the project's CSS conventions:

- Uses `im-wizard-*` prefix for all classes
- Supports dark theme
- Responsive design
- Accessible with ARIA labels

Key CSS classes:
- `im-wizard` - Main container
- `im-wizard-indicator` - Step progress indicator
- `im-wizard-section` - Step content container
- `im-wizard-navigation` - Button navigation
- `im-wizard-toast` - Notification messages

## Future Enhancements

1. Add phone field to User schema
2. Implement phone uniqueness validation
3. Add email invitation system
4. Support for custom admin metadata
5. Batch admin creation
6. Admin role transfer/delegation
