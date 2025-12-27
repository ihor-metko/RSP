# Invite Wizard Integration & Edge Case Handling

## Overview

This document describes the integration of the CreateAdminWizard component with the Invite API system and comprehensive edge case handling. The implementation ensures smooth user experiences across all admin contexts while maintaining data consistency and security.

## Components

### CreateAdminWizard

Location: `src/components/admin/admin-wizard/CreateAdminWizard.client.tsx`

A universal multi-step wizard for creating admins and inviting users. Supports:
- **Five-step flow**: Context selection → User source → User details → Review → Confirmation
- **Dual user sources**: Existing users (direct role assignment) or New users (email invitation)
- **Multiple contexts**: Root admin, Organization admin, Club admin
- **Comprehensive error handling**: All HTTP error codes with retry capability
- **Real-time updates**: Zustand store integration for immediate UI updates

### Integration Points

The wizard integrates with:

1. **Invite API** (`/api/invites`): For sending email invitations to new users
2. **Admin Creation API** (`/api/admin/admins/create`): For assigning roles to existing users
3. **useAdminUsersStore**: For real-time user list updates
4. **useOrganizationStore**: For organization data
5. **useAdminClubStore**: For club data

## Usage Contexts

### 1. Global Admin Users Page
**Path**: `/admin/users`
**Access**: Root admins and organization admins
**Configuration**:
```typescript
{
  context: "root",
  allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
  onSuccess: (userId) => {
    fetchUsers(true);
    router.push(`/admin/users/${userId}`);
  }
}
```

### 2. Organization Detail Page
**Path**: `/admin/organizations/[orgId]`
**Component**: `OrganizationAdminsTable`
**Access**: Organization admins
**Configuration**:
```typescript
{
  context: "organization",
  defaultOrgId: orgId,
  allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
  onSuccess: () => {
    onRefresh();
  }
}
```

### 3. Club Detail Page
**Path**: `/admin/clubs/[id]`
**Component**: `ClubAdminsSection`
**Access**: Organization admins and club owners
**Configuration**:
```typescript
{
  context: "club",
  defaultOrgId: org.id,
  defaultClubId: clubId,
  allowedRoles: hasOwner ? ["CLUB_ADMIN"] : ["CLUB_OWNER", "CLUB_ADMIN"],
  onSuccess: () => {
    fetchClubAdmins();
  }
}
```

## Edge Case Handling

### 1. Duplicate Email (409 Conflict)

**Scenario**: Attempting to invite a user whose email already exists in the system.

**Response**:
```json
{
  "error": "A user with this email already exists",
  "field": "email"
}
```

**Handling**:
- Show error message on email field
- Navigate back to user details step (step 3)
- Display toast notification with error
- Allow user to correct the email

### 2. Existing Active Invite (409 Conflict)

**Scenario**: An active (pending) invite already exists for the same email and scope.

**Response**:
```json
{
  "error": "An active invite already exists for this email and scope",
  "existingInviteId": "invite-123"
}
```

**Handling**:
- Show warning message on confirmation step
- Display toast notification
- Do not allow duplicate invite
- User can cancel and check existing invites

### 3. Owner Already Exists (409 Conflict)

**Scenario**: Attempting to create an organization owner or club owner when one already exists.

**Response**:
```json
{
  "error": "This organization already has an owner",
  "field": "owner"
}
```

**Handling**:
- Show error on confirmation step
- Display clear message about owner constraint
- Do not navigate back (terminal error)
- User must cancel and select different role

### 4. Permission Denied (403 Forbidden)

**Scenario**: User lacks permission to invite/assign the selected role.

**Response**:
```json
{
  "error": "Only organization admins can invite organization members"
}
```

**Handling**:
- Show permission error on confirmation step
- Display clear permission-related message
- Do not allow retry
- User must cancel

### 5. Network Errors

**Scenario**: Network timeout, connection failure, or DNS resolution failure.

**Error**: JavaScript Error object (e.g., `fetch failed`)

**Handling**:
- Detect network error in catch block
- Set `isNetworkError = true`
- Show error message on confirmation step
- **Enable retry button**
- Store last payload in `lastSubmitPayload`
- User can retry with same data

