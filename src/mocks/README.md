# Mock Data for Admin Pages

This directory contains mock data files for admin detail pages. These mocks enable developers and QA to view full UI states without backend dependencies.

## Purpose

Mock data allows you to:
- Develop and test UI components independently
- View all possible UI states (loading, error, success, edge cases)
- Work on frontend features without requiring a fully populated database
- Perform QA testing without complex data setup

## How to Enable Mocks

### Development Environment

1. Create or edit your `.env.local` file in the project root
2. Add the following line:
   ```
   NEXT_PUBLIC_USE_MOCKS=true
   ```
3. Restart your development server (`npm run dev`)
4. Navigate to any admin detail page to see mock data

### Disable Mocks

Simply remove the environment variable or set it to `false`:
```
NEXT_PUBLIC_USE_MOCKS=false
```

Or remove the line entirely from `.env.local`.

## Safety

- **Mocks are automatically disabled in production builds** - they will never run in production
- The flag defaults to `false` if not set
- Mocks only override data fetching; they don't modify API behavior

## Mock Files

### Location: `src/mocks/admin/`

- **`organization-detail.ts`** - Mock data for organization dashboard page
  - Exports: `mockOrganizationDetail`
  - Used by: `/admin/orgs/[orgId]/dashboard`

- **`club-detail.ts`** - Mock data for club detail page
  - Exports: `mockClubDetail`, `mockClubWithNoClubs`, `mockClubWithManyCourts`
  - Used by: `/admin/clubs/[id]`

- **`user-detail.ts`** - Mock data for user detail page
  - Exports: `mockUserDetail`, `mockUserWithNoBookings`, `mockBlockedUser`
  - Used by: `/admin/users/[id]`

- **`booking-detail.ts`** - Mock data for booking detail
  - Exports: `mockBookingDetail`, `mockPendingBooking`, `mockCancelledBooking`, `mockBookingWithCoach`, `mockReservedBooking`, `mockBookingWithoutOrganization`
  - Note: Currently, there is no dedicated booking detail UI page. The booking API exists at `/api/admin/bookings/[id]`. This mock is available for future booking detail page implementation or for use in booking list modals/views.

## Creating New Mocks

When creating new mock data:

1. Match the production API shape exactly
2. Include realistic, complete data (IDs, timestamps, nested relations)
3. Provide multiple variants for different states
4. Use TypeScript types from the main codebase
5. Add JSDoc comments explaining the mock's purpose

Example:
```typescript
import type { ClubDetail } from "@/types/club";

/**
 * Complete mock club with all relations
 */
export const mockClubDetail: ClubDetail = {
  id: "mock-club-123",
  name: "Sample Padel Club",
  // ... complete data
};

/**
 * Variant: Club with no courts (edge case)
 */
export const mockClubWithNoCourts: ClubDetail = {
  // ...
};
```

## Integration Pattern

Pages that support mocks follow this pattern:

```typescript
import { shouldUseMocks } from "@/mocks";
import { mockClubDetail } from "@/mocks/admin/club-detail";

// At the top of your data-loading logic:
if (shouldUseMocks()) {
  setClub(mockClubDetail);
  setLoading(false);
  return;
}

// Normal API fetch continues...
```

## TypeScript Compliance

All mocks must pass TypeScript compilation. If you see type errors:
- Verify the mock matches the expected type
- Check that all required fields are included
- Ensure nested objects match their types

**Note**: There is a pre-existing TypeScript error in `src/app/api/admin/unified-dashboard/route.ts` that is unrelated to the mock data implementation. This does not affect the functionality of mocks.

## Testing Checklist

Before committing mock changes:
- [ ] Mocks load without errors in dev mode
- [ ] All UI components render with mock data
- [ ] Multiple variants work correctly
- [ ] Production build succeeds (`npm run build`)
- [ ] Mocks don't run with flag disabled
- [ ] TypeScript compiles without errors
- [ ] Run the smoke test: `npx ts-node --project tsconfig.scripts.json scripts/check-mocks.ts`

## Questions?

If you have questions about mocks or need to add new mock files, refer to this README or check existing mock files for examples.
