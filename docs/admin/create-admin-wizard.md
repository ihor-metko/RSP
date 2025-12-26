# Universal Create Admin Wizard

## Overview

The Universal Create Admin Wizard is a reusable multi-step form component that handles admin creation and role assignment across all contexts in the ArenaOne platform.

## Features

- **Five-step wizard flow**:
  1. Context & Role selection (organization/club and role)
  2. User source selection (existing user vs new user)
  3. User details (search existing or enter new user info)
  4. Review & confirm
  5. Confirmation result

- **Support for Owner Roles**:
  - Organization Owner (with isPrimaryOwner flag)
  - Organization Admin
  - Club Owner
  - Club Admin

- **Dual User Source Support**:
  - Assign roles to existing users (search by email)
  - Create new users with invitation flow (no password required)

- **Context-aware behavior**:
  - Automatically pre-fills organization/club based on access level
  - Adapts allowed roles based on the creator's permissions
  - Validates authorization server-side
  - Enforces single owner per organization/club constraint

- **Comprehensive validation**:
  - Email format and uniqueness checks
  - Phone format validation
  - Role-based authorization
  - Owner uniqueness validation
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
  allowedRoles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "CLUB_OWNER", "CLUB_ADMIN"],
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
  allowedRoles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "CLUB_OWNER", "CLUB_ADMIN"],
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
  allowedRoles: ["CLUB_OWNER", "CLUB_ADMIN"],
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
- Can create any admin type including owners
- Can select any organization or club
- Has access to all roles

### Organization Admin
- Can create admins for their managed organizations only
- Can create both org and club admins within their orgs
- Can create owners if organization/club doesn't have one yet
- Cannot create admins for other organizations

### Club Admin
- **Cannot create any admins** (403 Forbidden)

## Owner Role Constraints

### Organization Owner
- Each organization can have exactly **one** Organization Owner
- Tracked via `isPrimaryOwner: true` flag in Membership table
- Attempting to create a second owner returns 409 Conflict
- Owner has `ORGANIZATION_ADMIN` role with `isPrimaryOwner` flag

### Club Owner
- Each club can have exactly **one** Club Owner
- Uses `CLUB_OWNER` role in ClubMembership table
- Attempting to create a second owner returns 409 Conflict
- Higher privilege level than Club Admin

## API Endpoint

### POST /api/admin/admins/create

Creates a new admin user with role assignment or assigns role to existing user.

**Request Body (New User):**
```json
{
  "userSource": "new",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+380501234567",
  "role": "ORGANIZATION_OWNER",
  "organizationId": "org-123"
}
```

**Request Body (Existing User):**
```json
{
  "userSource": "existing",
  "userId": "user-456",
  "role": "CLUB_ADMIN",
  "clubId": "club-123"
}
```

**Supported Roles:**
- `ORGANIZATION_OWNER` - Primary owner of organization (isPrimaryOwner: true)
- `ORGANIZATION_ADMIN` - Organization administrator
- `CLUB_OWNER` - Primary owner of club
- `CLUB_ADMIN` - Club administrator

**Response:**
```json
{
  "userId": "user-789",
  "email": "john@example.com",
  "name": "John Doe",
  "role": "ORGANIZATION_OWNER",
  "message": "Admin created successfully. An invitation email will be sent."
}
```

**For existing users:**
```json
{
  "userId": "user-456",
  "email": "existing@example.com",
  "name": "Existing User",
  "role": "CLUB_ADMIN",
  "message": "Role assigned successfully."
}
```

**Error Responses:**
- `400` - Validation error (missing fields, invalid format, etc.)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Organization/Club/User not found
- `409` - Conflict (email exists, owner already exists, user already has role)

## User Search Endpoint

### GET /api/admin/users/search

Search for users by email to assign roles to existing users.

**Query Parameters:**
- `email` (required) - Email address to search for (supports partial matching)

**Response:**
```json
{
  "users": [
    {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

**Error Responses:**
- `400` - Email parameter missing
- `401` - Unauthorized
- `403` - Forbidden (not an admin)

## Wizard Steps

### Step 1: Context & Role Selection
- Select organization (pre-filled in org/club context)
- Select club if creating club-level role (pre-filled in club context)
- Select role (Organization Owner, Organization Admin, Club Owner, or Club Admin)

### Step 2: User Source Selection
- Choose between:
  - **Existing User**: Assign role to someone who already has an account
  - **New User**: Create a new user account and send invitation

### Step 3: User Details

#### For Existing Users:
- Search by email address
- Select from search results
- View user information (name, email)

#### For New Users:
- Enter full name
- Enter email address (invitation will be sent here)
- Enter phone number

### Step 4: Review & Confirm
- Review all selected information
- Shows action that will be performed:
  - "A new user will be created and an invitation email will be sent"
  - "The selected user will be assigned the role"

### Step 5: Confirmation
- Success or error message
- For success: confirmation with next steps
- For errors: clear error message with option to go back

## Known Limitations

- **Phone field**: Currently validated but not stored in the database
  - The User model doesn't include a phone field yet
  - Phone data is collected for future use
  - TODO: Add phone field to User schema

## Testing

The wizard has comprehensive test coverage:

- 22 unit tests covering all scenarios
- Tests for authentication, authorization, validation
- Tests for owner role creation and constraints
- Tests for existing user assignment
- All tests passing

Run tests:
```bash
npm test -- src/__tests__/admin-create-admin.test.ts
```

## File Structure

```
src/
├── components/admin/admin-wizard/
│   ├── CreateAdminWizard.client.tsx  # Main wizard component (5 steps)
│   ├── CreateAdminWizard.css         # Wizard styles
│   ├── SelectContextStep.tsx          # Step 1: Context & role selection
│   ├── UserSourceStep.tsx             # Step 2: User source selection
│   ├── ExistingUserSearchStep.tsx     # Step 3a: Search existing users
│   ├── UserDataStep.tsx               # Step 3b: New user details
│   ├── ReviewStep.tsx                 # Step 4: Review
│   ├── ConfirmStep.tsx                # Step 5: Confirmation
│   └── index.ts                       # Exports
├── types/adminWizard.ts               # TypeScript types
├── app/
│   ├── (pages)/admin/
│   │   ├── admins/create/page.tsx          # Root context
│   │   ├── orgs/[orgId]/admins/create/page.tsx  # Org context
│   │   └── clubs/[id]/admins/create/page.tsx    # Club context
│   └── api/admin/
│       ├── admins/create/route.ts          # Admin creation API
│       └── users/search/route.ts           # User search API
└── __tests__/admin-create-admin.test.ts    # Tests (22 tests)
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
3. Add email invitation system with templates
4. Support for custom admin metadata
5. Batch admin creation
6. Admin role transfer/delegation
7. Audit logging for role changes
8. UI improvements for existing user search (autocomplete, recent users)
