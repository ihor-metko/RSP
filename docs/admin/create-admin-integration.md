# Create Admin Integration Documentation

## Overview

This document describes the integration of the Create Admin modal into the Admin Users page. The implementation allows ROOT_ADMIN and ORGANIZATION_ADMIN users to create new admin users directly from the Admin Users list page.

## Implementation Details

### Files Modified

- `/src/app/(pages)/admin/users/page.tsx` - Admin Users page with integrated Create Admin modal

### Key Components Used

1. **CreateAdminModal** (`@/components/admin/admin-wizard`)
   - A reusable modal component that wraps the CreateAdminWizard
   - Handles modal open/close state
   - Provides proper callbacks for success and cancellation

2. **CreateAdminWizardConfig** (`@/types/adminWizard`)
   - Type definition for wizard configuration
   - Specifies context, allowed roles, and callbacks

### Architecture

The implementation follows the existing pattern established in the Organization Dashboard page (`/src/app/(pages)/admin/orgs/[orgId]/dashboard/page.tsx`).

#### Wizard Configuration Logic

The wizard configuration is determined dynamically based on the logged-in user's admin status:

```typescript
const getWizardConfig = (): CreateAdminWizardConfig => {
  const adminStatus = useUserStore.getState().adminStatus;
  
  if (adminStatus?.adminType === "root_admin") {
    // Root admin can create both org and club admins
    return {
      context: "root",
      allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
      onSuccess: (userId) => {
        fetchUsers();
        router.push(`/admin/users/${userId}`);
      },
    };
  } else if (adminStatus?.adminType === "organization_admin" && adminStatus.managedIds.length > 0) {
    // Organization admin can create admins for their organization
    return {
      context: "organization",
      defaultOrgId: adminStatus.managedIds[0],
      allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
      onSuccess: () => {
        fetchUsers();
      },
    };
  }
  
  // Fallback configuration
  return {
    context: "root",
    allowedRoles: ["ORGANIZATION_ADMIN"],
    onSuccess: () => {
      fetchUsers();
    },
  };
};
```

### User Flow

1. User with ROOT_ADMIN or ORGANIZATION_ADMIN role views the Admin Users page
2. User clicks the "Create User" button in the toolbar
3. CreateAdminModal opens with a 3-step wizard:
   - **Step 1: Select Context** - Choose organization, club (if applicable), and admin role
   - **Step 2: User Details** - Enter name, email, and phone number
   - **Step 3: Review & Confirm** - Review all information before submission
4. Upon successful creation:
   - The users list refreshes automatically
   - For root admins, the page navigates to the newly created user's detail page
   - For organization admins, the modal closes and the list updates
5. The new admin appears in the users table

### Permissions

The Create Admin functionality is available to:
- **ROOT_ADMIN**: Can create any type of admin (Organization Admin or Club Admin) for any organization/club
- **ORGANIZATION_ADMIN**: Can create admins for their own organization only

### API Endpoint

The modal uses the `/api/admin/admins/create` endpoint to create new admin users. The endpoint:
- Validates permissions server-side
- Checks for duplicate email/phone
- Creates the user record
- Assigns the appropriate membership role
- Returns the created user's ID

### Success Callbacks

Different behaviors based on user role:

- **Root Admin**: After creating an admin, automatically navigates to the new user's detail page
- **Organization Admin**: After creating an admin, refreshes the users list and closes the modal

This provides better UX - root admins who manage many organizations often want to see the user details immediately, while organization admins typically want to continue viewing their user list.

### Error Handling

The wizard handles several error scenarios:
- Validation errors (missing fields, invalid formats)
- Duplicate email or phone number (409 conflict)
- Permission errors (403 forbidden)
- Network errors
- Server errors (500)

Errors are displayed inline in the wizard at the appropriate step, and users can correct them without losing their input.

## Testing

### Manual Testing Checklist

- [ ] Root admin can open the Create Admin modal from Admin Users page
- [ ] Root admin can select any organization and role
- [ ] Root admin can complete the wizard and create an admin
- [ ] After creation, root admin is redirected to the new user's detail page
- [ ] Organization admin can open the Create Admin modal
- [ ] Organization admin sees their organization pre-selected and locked
- [ ] Organization admin can create an admin for their organization
- [ ] After creation, the users list refreshes automatically
- [ ] Validation errors are displayed correctly
- [ ] Duplicate email/phone errors are handled gracefully
- [ ] Club admin does NOT see the Create User button (no permission)

### Automated Tests

- Existing API tests for `/api/admin/admins/create` continue to pass
- No new TypeScript errors introduced
- Linter runs successfully with no new errors
- No security vulnerabilities detected (CodeQL analysis)

## Related Components

- `/src/components/admin/admin-wizard/CreateAdminModal.tsx` - Modal wrapper
- `/src/components/admin/admin-wizard/CreateAdminWizard.client.tsx` - Wizard implementation
- `/src/components/admin/admin-wizard/SelectContextStep.tsx` - Step 1
- `/src/components/admin/admin-wizard/UserDataStep.tsx` - Step 2
- `/src/components/admin/admin-wizard/ReviewStep.tsx` - Step 3
- `/src/app/api/admin/admins/create/route.ts` - API endpoint
- `/src/app/(pages)/admin/admins/create/page.tsx` - Standalone create admin page

## Future Improvements

Potential enhancements that could be considered:

1. **Batch Creation**: Allow creating multiple admins at once via CSV upload
2. **Role Templates**: Pre-configured role templates with specific permissions
3. **Invitation Flow**: Send email invitations instead of immediate creation
4. **Audit Trail**: Enhanced logging of who created which admin and when
5. **Custom Permissions**: Fine-grained permission configuration per admin

## Maintenance Notes

- The CreateAdminModal is a shared component - changes to it will affect both the Admin Users page and the standalone Create Admin page
- The wizard configuration logic should be consistent with the authorization logic in `/src/lib/requireRole.ts`
- Translation keys for the wizard are defined in `/locales/en.json` and `/locales/uk.json`
- CSS styles for the wizard are in `/src/components/admin/admin-wizard/CreateAdminWizard.css`
