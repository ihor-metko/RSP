# Data Fetching Guidelines

## Overview

ArenaOne uses **Zustand stores** as the single source of truth for all domain data (organizations, clubs, bookings). This document defines the architectural boundaries and guidelines for data fetching throughout the application.

## Core Principles

1. **Store-Only Access**: All domain data MUST be accessed via Zustand stores
2. **No Direct Fetches**: Pages and components MUST NOT call `fetch()` directly for domain data
3. **Store Actions Only**: Data fetching MUST happen only inside store actions
4. **Lazy Loading**: Stores use lazy loading - data is fetched only when needed
5. **Caching & Deduplication**: Stores handle caching and prevent duplicate fetches
6. **Stable Rendering**: No refetching on tab switches or navigation

## Zustand Stores

### Available Stores

#### 1. `useUserStore`
**Purpose**: Authentication, user session, roles, and admin status

**State**:
- `user` - Current authenticated user
- `roles` - User's admin roles
- `isLoggedIn` - Authentication status
- `adminStatus` - Admin type and managed IDs
- `memberships` - Organization memberships
- `clubMemberships` - Club memberships

**Key Actions**:
- `loadUser()` - Load user from `/api/me`
- `reloadUser()` - Force reload user data
- `clearUser()` - Clear user state (logout)
- `hasRole(role)` - Check if user has a specific role
- `hasAnyRole(roles)` - Check if user has any of the specified roles
- `isOrgAdmin(orgId?)` - Check if user is organization admin
- `isClubAdmin(clubId?)` - Check if user is club admin

**Usage**:
```tsx
const user = useUserStore(state => state.user);
const hasRole = useUserStore(state => state.hasRole);
if (hasRole('ROOT_ADMIN')) {
  // Root admin logic
}
```

#### 2. `useOrganizationStore`
**Purpose**: Manage organizations with lazy loading and caching

**State**:
- `organizations` - List of organizations
- `organizationsById` - Cached organization details
- `currentOrg` - Currently selected organization
- `loading` - Loading state
- `error` - Error message
- `hasFetched` - Whether data has been fetched

**Key Actions**:
- `fetchOrganizations(force?)` - Fetch organizations list
- `fetchOrganizationById(id)` - Fetch and set current organization
- `ensureOrganizationById(id, options?)` - Fetch if not cached
- `createOrganization(payload)` - Create new organization
- `updateOrganization(id, payload)` - Update organization
- `deleteOrganization(id)` - Delete organization
- `refetch()` - Force refetch organizations

**Usage**:
```tsx
// Auto-fetch pattern (recommended)
const organizations = useOrganizationStore(
  state => state.getOrganizationsWithAutoFetch()
);

// Manual fetch pattern
const fetchOrgs = useOrganizationStore(state => state.fetchOrganizations);
useEffect(() => {
  fetchOrgs();
}, [fetchOrgs]);

// Ensure specific org is loaded
const ensureOrg = useOrganizationStore(state => state.ensureOrganizationById);
const org = await ensureOrg('org-123');
```

#### 3. `useClubStore`
**Purpose**: Manage clubs with organization context and caching

**State**:
- `clubs` - List of clubs
- `clubsById` - Cached club details
- `currentClub` - Currently selected club
- `loadingClubs` - Loading state for list
- `loading` - Loading state for single club
- `lastOrganizationId` - Track organization context

**Key Actions**:
- `fetchClubsIfNeeded(options?)` - Fetch clubs if not cached
- `ensureClubById(id, options?)` - Fetch club if not cached
- `invalidateClubs()` - Clear cache
- `createClub(payload)` - Create new club
- `updateClub(id, payload)` - Update club
- `deleteClub(id)` - Delete club

**Usage**:
```tsx
// Fetch clubs for organization
const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);
await fetchClubsIfNeeded({ organizationId: 'org-123' });

// Ensure specific club is loaded
const ensureClub = useClubStore(state => state.ensureClubById);
const club = await ensureClub('club-123');
```

