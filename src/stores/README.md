# Zustand Stores

This directory contains Zustand store implementations for state management.

## 🎯 Architecture Principles

**ArenaOne uses Zustand stores as the SINGLE SOURCE OF TRUTH for all domain data.**

### Core Rules

1. **Store-Only Access**: All domain data (organizations, clubs, bookings) MUST be accessed via stores
2. **No Direct Fetches**: Pages and components MUST NOT call `fetch()` directly for domain data
3. **Store Actions Only**: Data fetching MUST happen only inside store actions
4. **Lazy Loading**: Stores use lazy loading - data is fetched only when needed
5. **Caching & Deduplication**: Stores handle caching and prevent duplicate fetches
6. **Stable Rendering**: No refetching on tab switches or navigation

### 📚 Documentation

For complete guidelines on data fetching, see:
- **[Data Fetching Guidelines](../../docs/architecture/data-fetching-guidelines.md)** - Comprehensive guide
- **[Store Helpers](../lib/storeHelpers.ts)** - Helper functions to ensure proper usage

### ⚡ Quick Reference

#### When to Use Stores
✅ Organizations data  
✅ Clubs data  
✅ Bookings data (operations/calendar)  
✅ User session & auth  
✅ WebSocket connections and state  

#### When NOT to Use Stores  
❌ Specialized operations (image uploads, admin assignments)  
❌ Public endpoints with server-side filtering  
❌ User-specific queries (player bookings, notifications)  
❌ Reporting endpoints (admin lists with pagination)

## useSocketStore

A centralized Zustand store for managing all WebSocket connections and their state.

### Features

- **Single source of truth**: All socket connections managed in one place
- **Prevents duplicates**: Ensures only one instance of each socket type
- **React StrictMode safe**: Handles development mode double-mounting
- **Automatic reconnection**: Built-in reconnection handling
- **Token management**: Cached and deduplicated socket token fetching
- **Type-safe**: Full TypeScript support with proper type definitions

### Architecture

The store manages two types of socket connections:

1. **NotificationSocket**: Always active during user session (all roles)
   - Platform-wide notifications
   - Role-based room targeting
   - Independent of page navigation

2. **BookingSocket**: Active only when club is selected (admin roles only)
   - Club-specific real-time booking updates
   - Calendar synchronization
   - Connects/disconnects on club selection changes

### Usage

```typescript
import { useSocketStore } from '@/stores/useSocketStore';

// Initialize notification socket
function MyComponent() {
  const initializeNotificationSocket = useSocketStore(state => state.initializeNotificationSocket);
  const notificationSocket = useSocketStore(state => state.notificationSocket);
  const isConnected = useSocketStore(state => state.notificationConnected);

  useEffect(() => {
    const init = async () => {
      const token = await useSocketStore.getState().getSocketToken();
      if (token) {
        initializeNotificationSocket(token);
      }
    };
    init();
  }, []);

  return (
    <div>
      Connection: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
}
```

### State

- `notificationSocket: Socket | null` - Notification socket instance
- `notificationConnected: boolean` - Notification socket connection state
- `bookingSocket: Socket | null` - Booking socket instance
- `bookingConnected: boolean` - Booking socket connection state
- `activeClubId: string | null` - Currently active club ID
- `socketToken: string | null` - Cached socket authentication token
- `isLoadingToken: boolean` - Token loading state
- `tokenError: string | null` - Token error state

### Actions

- `initializeNotificationSocket(token)` - Initialize notification socket
- `disconnectNotificationSocket()` - Disconnect notification socket
- `initializeBookingSocket(token, clubId)` - Initialize booking socket for club
- `disconnectBookingSocket()` - Disconnect booking socket
- `setActiveClubId(clubId)` - Set active club ID
- `getSocketToken()` - Get socket token (cached and deduplicated)
- `clearSocketToken()` - Clear cached socket token

### Integration

