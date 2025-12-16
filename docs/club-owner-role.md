# Club Owner Role Implementation

## Overview

The Club Owner role is a new administrative role that provides club-specific management capabilities, particularly focused on payment integration and financial analytics.

**Implementation Date**: December 2024

## Role Hierarchy

The platform now has the following administrative roles, in order of privilege:

1. **Root Admin** - Platform-wide administration
2. **Organization Admin** - Manages organizations and their clubs
3. **Club Owner** - Owns clubs and manages payment keys
4. **Club Admin** - Manages day-to-day club operations
5. **Member** - Standard club member

## Club Owner Capabilities

### Payment Management
- **View and Update Payment Keys**: Club Owners can add/update WayForPay and LiqPay payment keys for their clubs
- **API Endpoint**: `GET/PUT /api/admin/clubs/[id]/payment-keys`
- **Access Control**: Only Club Owners and Root Admins can access payment keys

### Financial Analytics
- **View Payment Status**: Club Owners can see payment status for all bookings in their clubs
- **Dashboard Access**: Full access to financial metrics and analytics for their clubs
- **Booking Management**: View all bookings with payment information

### Access Scope
Club Owners have full access to:
- Club details and settings
- Court management
- Booking information and payment status
- Financial analytics and reporting
- Dashboard metrics for their clubs

## Permission Model

| Feature | Root Admin | Organization Admin | Club Owner | Club Admin | Member |
|---------|-----------|-------------------|------------|------------|--------|
| View Payment Keys | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit Payment Keys | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Payment Status | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial Analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Bookings | ✅ | ✅ | ✅ | ✅ | ❌ |
| Club Settings | ✅ | ✅ | ✅ | ✅ | ❌ |

## Technical Implementation

### Database Schema

Added to `ClubMembershipRole` enum:
```prisma
enum ClubMembershipRole {
  CLUB_OWNER
  CLUB_ADMIN
  MEMBER
}
```

Added to `Club` model:
```prisma
model Club {
  // ... existing fields
  wayforpayKey String? // Encrypted WayForPay payment key
  liqpayKey    String? // Encrypted LiqPay payment key
}
```

### Authorization

The Club Owner role is checked using the centralized `requireRole` helper:

```typescript
import { requireClubOwner } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";

// Check for club owner
const authResult = await requireClubOwner(clubId);
if (!authResult.authorized) return authResult.response;

// Or check for club owner OR admin
const authResult = await requireRole({
  contextType: "club",
  contextId: clubId,
  allowedRoles: [
    ClubMembershipRole.CLUB_OWNER,
    ClubMembershipRole.CLUB_ADMIN
  ],
});
```

### API Endpoints

#### Payment Keys Management

**GET** `/api/admin/clubs/[id]/payment-keys`
- Returns payment keys for a club
- Access: Club Owner or Root Admin only

**PUT** `/api/admin/clubs/[id]/payment-keys`
- Updates payment keys for a club
- Request body: `{ wayforpayKey?: string, liqpayKey?: string }`
- Access: Club Owner or Root Admin only

#### Dashboard & Analytics

All existing dashboard endpoints support Club Owners:
- `/api/admin/unified-dashboard` - Overview metrics
- `/api/admin/dashboard/graphs` - Booking trends and analytics
- `/api/admin/bookings` - Booking list with payment status

### Frontend Components

#### User Role Indicator
The `UserRoleIndicator` component displays the Club Owner role with an indigo badge.

#### Role Filter
The admin user list page includes Club Owner in the role filter dropdown.

#### Translations
Added translations for Club Owner role:
- **English**: "Club Owner"
- **Ukrainian**: "Власник клубу"

## User Store

The Zustand user store includes Club Owner support:

```typescript
import { useUserStore } from "@/stores/useUserStore";

// Check if current user is a club owner
const isClubOwner = useUserStore(state => state.isClubOwner);
if (isClubOwner("club-id-123")) {
  // Club owner logic
}

// Check for club owner role
const hasRole = useUserStore(state => state.hasRole);
if (hasRole("CLUB_OWNER")) {
  // Club owner logic
}
```

## Security Considerations

### Payment Key Protection
- Payment keys are stored encrypted in the database
- Only Club Owners and Root Admins can view/modify keys
- Organization Admins and Club Admins can see payment **status** but not keys
- API endpoints enforce strict role-based access control

### Access Control
- All authorization checks are performed server-side
- Frontend role checks are for UX only
- The `requireRole` helper ensures consistent authorization
- Club Owners can only access clubs they own

## Migration Path

To assign Club Owner role to an existing club admin:

```sql
UPDATE "ClubMembership"
SET "role" = 'CLUB_OWNER'
WHERE "userId" = 'user-id' AND "clubId" = 'club-id' AND "role" = 'CLUB_ADMIN';
```

## Testing

Unit tests verify:
- ✅ Club Owner role is recognized by `requireRole`
- ✅ Club Owners are included in `requireAnyAdmin` checks
- ✅ Club Owner is prioritized over Club Admin
- ✅ Payment keys endpoint enforces correct permissions
- ✅ Dashboard APIs support Club Owners

## Future Enhancements

Potential improvements:
1. UI for payment keys management (API is ready)
2. Advanced financial reporting for Club Owners
3. Revenue tracking and analytics
4. Payment gateway integration testing tools
5. Multi-currency support for clubs

## Related Files

### Backend
- `/prisma/schema.prisma` - Database schema
- `/src/constants/roles.ts` - Role definitions
- `/src/lib/requireRole.ts` - Authorization helpers
- `/src/app/api/admin/clubs/[id]/payment-keys/route.ts` - Payment keys API
- `/src/app/api/admin/bookings/route.ts` - Bookings API
- `/src/app/api/admin/unified-dashboard/route.ts` - Dashboard API

### Frontend
- `/src/stores/useUserStore.ts` - User state management
- `/src/components/UserRoleIndicator.tsx` - Role badge component
- `/src/app/(pages)/admin/users/page.tsx` - User list with role filter
- `/locales/en.json`, `/locales/uk.json` - Translations

### Tests
- `/src/__tests__/rbac.test.ts` - Role authorization tests

## References

- [Role-Based User Access Documentation](./role-based-user-access.md)
- [Copilot Settings](../.github/copilot-settings.md)
- GitHub Issue: "Create Club Owner Role and Update Role Usage"