#### 4. `useBookingStore`
**Purpose**: Manage bookings for club operations and calendar

**Note**: This store is for **operations/calendar bookings**, NOT for admin booking lists or player bookings.

**State**:
- `bookings` - List of bookings for current club/date
- `loading` - Loading state
- `lastFetchParams` - Track club/date context

**Key Actions**:
- `fetchBookingsForDay(clubId, date)` - Fetch bookings for specific day
- `fetchBookingsIfNeeded(clubId, date, options?)` - Fetch if not cached
- `createBooking(payload)` - Create new booking
- `cancelBooking(bookingId)` - Cancel booking
- `startPolling(clubId, date, interval)` - Start auto-refresh
- `stopPolling()` - Stop auto-refresh

**Usage**:
```tsx
// Operations calendar
const fetchBookings = useBookingStore(state => state.fetchBookingsForDay);
await fetchBookings('club-123', '2024-01-15');

// Start polling for real-time updates
const startPolling = useBookingStore(state => state.startPolling);
startPolling('club-123', '2024-01-15', 15000); // 15s interval
```

## What Should NOT Use Stores

The following types of API calls should **NOT** go through stores. Direct `fetch()` is appropriate:

### 1. Specialized Operations
Operations that modify data but aren't "domain state":
- Admin assignments: `/api/admin/organizations/assign-admin`
- Section updates: `/api/admin/clubs/${id}/section`
- Owner changes: `/api/admin/organizations/set-owner`
- Price rules: `/api/courts/${id}/price-rules`
- Payment accounts: `/api/admin/*/payment-accounts`
- Club admin management: `/api/orgs/${id}/club-admins`

**Why**: These are mutations, not domain state. The domain state (org/club) should refetch after these operations complete.

### 2. Public Endpoints with Server-Side Filtering
Public-facing endpoints that require server-side filtering:
- Public clubs search: `/api/(player)/clubs?q=tennis&city=Kyiv&indoor=true`
- Public club details: `/api/(player)/clubs/${id}`

**Why**: These endpoints have complex server-side filtering that can't be efficiently replicated client-side.

### 3. User-Specific Queries
Personal data that's specific to the logged-in user:
- Player bookings: `/api/bookings?userId=${userId}&upcoming=true`
- User profile: `/api/me`
- User notifications: `/api/notifications`

**Why**: This is user-specific data, not shared domain state. Caching wouldn't benefit other users.

### 4. Reporting/List Endpoints
Admin list endpoints with pagination, filtering, and aggregation:
- Admin bookings list: `/api/admin/bookings?page=1&perPage=25&status=confirmed`
- Admin users list: `/api/admin/users?q=john&page=2`

**Why**: These are reporting queries with complex server-side logic. They return different views of the same data based on filters.

## Helper Functions

Use the helpers in `/src/lib/storeHelpers.ts` to ensure proper store usage:

```tsx
import {
  ensureOrganizationContext,
  ensureClubContext,
  ensureClubsForOrganization,
  invalidateOrganizations,
  invalidateClubs,
  isDomainDataFetch,
} from '@/lib/storeHelpers';

// Ensure organization is loaded
const org = await ensureOrganizationContext('org-123');

// Ensure club is loaded
const club = await ensureClubContext('club-123');

// Ensure clubs for organization are loaded
await ensureClubsForOrganization('org-123');

// Invalidate cache after mutation
await updateOrganization(id, data);
invalidateOrganizations(); // Force refetch

// Check if URL should use store
if (isDomainDataFetch('/api/clubs/123')) {
  // Use store instead of fetch
  const club = await ensureClubContext('123');
}
```

## Common Patterns

### Pattern 1: Page with Domain Data

**❌ Wrong** - Direct fetch:
```tsx
export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  
  useEffect(() => {
    fetch('/api/admin/organizations')
      .then(res => res.json())
      .then(setOrgs);
  }, []);
  
  return <div>{orgs.map(...)}</div>;
}
```