The socket store is used by:
- **SocketContext**: Notification socket provider (thin wrapper)
- **BookingSocketContext**: Booking socket provider (thin wrapper)
- **GlobalSocketListener**: Event dispatcher that updates domain stores
- **useCourtAvailability**: Hook for reactive court availability

### Best Practices

1. **Use Context Providers**: Don't initialize sockets directly in components
2. **Single Initialization**: Store prevents duplicates, but use contexts for consistency
3. **Automatic Cleanup**: Store handles cleanup, but contexts manage lifecycle
4. **Token Management**: Use `getSocketToken()` - it's cached and deduplicated
5. **Development Mode**: Store is StrictMode-safe, handles double-mounting correctly

### Migration from Direct Socket Usage

Before (multiple subscriptions):
```typescript
// ❌ Direct socket usage in components
const { socket } = useSocket();
useEffect(() => {
  socket?.on('booking_created', handleBooking);
  return () => socket?.off('booking_created', handleBooking);
}, [socket]);
```

After (centralized store):
```typescript
// ✅ Use store state (updated by GlobalSocketListener)
const bookings = useBookingStore(state => state.bookings);
// Bookings automatically update via GlobalSocketListener
```

## useNotificationStore

A centralized Zustand store for managing admin notifications across the entire application.

### Features

- **Single source of truth**: All notification-related UI (toasts, bell, notifications page) use this store
- **Real-time updates**: Automatically updated by Socket.IO events
- **Duplicate prevention**: Automatically prevents duplicate notifications
- **Type-safe**: Full TypeScript support with proper type definitions
- **Automatic unread count**: Tracks unread count automatically

### Usage

```typescript
import { useNotificationStore } from '@/stores/useNotificationStore';

function MyComponent() {
  const notifications = useNotificationStore(state => state.notifications);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const addNotification = useNotificationStore(state => state.addNotification);
  const markAsRead = useNotificationStore(state => state.markAsRead);

  return (
    <div>
      <span>Unread: {unreadCount}</span>
      {notifications.map(notification => (
        <div key={notification.id}>
          {notification.summary}
          {!notification.read && (
            <button onClick={() => markAsRead(notification.id)}>
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### State

- `notifications: AdminNotification[]` - List of all notifications
- `unreadCount: number` - Number of unread notifications
- `loading: boolean` - Loading state
- `error: string | null` - Error message

### Actions

- `setNotifications(notifications)` - Set entire notifications list (from initial fetch)
- `setUnreadCount(count)` - Set unread count
- `setLoading(loading)` - Set loading state
- `setError(error)` - Set error state
- `addNotification(notification)` - Add a single notification (from socket event)
- `markAsRead(notificationId)` - Mark notification as read (local only)
- `markAllAsRead()` - Mark all notifications as read (local only)
- `clearNotifications()` - Clear all notifications

### Integration

The store is automatically updated by:
- **Socket.IO events**: `GlobalSocketListener` listens for `admin_notification` events
- **Initial HTTP fetch**: `useNotifications` hook fetches initial data on mount
- **User actions**: Components call `markAsRead` after API calls

### Recommended Hook

Use the `useNotifications` hook instead of directly accessing the store:

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { notifications, unreadCount, markAsRead } = useNotifications({
    onNewNotification: (notification) => {
      showToast(notification.summary);
    }
  });
  
  // Hook handles initial fetch and provides API methods
}
```

## useClubStore

A reusable, well-typed Zustand store for managing clubs and the current club context in the admin UI.

### Features

- **SSR-friendly**: Designed to work seamlessly with Next.js server-side rendering
- **Lightweight**: Minimal bundle size using Zustand
- **Type-safe**: Full TypeScript support with proper type definitions
- **API integration**: Integrates with existing API patterns and endpoints
- **Role-based access**: Automatically handles role-based filtering on the server side

### Usage