**Retry Flow**:
1. User clicks "Retry" button
2. `handleRetry()` uses saved `lastSubmitPayload`
3. Makes same API call with same data
4. Uses same comprehensive error handling
5. On success → normal success flow
6. On failure → stays on error with retry option

### 6. Phone Number Conflict (409 Conflict)

**Scenario**: Phone number already exists in system (rare).

**Response**:
```json
{
  "error": "A user with this phone number already exists",
  "field": "phone"
}
```

**Handling**:
- Show error on phone field
- Navigate back to user details step
- Display toast notification
- User can correct phone number

## Error Handling Architecture

### Type Definitions

```typescript
interface ErrorResponse {
  error?: string;
  field?: string;
  existingInviteId?: string;
}

interface SuccessResponse {
  userId?: string;
  invite?: { id: string };
}
```

### Helper Functions

#### `handleApiError(response, errorData)`

Centralized error handling for all HTTP responses:

- **409 Conflicts**:
  - `field: "email"` → Email already exists
  - `field: "phone"` → Phone already exists
  - `field: "owner"` → Owner already exists
  - `existingInviteId` → Active invite exists
  - Other → Generic conflict message

- **403 Forbidden**: Permission denied
- **Other errors**: Generic error message

Actions:
- Sets specific error messages
- Shows toast notifications
- Navigates to appropriate step
- Updates confirmation state

#### `handleApiSuccess(responseData)`

Centralized success handling:

1. Shows success message
2. Displays success toast
3. Refreshes `useAdminUsersStore` (ensures new users appear in lists)
4. Calls `config.onSuccess()` callback
5. Sets confirmation step to success state

### Flow Diagram

```
User submits wizard
       ↓
handleSubmit()
       ↓
   API call
       ↓
  ┌────┴────┐
  ↓         ↓
Error   Success
  ↓         ↓
handleApi handleApi
Error()   Success()
  ↓         ↓
Show      Refresh
error     store
  ↓         ↓
Toast     Call
  ↓      onSuccess()
Stay or    ↓
Navigate  Show
         success
```

## State Management Integration

### useAdminUsersStore

**Purpose**: Centralized admin user data management

**Integration**:
```typescript
const refetchAdminUsers = useAdminUsersStore((state) => state.refetch);

// After successful creation/invite
await refetchAdminUsers();
```

**Benefits**:
- Newly invited/assigned users appear immediately in admin lists
- No manual page refresh required
- Single source of truth for user data
- Optimistic updates possible

**Error Handling**:
```typescript
try {
  await refetchAdminUsers();
} catch (refreshError) {
  // Log but don't fail - user was created successfully
  console.error("Failed to refresh admin users:", refreshError);
}
```

The refresh is non-blocking - if it fails, the user was still created successfully.

## UI/UX Features

### Toast Notifications

All operations show toast notifications:

- **Success**: Green toast with success message
- **Error**: Red toast with specific error message
- **Auto-dismiss**: 5 seconds
- **Position**: Top-right corner (CSS)

### Loading States

- **Processing button**: Shows "Processing..." during submission
- **Retrying button**: Shows "Retrying..." during retry
- **Disabled buttons**: All buttons disabled during API calls
- **Loading indicators**: Skeleton loaders for store data

### Dark Theme Consistency

All wizard components use `im-*` semantic classes:

- `im-wizard`: Main wizard container
- `im-wizard-indicator`: Step progress indicator
- `im-wizard-section`: Content sections
- `im-wizard-navigation`: Button container
- `im-confirm-success` / `im-confirm-error`: Confirmation states

## Validation Rules

### Step 1: Context & Role
- Organization is required
- Role is required
- Club is required for club roles (CLUB_OWNER, CLUB_ADMIN)

### Step 2: User Source
- User source must be "existing" or "new"

### Step 3: User Details

**For existing users**:
- User ID is required
- Must select from search results

**For new users (invite flow)**:
- Email is required and must be valid format
- Name is optional (metadata only)
- Phone is optional (metadata only, validated if provided)

