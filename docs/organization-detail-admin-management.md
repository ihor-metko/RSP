# Organization Detail Admin Management - Implementation

## Overview
This document describes the implementation of enhanced SuperAdmin and ClubAdmin management features on the Organization Detail page.

## Features Implemented

### 1. View Profile Modal
- **Component**: `UserProfileModal` (`src/components/admin/UserProfileModal.tsx`)
- **Purpose**: Display detailed user information in a modal dialog
- **Information Shown**:
  - User avatar (first letter of name)
  - Name and email
  - Status badge (Active/Blocked)
  - Role badge (Root Admin, Organization Admin, Club Admin)
  - Basic information (Member Since, Last Login, Total Bookings)
  - Organization memberships (with role and owner status)
  - Club memberships (with role)

### 2. Enhanced OrganizationAdminsTable
- **File**: `src/components/admin/OrganizationAdminsTable.tsx`
- **New Features**:
  - Added "View Profile" button for each organization admin
  - Opens UserProfileModal when clicked
  - Accessible to all users (Root Admin, Organization Owner, and other admins)
  
- **Permission Logic**:
  - Root Admin: Full access to all management features
  - Organization Owner (isPrimaryOwner): Full access to all management features
  - Other admins: Can only view profiles

### 3. Enhanced ClubAdminsTable
- **File**: `src/components/admin/ClubAdminsTable.tsx`
- **New Features**:
  - Added "View Profile" button for each club admin
  - Opens UserProfileModal when clicked
  - Accessible to all users
  
- **Permission Logic**:
  - Root Admin: Full access to all management features
  - Organization Admin: Full access to club admin management
  - Other users: Can only view profiles

## Existing Features (Already Implemented)

### SuperAdmin Management
The following features were already available in OrganizationAdminsTable:

1. **Assign SuperAdmin**: 
   - "Add Admin" button
   - Can add existing user or create new user
   - Only accessible to Root Admin and Organization Owner

2. **Reassign SuperAdmin** (Change Owner):
   - "Change Owner" button
   - Select a new primary owner from existing admins
   - Current owner becomes regular admin
   - Only accessible to Root Admin and Organization Owner

3. **Revoke SuperAdmin**:
   - "Remove" button for each admin
   - Removes admin role from organization
   - Only accessible to Root Admin and Organization Owner

## Translation Keys Added

### English (en.json)
```json
"common": {
  "viewProfile": "View Profile"
},
"userProfile": {
  "title": "User Profile",
  "basicInfo": "Basic Information",
  "organizations": "Organizations",
  "clubs": "Clubs"
}
```

### Ukrainian (uk.json)
```json
"common": {
  "viewProfile": "Переглянути профіль"
},
"userProfile": {
  "title": "Профіль користувача",
  "basicInfo": "Основна інформація",
  "organizations": "Організації",
  "clubs": "Клуби"
}
```

## Technical Implementation

### Component Structure
```
OrganizationDetailPage
├── OrganizationAdminsTable
│   ├── View Profile Button → UserProfileModal
│   ├── Add Admin Button (Root/Owner only)
│   ├── Change Owner Button (Root/Owner only)
│   └── Remove Button (Root/Owner only)
└── ClubAdminsTable
    ├── View Profile Button → UserProfileModal
    ├── Add Admin Button (Root/OrgAdmin only)
    ├── Edit Button (Root/OrgAdmin only)
    └── Remove Button (Root/OrgAdmin only)
```

### Permission Checks
The implementation follows the copilot-settings.md guidelines:

1. **Uses centralized user store**: All role checks use `useUserStore`
2. **No ad-hoc role checks**: Uses `hasRole()`, `isOrgAdmin()`, etc.
3. **Server-side validation**: Backend APIs handle authorization
4. **UI components**: Uses existing components from `components/ui/*`

### API Integration
- **GET /api/admin/users/:userId**: Fetches user profile data for the modal
- **GET /api/orgs/:orgId/admins**: Fetches organization and club admins (already existing)
- All other admin management endpoints were already in place

## Testing
- ✅ Linting: No new linting errors introduced
- ✅ Build: Project builds successfully
- ✅ TypeScript: No type errors in new code

## Files Modified
1. `src/components/admin/OrganizationAdminsTable.tsx` - Added view profile functionality
2. `src/components/admin/ClubAdminsTable.tsx` - Added view profile functionality
3. `locales/en.json` - Added translation keys
4. `locales/uk.json` - Added translation keys

## Files Created
1. `src/components/admin/UserProfileModal.tsx` - New reusable profile modal component
2. `src/components/admin/UserProfileModal.css` - Modal styling
3. `docs/organization-detail-admin-management.md` - This documentation

## Future Enhancements
Possible improvements for future iterations:
- Add edit profile functionality within the modal
- Add quick action buttons (block/unblock) in the modal
- Show recent activity/audit log in the profile modal
- Add profile picture support
