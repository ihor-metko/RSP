# Mock Data Mode (TEMPORARY)

> ⚠️ **THIS IS A TEMPORARY FEATURE** — This mock data mode is a stopgap solution for development when the database is unavailable. It should be removed once database issues are resolved. See `TODO_MOCK_CLEANUP.md` for removal instructions.

## Overview

Mock Data Mode allows the application to run with simulated data instead of connecting to the real database. This enables UI development, testing, and demonstrations when database access is intermittent or unavailable.

## How to Enable/Disable

### Enable Mock Mode

Set the environment variable before starting the server:

```bash
USE_MOCK_DATA=true npm run dev
```

Or export it in your shell:

```bash
export USE_MOCK_DATA=true
npm run dev
```

### Disable Mock Mode (Default)

Simply don't set the variable, or explicitly set it to false:

```bash
USE_MOCK_DATA=false npm run dev
```

Or unset it:

```bash
unset USE_MOCK_DATA
npm run dev
```

## What's Included

When mock mode is active:

1. **Mock Data**: Pre-seeded realistic data for:
   - Organizations (3 orgs, including 1 archived)
   - Clubs (3 clubs across different orgs)
   - Courts (7 courts with varied configurations)
   - Users (5 users with different roles: root admin, org admin, club admin, players)
   - Bookings (5 bookings: past, present, future, and cancelled)
   - Memberships (organization and club memberships)

2. **API Routes**: The following API routes support mock mode:
   - `GET /api/admin/bookings` - List bookings with filters
   - `POST /api/admin/bookings/create` - Create new booking
   - `GET /api/admin/clubs` - List clubs
   - `POST /api/admin/clubs` - Create new club

3. **Visual Indicator**: A warning banner appears at the top of the page (dev mode only) showing that mock mode is active.

## Mock Data Details

### Users
- **Root Admin**: `root@example.com`
- **Org Admin**: `orgadmin@example.com` (manages "Padel Sports Inc")
- **Club Admin**: `clubadmin@example.com` (manages "Elite Padel Academy")
- **Players**: `player@example.com`, `player2@example.com`

### Organizations
- **Padel Sports Inc** (active, with 2 clubs)
- **Tennis & Padel Corp** (active, with 1 club)
- **Archived Organization** (archived, no active clubs)

### Clubs
- **Downtown Padel Club** (3 courts: 2 indoor, 1 outdoor)
- **Suburban Padel Center** (2 outdoor courts)
- **Elite Padel Academy** (2 professional indoor courts)

### Bookings
- Mix of past, present, and future bookings
- Various statuses: paid, pending, cancelled
- Distributed across different courts and clubs

## Testing Flows

### QuickBooking Flows

Mock data supports testing:
1. **Available Courts**: All courts show availability based on existing bookings
2. **Create Booking**: New bookings can be created and will appear in the mock dataset
3. **Cancel Booking**: Bookings can be cancelled (status changes to "cancelled")
4. **Admin Booking**: Admins can create bookings with appropriate permissions

### Admin Flows

Test admin functionality:
1. **Root Admin**: Can see all organizations, clubs, and bookings
2. **Org Admin**: Can see clubs and bookings only for "Padel Sports Inc"
3. **Club Admin**: Can see only "Elite Padel Academy" data

## Extending Mock Data

To add more mock data, edit `/src/services/mockDb.ts`:

1. Find the `initializeMockData()` function
2. Add your data to the appropriate array (mockUsers, mockClubs, etc.)
3. Follow the existing pattern for IDs and relationships
4. Restart the dev server to see changes

Example:

```typescript
mockClubs.push({
  id: "club-4",
  name: "New Test Club",
  location: "123 Test St",
  // ... other fields
});
```

## Running Tests with Mock Mode

To run tests with mock data:

```bash
USE_MOCK_DATA=true npm test
```

Or for specific tests:

```bash
USE_MOCK_DATA=true npm test -- src/__tests__/admin-bookings-api.test.ts
```

## Limitations

- Mock data is **in-memory only** — changes are lost on server restart
- No persistence between sessions
- Simplified logic (e.g., no complex pricing rules, no coach availability)
- Authorization still enforced, but uses mock membership data
- Some API endpoints may not support mock mode yet

## Production Safety

- Mock mode **cannot be enabled in production** builds
- The warning banner only shows in development mode
- Environment variable is explicitly checked before routing to mock handlers

## Troubleshooting

### Mock mode not working

1. Verify environment variable: `echo $USE_MOCK_DATA`
2. Check console for "MOCK DATA MODE ACTIVE" message
3. Restart dev server after changing environment variables

### No data showing

1. Mock data initializes on first import of `mockDb.ts`
2. Check browser console for errors
3. Verify API routes have mock mode integration

### Authorization errors

Mock mode still requires valid authentication. Make sure you're logged in with a user that exists in the mock data.

## Future Removal

This is a **temporary** solution. Once database issues are resolved:

1. Review `TODO_MOCK_CLEANUP.md` for removal steps
2. Search codebase for `TEMPORARY MOCK MODE` comments
3. Remove mock-related code and files
4. Update documentation to remove references to mock mode
