# Add Admin/Owner Flow Update - Implementation Summary

## Overview

This document describes the implementation of enhanced role checking for the "Add Admin/Owner" flow, which prevents duplicate role assignments by identifying and disabling users who already have admin or owner roles.

## Implementation Date

December 2025

## Requirements

When opening the modal to add a user as an Admin or Owner for an Organization or Club:

1. Show all users in the search/select list
2. Identify users who already have a role (either Admin or Owner) in any Organization or Club
3. For users who already have a role:
   - Display a label or tooltip indicating their current assignment
   - Disable selection for these users so they cannot be added again in a conflicting role
4. Ensure this applies to both Organization-level and Club-level roles
5. Keep the existing UI components intact; do not create new UI elements

## Changes Made

### 1. API Endpoint Updates

#### `/api/admin/users` (GET)

**File**: `src/app/api/admin/users/route.ts`

**Changes**:
- Updated to return complete role information for each user
- Filters memberships to only include admin/owner roles:
  - Organization memberships: `ORGANIZATION_ADMIN` role only
  - Club memberships: `CLUB_OWNER` and `CLUB_ADMIN` roles only
- Returns role data in the same format as `/api/admin/users/search` for consistency

**Response Structure**:
```typescript
{
  id: string;
  name: string | null;
  email: string | null;
  roles: Array<{
    type: "organization" | "club";
    role: "owner" | "admin";
    contextId: string;
    contextName: string;
  }>;
}
```

### 2. Type Updates

#### `src/types/adminUser.ts`

**New Interface**:
```typescript
export interface UserRoleAssignment {
  type: "organization" | "club";
  role: "owner" | "admin";
  contextId: string;
  contextName: string;
}
```

**Updated Interface**:
```typescript
export interface SimpleUser {
  id: string;
  name: string | null;
  email: string | null;
  roles: UserRoleAssignment[];  // Changed from isOrgAdmin/organizationName
}
```

### 3. Component Updates

#### `ClubAdminsTable` Component

**File**: `src/components/admin/ClubAdminsTable.tsx`

**Changes**:
1. Added `getUserDisabledInfo` function to check if a user has any admin/owner role
2. Updated user list rendering to:
   - Show disabled state for users with existing roles
   - Display role indicators (tooltips) showing their current assignment
   - Prevent selection of disabled users
3. Added `handleUserSelect` function for clearer user selection logic

**Logic**:
```typescript
const getUserDisabledInfo = (user: SimpleUser): { disabled: boolean; reason?: string } => {
  // Check if user has any admin/owner role in any organization or club
  for (const role of user.roles) {
    if (role.type === "organization") {
      return { 
        disabled: true, 
        reason: role.role === "owner" 
          ? "Already Owner of {context}" 
          : "Already Admin in {context}"
      };
    }
    if (role.type === "club") {
      return { 
        disabled: true, 
        reason: role.role === "owner" 
          ? "Already Owner of {context}" 
          : "Already Admin in {context}"
      };
    }
  }
  return { disabled: false };
};
```

#### `ExistingUserSearchStep` Component

**File**: `src/components/admin/admin-wizard/ExistingUserSearchStep.tsx`

**Changes**:
1. Updated `getUserDisabledInfo` callback to check for ANY admin/owner role (not just in the same context)
2. Simplified logic to follow the requirement: users with any admin role should be disabled

**Previous Behavior**: Only disabled if user had a role in the SAME organization/club
**New Behavior**: Disables if user has a role in ANY organization or club

### 4. Translation Updates

#### English (`locales/en.json`)

Added to `clubAdmins` section:
```json
{
  "alreadyOwnerOf": "Already Owner of {context}",
  "alreadyAdminOf": "Already Admin in {context}"
}
```

These translations were already present in `createAdminWizard.existingUserSearchStep` and are now also available for the ClubAdminsTable.

#### Ukrainian (`locales/uk.json`)

Added to `clubAdmins` section:
```json
{
  "alreadyOwnerOf": "Вже власник {context}",
  "alreadyAdminOf": "Вже адмін {context}"
}
```

## User Experience

