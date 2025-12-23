# Room Subscription Based on Role - Implementation Guide

This document describes the implementation of role-based room subscriptions for WebSocket connections in ArenaOne.

## Overview

The system uses two separate socket connections:

1. **NotificationSocket** - A global, persistent socket for role-scoped notifications
2. **BookingSocket** - A club-specific socket for real-time booking updates

## Architecture

### NotificationSocket

- **Purpose**: Delivers role-scoped notifications (admin notifications, payment events)
- **Lifecycle**: Initialized at app startup, remains active throughout user session
- **Provider**: `SocketProvider` in `src/contexts/SocketContext.tsx`
- **Listener**: `GlobalSocketListener` in `src/components/GlobalSocketListener.tsx`

**Room Subscriptions:**
- Root Admin → `root_admin` room
- Organization Admin → `organization:{orgId}` rooms for all managed organizations
- Club Admin → `club:{clubId}` rooms for all managed clubs
- Player → `club:{clubId}` rooms for all clubs they belong to

### BookingSocket

- **Purpose**: Delivers real-time booking and slot lock updates for a specific club
- **Lifecycle**: Connects when entering club operations page, disconnects when leaving
- **Provider**: `BookingSocketProvider` in `src/contexts/BookingSocketContext.tsx`
- **Listener**: `BookingSocketListener` in `src/components/BookingSocketListener.tsx`

**Room Subscriptions:**
- All users → `club:{clubId}` room for the currently active club
- Access control enforced: user must have access to the club to connect

## Server-Side Implementation

Located in `server.js`:

```javascript
// Notification Socket (no clubId)
if (!requestedClubId) {
  // Root admin joins root_admin room
  if (userData.isRoot) {
    socket.join('root_admin');
  }
  
  // Join organization rooms
  userData.organizationIds.forEach((orgId) => {
    socket.join(`organization:${orgId}`);
  });
  
  // Join club rooms
  userData.clubIds.forEach((clubId) => {
    socket.join(`club:${clubId}`);
  });
}

// Booking Socket (with clubId)
else {
  // Root admin joins root_admin room
  if (userData.isRoot) {
    socket.join('root_admin');
  }
  
  // Join specific club room if user has access
  if (userData.clubIds.includes(requestedClubId) || userData.isRoot) {
    socket.join(`club:${requestedClubId}`);
  }
  
  // Also join organization rooms
  userData.organizationIds.forEach((orgId) => {
    socket.join(`organization:${orgId}`);
  });
}
```

## Client-Side Implementation

### 1. Root Layout Setup

Add both providers to the root layout:

```tsx
<ClubProvider>
  <SocketProvider>
    <BookingSocketProvider>
      <GlobalSocketListener />
      {/* Other app components */}
    </BookingSocketProvider>
  </SocketProvider>
</ClubProvider>
```

### 2. Club Operations Page

Add BookingSocketListener to club operations pages:

```tsx
import { BookingSocketListener } from '@/components/BookingSocketListener';

export default function ClubOperationsPage() {
  const { setActiveClubId } = useActiveClub();
  
  useEffect(() => {
    // Set active club - triggers BookingSocket connection
    setActiveClubId(clubId);
    
    return () => {
      // Clear active club - triggers BookingSocket disconnection
      setActiveClubId(null);
    };
  }, [clubId]);

  return (
    <main>
      <BookingSocketListener />
      {/* Page content */}
    </main>
  );
}
```

## Event Flow

### Admin Notifications
- Server emits to `root_admin`, `organization:{orgId}`, or `club:{clubId}` rooms
- NotificationSocket receives event
- GlobalSocketListener handles event:
  - Shows toast notification
  - Adds to notification store for UI display

### Booking Events
- Server emits to `club:{clubId}` room
- Both NotificationSocket AND BookingSocket receive event (if BookingSocket is connected)
- GlobalSocketListener handles notification aspect:
  - Shows toast notification
  - Adds to notification store
- BookingSocketListener handles real-time update aspect:
  - Shows toast notification
  - Updates booking store for calendar sync

### Payment Events
- Server emits to appropriate room based on event context
- NotificationSocket receives event
- GlobalSocketListener handles event:
  - Shows toast notification
  - Adds to notification store

## Testing

Comprehensive tests cover:

1. **BookingSocket.test.tsx** (8 tests)
   - Connection behavior based on activeClubId
   - Access control verification
   - Event handler registration
   - Cleanup on disconnect

2. **BookingSocketListener.test.tsx** (7 tests)
   - Event handling for booking/slot events
   - Club filtering (only process events for active club)
   - Store updates
   - Toast notifications

3. **role-based-room-subscription.test.ts** (8 tests)
   - Room subscription for each role (Root, Org Admin, Club Admin, Player)
   - No duplicate subscriptions
   - Error handling

4. **GlobalSocketListener.test.tsx** (updated)
   - Admin notification handling
   - Payment event handling
   - Notification store updates

## Security

- **Token-based authentication**: All socket connections require valid JWT token
- **Role verification**: Server verifies user's role and scope from database
- **Access control**: BookingSocket verifies user has access to requested club
- **Room isolation**: Server-side rooms ensure users only receive events they're authorized to see

## Key Features

✅ **No client-side filtering**: Server-side rooms handle all filtering
✅ **No duplicate subscriptions**: Deduplication handled in socketAuth.ts
✅ **Automatic reconnection**: Built-in reconnection handling
✅ **Lifecycle management**: Clear connection/disconnection based on context
✅ **Type-safe**: Full TypeScript support with typed events

## Migration Notes

### Before
- Single socket connection for all events
- Client-side filtering of events
- Booking events mixed with notification events in single listener

### After
- Two separate socket connections (Notification + Booking)
- Server-side room filtering
- Clear separation of concerns:
  - NotificationSocket → Global notifications
  - BookingSocket → Real-time club operations