```typescript
import { useClubStore } from '@/stores/useClubStore';

function MyComponent() {
  const { 
    clubs, 
    currentClub, 
    loading, 
    error,
    fetchClubs,
    setCurrentClub,
    clearCurrentClub
  } = useClubStore();

  // Fetch all clubs (role-based filtering happens server-side)
  useEffect(() => {
    fetchClubs();
  }, []);

  // Access computed selectors
  const isSelected = useClubStore(state => state.isClubSelected('club-id'));
  const specificClub = useClubStore(state => state.getClubById('club-id'));

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {clubs.map(club => (
        <div key={club.id}>{club.name}</div>
      ))}
    </div>
  );
}
```

### API Methods

#### State
- `clubs: ClubWithCounts[]` - Cached list of clubs (with court/booking counts)
- `currentClub: ClubDetail | null` - Currently selected club with full details
- `loading: boolean` - Loading state
- `error: string | null` - Error message

#### Actions
- `setClubs(clubs: ClubWithCounts[])` - Manually set clubs list
- `setCurrentClub(club: ClubDetail | null)` - Set current club
- `clearCurrentClub()` - Clear current club selection
- `fetchClubs()` - Load clubs from `/api/admin/clubs` (role-based filtering)
- `fetchClubById(id: string)` - Load single club and set as current
- `createClub(payload)` - Create new club (optimistic update)
- `updateClub(id, payload)` - Update club (optimistic update)
- `deleteClub(id)` - Delete club

#### Selectors
- `getClubById(id: string)` - Get club from store by ID
- `isClubSelected(id: string)` - Check if club is currently selected

### Role-Based Access

The store automatically handles role-based access control:

- **Root Admin** → All clubs in the platform
- **Organization SuperAdmin** → Clubs of the selected organization
- **Club Admin** → Only their assigned clubs

All filtering is handled on the server side for security.

### API Endpoints

The store uses the following API endpoints:

- `GET /api/admin/clubs` - List clubs (role-based filtering)
- `GET /api/admin/clubs/:id` - Get single club details
- `POST /api/admin/clubs/new` - Create new club
- `PUT /api/admin/clubs/:id` - Update club
- `DELETE /api/admin/clubs/:id` - Delete club (root admin only)

### Types

See `src/types/club.ts` for full type definitions:
- `Club` - Basic club entity
- `ClubWithCounts` - Club with court and booking counts for list display
- `ClubDetail` - Full club details with related entities
- `CreateClubPayload` - Payload for creating clubs
- `UpdateClubPayload` - Payload for updating clubs

### Testing

Comprehensive tests are available in `src/__tests__/useClubStore.test.ts` covering:
- Initial state
- State setters
- Async actions (fetch, create, update, delete)
- Error handling
- Selectors
- Optimistic updates

Run tests with:
```bash
npm test useClubStore
```

### Best Practices

1. **Optimistic Updates**: Create and update operations use optimistic updates for better UX
2. **Error Handling**: Always handle errors returned by async actions
3. **Loading States**: Use the `loading` state to show loading indicators
4. **Selective Subscription**: Use selectors to subscribe to specific parts of the state
5. **SSR Compatibility**: The store is designed to work with Next.js SSR - state is client-side only

### Example: Creating a Club

```typescript
const { createClub, error } = useClubStore();

const handleCreate = async () => {
  try {
    const newClub = await createClub({
      organizationId: 'org-123',
      name: 'My New Club',
      shortDescription: 'A great padel club',
      location: '123 Main St'
    });
    console.log('Created:', newClub);
  } catch (err) {
    console.error('Failed to create:', error);
  }
};
```

### Example: Using Selectors

```typescript
// Subscribe only to specific club
function ClubDetails({ clubId }: { clubId: string }) {
  const club = useClubStore(state => state.getClubById(clubId));
  const isSelected = useClubStore(state => state.isClubSelected(clubId));
  
  if (!club) return <div>Club not found</div>;
  
  return (
    <div>
      <h2>{club.name}</h2>
      {isSelected && <span>✓ Selected</span>}
    </div>
  );
}
```

## useOrganizationStore

A reusable, well-typed Zustand store for managing organizations and the current organization context in the admin UI.