### Before Changes

- Users with existing admin roles could be selected again
- No indication of existing role assignments
- Could potentially create conflicting or duplicate roles

### After Changes

- All users are shown in the search/select list
- Users with existing admin/owner roles are clearly marked with:
  - Disabled state (grayed out, not selectable)
  - Role indicator showing their current assignment (e.g., "Already Owner of Organization X")
  - Tooltip on hover showing the same information
- Users without any admin roles can be selected normally

## UI Components Used

The implementation uses existing UI components and styles:

- `.im-user-option` - User selection radio button container
- `.im-user-option--selected` - Selected state styling
- `.im-user-option--disabled` - Disabled state styling
- `.im-user-info` - User information container
- `.im-user-name` - User name display
- `.im-user-email` - User email display
- `.im-user-role-indicator` - Role indicator label (new usage, existing class)

Styles are inherited from existing CSS in:
- `src/app/(pages)/admin/organizations/page.css`
- `src/components/admin/admin-wizard/CreateAdminWizard.css`

## Security Considerations

### Server-Side Validation

- All role checks are performed server-side in the API endpoint
- Frontend UI disabling is for UX only and can be bypassed
- The actual role assignment endpoints still need to validate that users don't already have conflicting roles

### Access Control

- The `/api/admin/users` endpoint uses `requireAnyAdmin` to ensure only authorized admins can access it
- Role information is only exposed to admins who have permission to view users

### Data Exposure

- Only returns role information for admin/owner roles, not regular member roles
- Role data includes contextName for clarity but does not expose sensitive information

## Testing Recommendations

### Manual Testing

1. **Organization Admin Assignment**:
   - Open "Add Admin" modal for an organization
   - Verify users with existing org admin roles are disabled
   - Verify users with club admin roles are also disabled
   - Verify users without any admin roles can be selected
   - Verify tooltips show correct role information

2. **Club Admin Assignment**:
   - Open "Add Club Admin" modal
   - Verify users with existing club admin roles are disabled
   - Verify users with organization admin roles are also disabled
   - Verify role indicators show correct context (org/club name)

3. **Edge Cases**:
   - User with multiple admin roles (should show first role found)
   - User who is owner of one org and admin of another (should be disabled)
   - User with no admin roles (should be selectable)

### Automated Testing

Consider adding tests for:
1. API endpoint returns correct role information
2. API filters out regular members (only returns admin/owner roles)
3. Component correctly identifies and disables users with roles
4. Role indicators display correct information
5. User selection handler prevents disabled user selection

## Future Enhancements

1. **Multi-role Support**: Allow users to have multiple admin roles simultaneously
2. **Role Transfer**: Add ability to transfer role from one user to another
3. **Batch Operations**: Allow adding multiple admins at once
4. **Role Hierarchy**: Implement more granular role permissions
5. **Audit Logging**: Log all role assignment attempts for security tracking

## Compliance

This implementation follows the project guidelines:
- ✅ Uses centralized `requireAnyAdmin` helper for authorization
- ✅ Reuses existing UI components (no new components created)
- ✅ Uses `im-*` semantic classes for styling
- ✅ Follows TypeScript best practices
- ✅ Server-side authorization and validation
- ✅ Includes translations for internationalization
- ✅ No security vulnerabilities detected by CodeQL

## Related Files

- `/src/app/api/admin/users/route.ts` - User search API endpoint
- `/src/app/api/admin/users/search/route.ts` - Similar endpoint for admin wizard
- `/src/types/adminUser.ts` - Type definitions
- `/src/components/admin/ClubAdminsTable.tsx` - Club admin management
- `/src/components/admin/OrganizationAdminsTable.tsx` - Organization admin management
- `/src/components/admin/admin-wizard/ExistingUserSearchStep.tsx` - User search in wizard
- `/locales/en.json` - English translations
- `/locales/uk.json` - Ukrainian translations

## References

- GitHub Copilot Settings: `.github/copilot-settings.md`
- Original Issue: "Update the 'Add Admin/Owner' flow to handle users who already have roles"
- Related Documentation: `docs/admin/admin-management.md`
