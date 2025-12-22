# Socket.IO Authentication & Secure Room Subscription

## Overview

This document describes the implementation of secure, production-ready Socket.IO authentication and room-based event distribution in the ArenaOne platform.

## Architecture

### Authentication Flow

1. **Client Authentication**
   - Client obtains JWT session token from NextAuth when logging in
   - Client extracts session token from cookies
   - Client passes token in `auth.token` field during socket connection

2. **Server Verification**
   - Server middleware intercepts socket connection
   - Verifies JWT token using NextAuth's `decode()` function
   - Extracts user identity: `userId`, `isRoot` flag
   - Queries database for user's organization and club memberships
   - Attaches complete user context to socket instance

3. **Authorization Failure**
   - If token is missing or invalid → Socket connection is rejected
   - Client receives connection error and does not retry

### Room Subscription

After successful authentication, the server automatically subscribes each socket to rooms based on user permissions:

#### Room Types

1. **Root Admin Room**: `root_admin`
   - All users with `isRoot = true` join this room
   - Receives all events across the platform

2. **Organization Rooms**: `organization:{organizationId}`
   - Users with memberships in an organization join that org's room
   - Receives organization-level events (future use)

3. **Club Rooms**: `club:{clubId}`
   - Users with direct club memberships join that club's room
   - Organization admins automatically join rooms for all clubs in their organizations
   - Receives booking, payment, and slot lock events for that club

#### Room Assignment Logic

```typescript
// Root admins
if (userData.isRoot) {
  socket.join('root_admin');
}

// Organization rooms
userData.organizationIds.forEach(orgId => {
  socket.join(`organization:${orgId}`);
});

// Club rooms
userData.clubIds.forEach(clubId => {
  socket.join(`club:${clubId}`);
});
```

For organization admins:
- Direct club memberships are included
- All clubs within administered organizations are also included
- Duplicates are automatically filtered

### Event Emission

All socket events are now emitted to specific rooms instead of broadcasting globally:

#### Booking Events

```typescript
// Emit to club room + root admins
io.to(`club:${clubId}`).emit('booking_created', data);
io.to('root_admin').emit('booking_created', data);
```

Events:
- `booking_created` (+ legacy `bookingCreated`)
- `booking_updated` (+ legacy `bookingUpdated`)
- `booking_cancelled` (+ legacy `bookingDeleted`)

#### Slot Lock Events

```typescript
// Emit to club room + root admins
io.to(`club:${clubId}`).emit('slot_locked', data);
io.to('root_admin').emit('slot_locked', data);
```

Events:
- `slot_locked`
- `slot_unlocked`
- `lock_expired`

#### Payment Events

```typescript
// Emit to club room + root admins
io.to(`club:${clubId}`).emit('payment_confirmed', data);
io.to('root_admin').emit('payment_confirmed', data);
```

Events:
- `payment_confirmed`
- `payment_failed`

#### Admin Notifications

```typescript
// Emit to root admins only
io.to('root_admin').emit('admin_notification', data);
```

Events:
- `admin_notification`

## Security Guarantees

1. **No Unauthorized Access**
   - Users cannot connect without a valid JWT token
   - Users cannot manually join rooms
   - All room subscriptions are server-controlled

2. **Data Isolation**
   - Users only receive events for clubs/organizations they have access to
   - Root admins receive all events
   - Organization admins receive events for their organization's clubs
   - Regular members receive events only for clubs they belong to

3. **Token Validation**
   - JWT tokens are verified using NextAuth's secret
   - Invalid or expired tokens result in immediate disconnection
   - No retry on authentication failure

## Implementation Files

### Server-Side

1. **`server.js`**
   - Socket.IO initialization
   - Authentication middleware
   - Room subscription logic

2. **`socketAuth.js`**
   - JWT token verification (CommonJS)
   - User permission resolution
   - Database queries for memberships

3. **`src/lib/socketAuth.ts`**
   - TypeScript version for import in other TS files
   - Type definitions for socket user data

4. **`src/lib/socketEmitters.ts`**
   - Helper functions for emitting events
   - Room-based emission logic
   - Backward compatibility with legacy event names