**✅ Correct** - Use store:
```tsx
export default function OrganizationsPage() {
  const organizations = useOrganizationStore(
    state => state.getOrganizationsWithAutoFetch()
  );
  
  return <div>{organizations.map(...)}</div>;
}
```

### Pattern 2: Component Accessing Domain Data

**❌ Wrong** - Fetch in component:
```tsx
function ClubCard({ clubId }: { clubId: string }) {
  const [club, setClub] = useState(null);
  
  useEffect(() => {
    fetch(`/api/clubs/${clubId}`)
      .then(res => res.json())
      .then(setClub);
  }, [clubId]);
  
  return <div>{club?.name}</div>;
}
```

**✅ Correct** - Use store:
```tsx
function ClubCard({ clubId }: { clubId: string }) {
  const club = useClubStore(state => state.clubsById[clubId]);
  const ensureClub = useClubStore(state => state.ensureClubById);
  
  useEffect(() => {
    if (!club) {
      ensureClub(clubId);
    }
  }, [clubId, club, ensureClub]);
  
  return <div>{club?.name}</div>;
}
```

### Pattern 3: Specialized Operation

**✅ Correct** - Direct fetch for operations:
```tsx
async function assignOrganizationAdmin(orgId: string, userId: string) {
  const payload = { userId };
  
  // This is a specialized operation, not domain state
  const response = await fetch(`/api/admin/organizations/assign-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  // After operation completes, invalidate cache to refetch domain state
  if (response.ok) {
    invalidateOrganizations();
  }
}
```

### Pattern 4: Prevent Unnecessary Refetches

**❌ Wrong** - Refetch on every render:
```tsx
function MyComponent() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // This runs every time component renders!
    fetch('/api/clubs').then(res => res.json()).then(setData);
  }); // Missing dependency array
  
  return <div>{data.map(...)}</div>;
}
```

**✅ Correct** - Use store with lazy loading:
```tsx
function MyComponent() {
  const clubs = useClubStore(state => state.clubs);
  const fetchClubsIfNeeded = useClubStore(state => state.fetchClubsIfNeeded);
  
  useEffect(() => {
    // Fetches only if not already loaded
    fetchClubsIfNeeded();
  }, [fetchClubsIfNeeded]); // Stable reference
  
  return <div>{clubs.map(...)}</div>;
}
```

## Stability Rules

1. **No refetch on navigation**: Navigating between pages should reuse cached store data
2. **No refetch on tab switch**: Switching tabs or returning to the app should not trigger refetches
3. **No session reinit**: Session and admin status should not reload unless explicitly triggered
4. **Stable dependencies**: useEffect dependencies should be stable (from stores or useCallback with stable deps)
5. **Minimal selectors**: Use specific selectors to prevent unnecessary re-renders

## Migration Checklist

When migrating a page or component to use stores:

- [ ] Identify all `fetch()` calls to domain endpoints
- [ ] Check if fetch is for domain data using `isDomainDataFetch()`
- [ ] Replace with appropriate store selector and action
- [ ] Remove local state that duplicates store state
- [ ] Use store loading/error states instead of local
- [ ] Ensure useEffect dependencies are stable
- [ ] Test that navigation doesn't trigger refetch
- [ ] Test that tab switching doesn't trigger refetch

## Enforcement

To prevent regressions:

1. **Code Review**: All PRs should be reviewed for proper store usage
2. **Helper Functions**: Use provided helpers to enforce correct patterns
3. **Documentation**: Keep this guide updated with new patterns
4. **Testing**: Include tests that verify store behavior (no duplicate fetches, caching works)

## Summary

✅ **DO**:
- Use Zustand stores for organizations, clubs, and bookings
- Use helper functions to ensure proper context
- Use store loading/error states
- Invalidate cache after mutations
- Keep selectors minimal and scoped

❌ **DON'T**:
- Call `fetch()` directly for domain data in pages/components
- Create local state that duplicates store state
- Refetch on navigation or tab switches
- Use unstable useEffect dependencies
- Put operations (uploads, assignments) in stores