### Step 4: Review
- All previous validations must pass
- Shows summary of all selections

### Step 5: Confirmation
- Read-only step showing success or error
- Retry button for network errors only
- Close button for all other states

## API Integration

### Invite API (New Users)

**Endpoint**: `POST /api/invites`

**Payload**:
```json
{
  "email": "user@example.com",
  "role": "ORGANIZATION_ADMIN",
  "organizationId": "org-123"
}
```

**Success Response**:
```json
{
  "success": true,
  "invite": {
    "id": "invite-123",
    "email": "user@example.com",
    "role": "ORGANIZATION_ADMIN",
    "token": "abc123..."
  }
}
```

### Admin Creation API (Existing Users)

**Endpoint**: `POST /api/admin/admins/create`

**Payload**:
```json
{
  "userSource": "existing",
  "role": "ORGANIZATION_ADMIN",
  "userId": "user-456",
  "organizationId": "org-123"
}
```

**Success Response**:
```json
{
  "userId": "user-456",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "ORGANIZATION_ADMIN",
  "message": "Role assigned successfully."
}
```

## Security Considerations

### Permission Checks

All API calls validate permissions server-side:

1. **requireAuth**: User must be authenticated
2. **requireAnyAdmin**: User must be an admin
3. **Role hierarchy**: Cannot assign role higher than own
4. **Scope validation**: Must have access to target org/club

### Token Security (Invite Flow)

- Tokens are 256-bit cryptographically secure
- SHA-256 hashing before storage
- Constant-time comparison
- Single-use tokens
- 7-day expiration

### Data Validation

- Email format validation (regex)
- Phone format validation (if provided)
- Role validation against allowed roles
- Scope validation (org/club ID matching)

## Testing

### Unit Tests

Location: `src/__tests__/invite-api.test.ts` and `invite-utils.test.ts`

Coverage:
- ✅ 46 passing tests
- Token generation and hashing
- Invite creation with various scenarios
- Error handling (409, 403, 400)
- Permission validation
- Owner uniqueness constraints

### Integration Testing

**Recommended manual tests**:

1. **Happy paths**:
   - Create new organization admin from root context
   - Invite new club admin from organization context
   - Assign existing user as club admin from club context

2. **Error scenarios**:
   - Try to invite with duplicate email
   - Try to create second organization owner
   - Try to assign role without permission
   - Simulate network error and retry

3. **State updates**:
   - Verify new user appears in admin users list
   - Verify organization admins table updates
   - Verify club admins section updates

4. **UI/UX**:
   - Check dark theme consistency
   - Verify toast notifications appear
   - Test retry button for network errors
   - Verify navigation between steps

## Troubleshooting

### Issue: Users not appearing in lists after creation

**Cause**: Store refresh failed

**Solution**:
- Check browser console for refresh errors
- Manually refresh the page
- Check network tab for `/api/admin/users/list` calls

### Issue: Retry button not appearing on error

**Cause**: Error is not a network error (e.g., 409, 403)

**Solution**:
- Retry is only for network errors
- For validation errors, go back and fix inputs
- For permission errors, user needs different role

### Issue: Permission denied when creating admin

**Cause**: User lacks required role or scope access

**Solution**:
- Verify user has correct admin role
- Check user's managed organization/club IDs
- Ensure trying to create admin within scope
- Contact root admin if needed

## Future Enhancements

Potential improvements (out of scope for this task):

1. **Bulk invites**: Invite multiple users at once
2. **Invite management**: View/cancel pending invites
3. **Email templates**: Customize invitation emails
4. **Role suggestions**: Suggest appropriate roles based on context
5. **Audit log**: Track all invite/assignment operations
6. **Invite expiration**: Custom expiration times
7. **Resend invites**: Resend expired invites

## Related Documentation

- [Invite System Implementation](/docs/invite-system-implementation.md)
- [Invite API Documentation](/docs/api/invite-system.md)
- [Create Admin Wizard](/docs/admin/create-admin-wizard.md)
- [Authorization Implementation](/docs/authorization-implementation-summary.md)
- [Copilot Settings](/. github/copilot-settings.md)