5. **`src/lib/adminNotifications.ts`**
   - Admin notification emission to root_admin room

### Client-Side

1. **`src/contexts/SocketContext.tsx`**
   - Socket connection initialization with auth token
   - Session-aware reconnection
   - Automatic cleanup on logout

2. **`src/types/socket.ts`**
   - Updated `SocketData` interface
   - Type definitions for events

## Usage Examples

### Emitting Events from API Routes

```typescript
import { emitBookingCreated } from '@/lib/socketEmitters';

// In your API route
const booking = await prisma.booking.create({ /* ... */ });

// Emit to authorized users only
emitBookingCreated({
  booking: transformedBooking,
  clubId: booking.clubId,
  courtId: booking.courtId,
});
```

### Listening to Events in Components

```typescript
import { useSocket } from '@/contexts/SocketContext';

function MyComponent() {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleBookingCreated = (data: BookingCreatedEvent) => {
      // Handle event
      console.log('New booking:', data);
    };

    socket.on('booking_created', handleBookingCreated);

    return () => {
      socket.off('booking_created', handleBookingCreated);
    };
  }, [socket]);
}
```

## Testing

### Unit Tests

1. **Socket Authentication** (`src/__tests__/socketAuth.test.ts`)
   - Token verification
   - Permission resolution
   - Organization admin club access
   - Duplicate filtering

2. **Socket Emitters** (`src/__tests__/socketEmitters.test.ts`)
   - Room-based emission
   - Legacy event support
   - Error handling

### Manual Testing Checklist

- [ ] User can connect with valid session
- [ ] User cannot connect without session
- [ ] User receives events only for their clubs
- [ ] Organization admin receives events for all org clubs
- [ ] Root admin receives all events
- [ ] Multiple tabs for same user work correctly
- [ ] Events are not received after logout
- [ ] Socket reconnects after network interruption

## Migration Notes

### Backward Compatibility

- Legacy event names (`bookingCreated`, `bookingUpdated`, `bookingDeleted`) are still emitted
- Clients using old event names will continue to work
- New clients should use underscore-separated names (`booking_created`, etc.)

### Breaking Changes

None. The implementation is fully backward compatible with existing client code.

## Performance Considerations

1. **Connection Overhead**
   - Each connection performs 2-3 database queries to resolve permissions
   - Queries are indexed and should be fast
   - Consider caching user permissions if connection overhead becomes an issue

2. **Room Management**
   - Socket.IO efficiently handles room-based emission
   - No performance impact for users in multiple rooms
   - Root admins receive all events but this is intentional

3. **Event Filtering**
   - Events are filtered at the server level before emission
   - Clients only receive events they're authorized for
   - No client-side filtering needed

## Future Enhancements

1. **Organization-Level Events**
   - Currently, organization rooms are subscribed but not used
   - Future: emit organization-wide notifications

2. **Fine-Grained Permissions**
   - Currently: all club members receive all club events
   - Future: role-based event filtering (e.g., only admins receive payment events)

3. **Event Acknowledgments**
   - Currently: fire-and-forget event emission
   - Future: add acknowledgment for critical events

4. **Admin Notification Scoping**
   - Currently: all admin notifications go to root admins only
   - Future: scope to relevant organization/club admins based on context

## Troubleshooting

### Connection Fails with "Authentication token required"

- Check that user is logged in
- Verify session token cookie is present
- Check browser console for cookie errors

### Connection Fails with "Invalid authentication token"

- Token may be expired
- User may need to log in again
- Check AUTH_SECRET environment variable matches

### User Not Receiving Events

- Verify user has membership in the relevant club/organization
- Check server logs for room subscription confirmation
- Verify event is being emitted with correct clubId

### Multiple Socket Connections

- Ensure SocketProvider is only used once in app tree
- Check for multiple tabs/windows (this is expected behavior)
- Each tab maintains its own socket connection

## Related Documentation

- [WebSocket Implementation](./websocket-implementation.md)
- [Role-Based Access Control](./role-based-user-access.md)
- [Admin Notifications](./PUSH_NOTIFICATIONS_IMPLEMENTATION.md)