### Features

- **SSR-friendly**: Designed to work seamlessly with Next.js server-side rendering
- **Lightweight**: Minimal bundle size using Zustand
- **Type-safe**: Full TypeScript support with proper type definitions
- **API integration**: Integrates with existing API patterns and endpoints

### Usage

```typescript
import { useOrganizationStore } from '@/stores/useOrganizationStore';

function MyComponent() {
  const { 
    organizations, 
    currentOrg, 
    loading, 
    error,
    fetchOrganizations,
    setCurrentOrg 
  } = useOrganizationStore();

  // Fetch all organizations (for root admin)
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Access computed selectors
  const isSelected = useOrganizationStore(state => state.isOrgSelected('org-id'));
  const specificOrg = useOrganizationStore(state => state.getOrganizationById('org-id'));

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {organizations.map(org => (
        <div key={org.id}>{org.name}</div>
      ))}
    </div>
  );
}
```

### API Methods

#### State
- `organizations: Organization[]` - Cached list of organizations
- `currentOrg: Organization | null` - Currently selected organization
- `loading: boolean` - Loading state
- `error: string | null` - Error message

#### Actions
- `setOrganizations(orgs: Organization[])` - Manually set organizations list
- `setCurrentOrg(org: Organization | null)` - Set current organization
- `fetchOrganizations()` - Load organizations from `/api/admin/organizations`
- `fetchOrganizationById(id: string)` - Load single org and set as current
- `createOrganization(payload)` - Create new organization (optimistic update)
- `updateOrganization(id, payload)` - Update organization (optimistic update)
- `deleteOrganization(id, confirmOrgSlug?)` - Delete organization

#### Selectors
- `getOrganizationById(id: string)` - Get organization from store by ID
- `isOrgSelected(id: string)` - Check if organization is currently selected

### API Endpoints

The store uses the following API endpoints:

- `GET /api/admin/organizations` - List all organizations (root admin)
- `GET /api/admin/organizations/:id` - Get single organization details
- `POST /api/admin/organizations` - Create new organization
- `PATCH /api/admin/organizations/:id` - Update organization
- `DELETE /api/admin/organizations/:id` - Delete organization

### Types

See `src/types/organization.ts` for full type definitions:
- `Organization` - Main organization entity
- `CreateOrganizationPayload` - Payload for creating organizations
- `UpdateOrganizationPayload` - Payload for updating organizations

### Testing

Comprehensive tests are available in `src/__tests__/useOrganizationStore.test.ts` covering:
- Initial state
- State setters
- Async actions (fetch, create, update, delete)
- Error handling
- Selectors
- Optimistic updates

Run tests with:
```bash
npm test useOrganizationStore
```

### Best Practices

1. **Optimistic Updates**: Create and update operations use optimistic updates for better UX
2. **Error Handling**: Always handle errors returned by async actions
3. **Loading States**: Use the `loading` state to show loading indicators
4. **Selective Subscription**: Use selectors to subscribe to specific parts of the state
5. **SSR Compatibility**: The store is designed to work with Next.js SSR - state is client-side only

### Example: Creating an Organization

```typescript
const { createOrganization, error } = useOrganizationStore();

const handleCreate = async () => {
  try {
    const newOrg = await createOrganization({
      name: 'My New Organization',
      slug: 'my-new-org'
    });
    console.log('Created:', newOrg);
  } catch (err) {
    console.error('Failed to create:', error);
  }
};
```

### Example: Using Selectors

```typescript
// Subscribe only to specific organization
function OrganizationDetails({ orgId }: { orgId: string }) {
  const org = useOrganizationStore(state => state.getOrganizationById(orgId));
  const isSelected = useOrganizationStore(state => state.isOrgSelected(orgId));
  
  if (!org) return <div>Organization not found</div>;
  
  return (
    <div>
      <h2>{org.name}</h2>
      {isSelected && <span>✓ Selected</span>}
    </div>
  );
}
```
