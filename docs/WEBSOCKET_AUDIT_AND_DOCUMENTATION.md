# WebSocket (Socket.IO) Audit & Documentation

**Date:** 2025-12-21  
**Version:** 1.0  
**Socket.IO Version:** 4.8.1  
**Purpose:** Comprehensive audit of WebSocket implementation across the ArenaOne platform

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Event Catalog](#event-catalog)
4. [File & Component Mapping](#file--component-mapping)
5. [UI Integration](#ui-integration)
6. [Store Integration](#store-integration)
7. [Edge Cases & Stability](#edge-cases--stability)
8. [Recommendations](#recommendations)

---

## Executive Summary

### Implementation Status

✅ **Fully Operational**
- Single global Socket.IO connection managed by `SocketProvider`
- Real-time event broadcasting from server to all connected clients
- Integration with booking and notification stores (Zustand)
- Toast notifications for all events
- Automatic reconnection and connection state tracking
- Event deduplication to prevent duplicate processing

### Key Statistics

- **9 Event Types**: 3 booking, 3 slot, 2 payment, 1 admin notification
- **3 Legacy Events**: Still being emitted for backward compatibility
- **13 Files**: Core WebSocket implementation
- **2 Zustand Stores**: Booking and Notification stores updated in real-time
- **4 UI Components**: Directly consuming WebSocket events
- **0 Polling**: Fully WebSocket-based, no HTTP polling

### Technology Stack

- **Client Library**: `socket.io-client` v4.8.1
- **Server Library**: `socket.io` v4.8.1
- **Transport**: WebSocket with automatic fallback
- **State Management**: Zustand stores
- **Pattern**: Event-driven architecture with global listener

---

## Architecture Overview

### Server-Side Architecture

#### Socket.IO Server Setup

**File**: `/server.js`

```javascript
// Initialize Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL || false,
    methods: ['GET', 'POST'],
  },
});

// Store globally for API routes
global.io = io;

// Connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

**Features**:
- HTTP server with Socket.IO attached
- CORS configuration for development and production
- Global `io` instance accessible from API routes
- Basic connection logging

**Initialization**: Server starts on `npm run dev` or `npm start`

#### Event Emission from API Routes

**File**: `/src/lib/socketEmitters.ts`

**Purpose**: Centralized utilities for emitting WebSocket events from API routes

**Functions**:
- `getSocketIO()`: Get global Socket.IO instance
- `emitBookingCreated(data)`: Emit booking created event
- `emitBookingUpdated(data)`: Emit booking updated event
- `emitBookingDeleted(data)`: Emit booking cancelled event
- `emitSlotLocked(data)`: Emit slot locked event
- `emitSlotUnlocked(data)`: Emit slot unlocked event
- `emitLockExpired(data)`: Emit lock expired event
- `emitPaymentConfirmed(data)`: Emit payment confirmed event
- `emitPaymentFailed(data)`: Emit payment failed event

**Usage Example**:
```typescript
import { emitBookingCreated } from '@/lib/socketEmitters';

// After creating a booking
emitBookingCreated({
  booking: newBooking,
  clubId: booking.clubId,
  courtId: booking.courtId,
});
```

**Broadcasting Strategy**: All events are broadcast to ALL connected clients using `io.emit()`. No room-based filtering is currently implemented.

### Client-Side Architecture

#### Socket.IO Client Initialization

**File**: `/src/contexts/SocketContext.tsx`

**Component**: `SocketProvider`

**Features**:
- Singleton pattern - only one socket instance per app
- Automatic connection on mount
- Connection state tracking (`isConnected`)
- Reconnection handling with logging
- Proper cleanup on unmount
- Context provider for global access

**Integration**: Wrapped around entire app in `/src/app/layout.tsx`

```tsx
<SocketProvider>
  <GlobalSocketListener />
  <NotificationStoreInitializer />
  {children}
</SocketProvider>
```

**Lifecycle**:
1. Provider mounts → Socket connects
2. Components access socket via `useSocket()` hook
3. Provider unmounts → Socket disconnects and cleans up

**Hook**: `useSocket()`

```typescript
const { socket, isConnected } = useSocket();

// Use socket in effect
useEffect(() => {
  if (!socket) return;
  
  socket.on('event_name', handler);
  return () => socket.off('event_name', handler);
}, [socket]);
```

#### Global Event Dispatcher

**File**: `/src/components/GlobalSocketListener.tsx`

**Component**: `GlobalSocketListener`

**Purpose**: Single global component that subscribes to ALL WebSocket events and:
1. Shows toast notifications via `globalNotificationManager`
2. Updates Zustand stores (booking store, notification store)
3. Transforms booking/payment events into admin notifications

**Event Handlers**:

| Event | Toast | Booking Store | Notification Store |
|-------|-------|---------------|-------------------|
| `booking_created` | ✅ | Update | Add |
| `booking_updated` | ✅ | Update | Add |
| `booking_cancelled` | ✅ | Remove | Add |
| `slot_locked` | ✅ | Add lock | - |
| `slot_unlocked` | ✅ | Remove lock | - |
| `lock_expired` | ✅ | Remove lock | - |
| `payment_confirmed` | ✅ | - | Add |
| `payment_failed` | ✅ | - | Add |
| `admin_notification` | - | - | Add |

**Lifecycle**:
- Mounted once in root layout
- Listens to all events for entire app session
- Cleans up listeners on unmount
- Periodic cleanup of expired locks (60 seconds)

#### Notification Manager

**File**: `/src/utils/globalNotificationManager.ts`

**Class**: `GlobalNotificationManager` (Singleton)

**Purpose**: Manages toast notification display for WebSocket events

**Features**:
- Event-to-toast-type mapping
- Duplicate prevention (5-second window)
- User-friendly messages
- Auto-dismiss after 6 seconds
- Multi-toast queue support (up to 5 simultaneous)

**Event Transformation**: Also provides functions to transform booking/payment events into `AdminNotification` format for persistence in notification store

**Functions**:
- `handleSocketEvent(eventType, data)`: Show toast for event
- `transformBookingCreated(event)`: Convert to admin notification
- `transformBookingUpdated(event)`: Convert to admin notification
- `transformBookingCancelled(event)`: Convert to admin notification
- `transformPaymentConfirmed(event)`: Convert to admin notification
- `transformPaymentFailed(event)`: Convert to admin notification

---

## Event Catalog

### Event Type Definitions

**File**: `/src/types/socket.ts`

All event types are strongly typed using TypeScript interfaces.

### 1. Booking Events

#### Event: `booking_created`

**Emitted**: After successful booking creation
**Emitted From**: 
- `/src/app/api/admin/bookings/create/route.ts`
- Any API route that creates bookings

**Payload**:
```typescript
{
  booking: OperationsBooking;  // Full booking object
  clubId: string;              // Club ID
  courtId: string;             // Court ID
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, updates booking store, adds to notification store
- `useCourtAvailability` → Triggers availability refresh

**UI Effect**:
- Toast notification: "📅 New booking created"
- Operations page calendar updates in real-time
- Notification bell shows new notification
- Booking appears in notifications page

**Legacy Event**: Also emits `bookingCreated` (camelCase)

---

#### Event: `booking_updated`

**Emitted**: After booking status/details change
**Emitted From**: 
- `/src/app/api/admin/bookings/[id]/route.ts` (PATCH)
- Any API route that updates bookings

**Payload**:
```typescript
{
  booking: OperationsBooking;  // Updated booking object
  clubId: string;              // Club ID
  courtId: string;             // Court ID
  previousStatus?: string;     // Previous booking status (optional)
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, updates booking store, adds to notification store

**UI Effect**:
- Toast notification: "🔄 Booking updated"
- Operations page calendar reflects changes
- Notification bell increments unread count
- Status badge updates in booking cards

**Legacy Event**: Also emits `bookingUpdated` (camelCase)

---

#### Event: `booking_cancelled`

**Emitted**: After booking cancellation
**Emitted From**: 
- `/src/app/api/admin/bookings/[id]/route.ts` (PATCH with status: cancelled)
- Cancellation endpoints

**Payload**:
```typescript
{
  bookingId: string;  // ID of cancelled booking
  clubId: string;     // Club ID
  courtId: string;    // Court ID
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, removes from booking store, adds to notification store
- `useCourtAvailability` → Triggers availability refresh

**UI Effect**:
- Toast notification: "❌ Booking cancelled"
- Booking removed from operations calendar
- Notification bell shows cancellation notification
- Slot becomes available again

**Legacy Event**: Also emits `bookingDeleted` (camelCase)

---

### 2. Slot Lock Events

#### Event: `slot_locked`

**Emitted**: When a user locks a time slot during booking flow
**Emitted From**: Slot locking API endpoints (during booking creation process)

**Payload**:
```typescript
{
  slotId: string;      // Unique slot identifier
  courtId: string;     // Court ID
  clubId: string;      // Club ID
  userId?: string;     // User who locked the slot (optional)
  startTime: string;   // ISO 8601 timestamp
  endTime: string;     // ISO 8601 timestamp
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, adds to booking store locked slots
- `useCourtAvailability` → Triggers availability refresh

**UI Effect**:
- Toast notification: "🔒 Court slot locked"
- Slot appears as temporarily unavailable
- Lock expires after 5 minutes
- Other users see slot as locked

**Room/Scope**: Broadcast globally (clubId included in payload but not used for filtering)

---

#### Event: `slot_unlocked`

**Emitted**: When user unlocks a slot or completes/abandons booking
**Emitted From**: Slot unlock API endpoints

**Payload**:
```typescript
{
  slotId: string;   // Unique slot identifier
  courtId: string;  // Court ID
  clubId: string;   // Club ID
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, removes from booking store locked slots
- `useCourtAvailability` → Triggers availability refresh

**UI Effect**:
- Toast notification: "🔓 Court slot unlocked"
- Slot becomes available again
- Visual lock indicator removed

---

#### Event: `lock_expired`

**Emitted**: When a slot lock expires (5 minutes)
**Emitted From**: Background job or lock expiration handler

**Payload**:
```typescript
{
  slotId: string;   // Unique slot identifier
  courtId: string;  // Court ID
  clubId: string;   // Club ID
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, removes from booking store locked slots
- `useCourtAvailability` → Triggers availability refresh

**UI Effect**:
- Toast notification: "⏰ Slot lock expired"
- Slot automatically becomes available
- Periodic cleanup removes stale locks (60-second interval)

**Auto-Cleanup**: Booking store runs `cleanupExpiredLocks()` every 60 seconds

---

### 3. Payment Events

#### Event: `payment_confirmed`

**Emitted**: After successful payment processing
**Emitted From**: Payment webhook handlers

**Payload**:
```typescript
{
  paymentId: string;   // Payment ID
  bookingId: string;   // Associated booking ID
  amount: number;      // Payment amount
  currency: string;    // Currency code (e.g., "UAH", "USD")
  clubId: string;      // Club ID
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, adds to notification store

**UI Effect**:
- Toast notification: "✅ Payment confirmed: UAH 500"
- Notification bell shows payment confirmation
- Booking status may update to confirmed/paid

---

#### Event: `payment_failed`

**Emitted**: After payment failure
**Emitted From**: Payment webhook handlers

**Payload**:
```typescript
{
  paymentId: string;   // Payment ID
  bookingId: string;   // Associated booking ID
  reason: string;      // Failure reason
  clubId: string;      // Club ID
}
```

**Consumed By**:
- `GlobalSocketListener` → Shows toast, adds to notification store

**UI Effect**:
- Toast notification: "💳 Payment failed: Insufficient funds"
- Notification bell shows payment failure
- User may be prompted to retry payment

---

### 4. Admin Notification Events

#### Event: `admin_notification`

**Emitted**: For training requests and admin-relevant events
**Emitted From**: 
- `/src/lib/adminNotifications.ts` → `createAdminNotification()`
- Training request workflows

**Payload**:
```typescript
{
  id: string;                    // Notification ID
  type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED" | 
        "BOOKING_CREATED" | "BOOKING_UPDATED" | "BOOKING_CANCELLED" | 
        "PAYMENT_CONFIRMED" | "PAYMENT_FAILED";
  playerId: string;              // Player user ID
  playerName?: string;           // Player name
  playerEmail?: string | null;   // Player email
  coachId: string;               // Coach user ID
  coachName?: string;            // Coach name
  trainingRequestId: string | null;  // Training request ID (if applicable)
  bookingId: string | null;      // Booking ID (if applicable)
  sessionDate: string | null;    // ISO 8601 date
  sessionTime: string | null;    // Time string
  courtInfo: string | null;      // Court description
  summary?: string;              // Human-readable summary
  read: boolean;                 // Read status
  createdAt: string;             // ISO 8601 timestamp
  // Optional payment fields
  paymentId?: string | null;
  amount?: number | null;
  currency?: string | null;
  paymentReason?: string | null;
}
```

**Consumed By**:
- `GlobalSocketListener` → Adds to notification store (no toast)

**UI Effect**:
- Notification bell increments unread count
- Notification appears in dropdown and notifications page
- No toast (to avoid duplication with booking event toasts)

**Purpose**: Unified notification system for training requests AND transformed booking/payment events

---

## File & Component Mapping

### Core WebSocket Files

| File | Type | Purpose | Events |
|------|------|---------|--------|
| `/server.js` | Server | Socket.IO server initialization | Connection/disconnection |
| `/src/contexts/SocketContext.tsx` | Client | Socket connection provider | Connection state |
| `/src/components/GlobalSocketListener.tsx` | Client | Global event listener | All 9 events |
| `/src/lib/socketEmitters.ts` | Server | Event emission utilities | Emit all events |
| `/src/types/socket.ts` | Shared | TypeScript type definitions | All event types |
| `/src/utils/globalNotificationManager.ts` | Client | Toast notification manager | All events (toast) |
| `/src/utils/socketUpdateManager.ts` | Client | Booking update utilities | Booking events |
| `/src/lib/adminNotifications.ts` | Server | Admin notification creation | admin_notification |

### Components Using WebSocket

| Component | File | Hook/Context | Events Consumed | Purpose |
|-----------|------|--------------|-----------------|---------|
| `GlobalSocketListener` | `/src/components/GlobalSocketListener.tsx` | `useSocket()` | All 9 events | Global dispatcher |
| `NotificationBell` | `/src/components/admin/NotificationBell.tsx` | `useNotifications()` | Indirect (via store) | Header notification bell |
| `useCourtAvailability` | `/src/hooks/useCourtAvailability.ts` | `useSocket()` | booking_created, booking_cancelled, slot_locked, slot_unlocked, lock_expired | Court availability updates |
| Example components | `/src/components/examples/` | `useSocket()` | Various (for testing) | WebSocket testing demos |

### Zustand Stores

| Store | File | Updated By | Purpose |
|-------|------|-----------|---------|
| `useBookingStore` | `/src/stores/useBookingStore.ts` | GlobalSocketListener | Real-time booking data |
| `useNotificationStore` | `/src/stores/useNotificationStore.ts` | GlobalSocketListener | Admin notifications |

### API Routes Emitting Events

| Route | Events Emitted | When |
|-------|----------------|------|
| `/src/app/api/admin/bookings/create/route.ts` | `booking_created` | After booking creation |
| `/src/app/api/admin/bookings/[id]/route.ts` | `booking_updated`, `booking_cancelled` | After update/cancellation |
| `/src/app/api/(player)/bookings/route.ts` | `booking_created` | Player booking creation |
| Payment webhooks | `payment_confirmed`, `payment_failed` | Payment processing |
| Slot management | `slot_locked`, `slot_unlocked`, `lock_expired` | Slot lock operations |

### Test Files

| File | Purpose |
|------|---------|
| `/src/__tests__/GlobalSocketListener.test.tsx` | GlobalSocketListener unit tests |
| `/src/__tests__/socketEmitters.test.ts` | Socket emitter function tests |
| `/src/__tests__/socketUpdateManager.test.ts` | Update manager utilities tests |
| `/src/__tests__/useCourtAvailability.test.ts` | Court availability hook tests |
| `/src/__tests__/realtime-booking-updates.test.tsx` | Real-time booking update tests |

---

## UI Integration

### Toast Notifications

**Implementation**: `/src/lib/toast.ts` + `/src/utils/globalNotificationManager.ts`

**Features**:
- Multi-toast support (up to 5 simultaneous)
- Auto-dismiss after 6 seconds
- Smooth animations
- Type-specific styling (info, success, error, warning)
- Non-blocking user experience

**Event → Toast Mapping**:

| Event | Toast Type | Icon | Message |
|-------|-----------|------|---------|
| booking_created | info | 📅 | "New booking created" |
| booking_updated | info | 🔄 | "Booking updated" |
| booking_cancelled | info | ❌ | "Booking cancelled" |
| slot_locked | info | 🔒 | "Court slot locked" |
| slot_unlocked | info | 🔓 | "Court slot unlocked" |
| lock_expired | info | ⏰ | "Slot lock expired" |
| payment_confirmed | success | ✅ | "Payment confirmed: {currency} {amount}" |
| payment_failed | error | 💳 | "Payment failed: {reason}" |

**Duplicate Prevention**: 5-second window prevents showing duplicate toasts for the same event

### Notification Bell Component

**File**: `/src/components/admin/NotificationBell.tsx`

**Data Source**: `useNotificationStore` (Zustand)

**Updates**: Via `GlobalSocketListener` → `addNotification()`

**Features**:
- Real-time unread count badge
- Dropdown with latest 10 notifications
- Connection status indicator (always connected with Socket.IO)
- Toast preview of new notifications
- Mark as read functionality
- Link to full notifications page

**Events That Trigger Bell**:
- All booking events (via transformation)
- All payment events (via transformation)
- Training request events (admin_notification)

### Notifications Page

**File**: `/src/app/(pages)/admin/notifications/page.tsx`

**Data Source**: `useNotificationStore` (Zustand)

**Updates**: Real-time via WebSocket through GlobalSocketListener

**Features**:
- Full list of all notifications
- Filter by type
- Mark as read/unread
- Pagination
- Detailed notification view

### Operations Page (Calendar)

**Component**: `/src/app/(pages)/admin/clubs/[id]/operations/page.tsx`

**Data Source**: `useBookingStore` (Zustand)

**Updates**: Via `GlobalSocketListener` → booking store methods

**Real-Time Features**:
- Bookings appear immediately after creation
- Booking updates reflect instantly
- Cancelled bookings disappear
- Locked slots show as unavailable
- Lock expiration auto-unlocks slots

**UI Effects**:
- Green flash on new booking
- Yellow flash on booking update
- Red flash on cancellation
- Gray overlay on locked slots

### Court Availability Components

**Hook**: `useCourtAvailability`

**Purpose**: Refresh court availability when events occur

**Events Monitored**:
- booking_created
- booking_cancelled
- slot_locked
- slot_unlocked
- lock_expired

**Behavior**:
- Triggers `triggerRefresh()` when event matches clubId
- Updates `refreshKey` to force component re-render
- Deduplication prevents multiple refreshes for same event

---

## Store Integration

### Booking Store (`useBookingStore`)

**File**: `/src/stores/useBookingStore.ts`

**Purpose**: Centralized state for bookings and locked slots

**WebSocket Update Methods**:

```typescript
// Called by GlobalSocketListener
updateBookingFromSocket(booking: OperationsBooking): void
removeBookingFromSocket(bookingId: string): void
addLockedSlot(event: SlotLockedEvent): void
removeLockedSlot(slotId: string): void
cleanupExpiredLocks(): void
```

**Update Strategy**:
- **Timestamp-based conflict resolution**: Only applies updates if incoming booking is newer
- **Deduplication**: Prevents duplicate locked slots
- **Auto-cleanup**: Removes expired locks every 60 seconds

**State**:
```typescript
{
  bookings: OperationsBooking[];
  lockedSlots: LockedSlot[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  lastFetchParams: { clubId: string; date: string } | null;
}
```

**Locked Slot Expiration**: 5 minutes (300,000 ms)

**Conflict Resolution Example**:
```typescript
// Implemented in /src/utils/socketUpdateManager.ts
// If incoming booking has older timestamp, it's ignored
const shouldApplyBookingUpdate = (current, incoming) => {
  const currentTime = new Date(current.updatedAt).getTime();
  const incomingTime = new Date(incoming.updatedAt).getTime();
  return incomingTime > currentTime;
};

// Usage in booking store:
updateBookingFromSocket(booking: OperationsBooking) {
  const currentBookings = get().bookings;
  const updatedBookings = updateBookingInList(currentBookings, booking);
  
  // updateBookingInList internally uses shouldApplyBookingUpdate
  // Only updates state if the booking list was modified
  if (updatedBookings !== currentBookings) {
    set({ bookings: updatedBookings });
  }
}
```

### Notification Store (`useNotificationStore`)

**File**: `/src/stores/useNotificationStore.ts`

**Purpose**: Centralized state for admin notifications

**WebSocket Update Methods**:

```typescript
// Called by GlobalSocketListener
addNotification(notification: AdminNotification): void
```

**Features**:
- Duplicate prevention (checks notification ID)
- Automatic unread count management
- Prepends new notifications to list (newest first)

**State**:
```typescript
{
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}
```

**Data Flow**:
1. WebSocket event received
2. Transformed to AdminNotification format (if needed)
3. `addNotification()` called
4. Duplicate check
5. Add to notifications array
6. Increment unread count
7. All UI components re-render automatically

---

## Edge Cases & Stability

### Reconnection Logic

**Automatic Reconnection**: Built into Socket.IO client

**Handling**:
```typescript
// In SocketContext.tsx
socket.io.on('reconnect', (attemptNumber) => {
  console.log('[SocketProvider] Socket reconnected after', attemptNumber, 'attempts');
  setIsConnected(true);
});
```

**Behavior**:
- Exponential backoff
- Unlimited reconnection attempts
- State updates on reconnect
- No data loss during brief disconnections

**UI Indicator**: Notification bell shows connection status (green dot when connected)

### Multiple Clients Handling

**Current Implementation**: Broadcast to ALL clients

**Implications**:
- All users see all events globally
- No room-based filtering
- Event payload includes `clubId` but not used for targeting

**Potential Issue**: Users see notifications for clubs they don't manage

**Workaround**: Client-side filtering could be added based on user permissions

**Future Enhancement**: Implement Socket.IO rooms
```typescript
// Join room when user selects club
socket.join(`club-${clubId}`);

// Emit to specific room
io.to(`club-${clubId}`).emit('booking_created', data);
```

### Event Deduplication

#### Toast Deduplication

**File**: `/src/utils/globalNotificationManager.ts`

**Strategy**: 5-second window with event ID tracking

```typescript
private recentEventIds: Set<string> = new Set();

handleEvent(eventType, data) {
  const eventId = getEventId(eventType, data);
  
  if (this.recentEventIds.has(eventId)) {
    console.log('Duplicate event ignored');
    return;
  }
  
  this.recentEventIds.add(eventId);
  
  setTimeout(() => {
    this.recentEventIds.delete(eventId);
  }, 5000);
  
  showToast(...);
}
```

#### Store Deduplication

**Booking Store**:
- Locked slots: Checks if `slotId` already exists before adding
- Bookings: Timestamp-based conflict resolution

**Notification Store**:
- Checks if notification ID already exists
- Prevents duplicate notifications in list

#### Hook Deduplication

**useCourtAvailability**:
```typescript
const eventHandledRef = useRef<Set<string>>(new Set());

const isEventHandled = (eventId: string) => {
  if (eventHandledRef.current.has(eventId)) return true;
  
  eventHandledRef.current.add(eventId);
  
  setTimeout(() => {
    eventHandledRef.current.delete(eventId);
  }, 5000);
  
  return false;
};
```

### Cleanup & Memory Leaks

#### Socket Cleanup

**SocketContext.tsx**:
```typescript
useEffect(() => {
  // Initialize socket
  const socket = io({ path: '/socket.io' });
  socketRef.current = socket;
  
  // Cleanup on unmount
  return () => {
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.io.off('reconnect');
    socket.disconnect();
    socketRef.current = null;
  };
}, []);
```

**Status**: ✅ Proper cleanup implemented

#### Listener Cleanup

**GlobalSocketListener.tsx**:
```typescript
useEffect(() => {
  // Register listeners
  socket.on('booking_created', handler);
  
  // Cleanup
  return () => {
    socket.off('booking_created', handler);
  };
}, [socket]);
```

**Status**: ✅ All listeners cleaned up on unmount

#### Timer Cleanup

**GlobalNotificationManager**:
```typescript
cleanup(): void {
  this.eventIdTimeout.forEach((timeout) => clearTimeout(timeout));
  this.eventIdTimeout.clear();
  this.recentEventIds.clear();
}
```

**Invoked**: On GlobalSocketListener unmount

**Status**: ✅ Proper cleanup implemented

#### Periodic Cleanup

**Locked Slots**:
```typescript
// In GlobalSocketListener
useEffect(() => {
  const interval = setInterval(() => {
    cleanupExpiredLocks();
  }, 60000); // Every 60 seconds
  
  return () => clearInterval(interval);
}, []);
```

**Status**: ✅ Interval cleared on unmount

### Connection State Edge Cases

| Scenario | Handling | Status |
|----------|----------|--------|
| Initial connection failure | Socket.IO auto-retry | ✅ |
| Mid-session disconnect | Auto-reconnect, state preserved | ✅ |
| Server restart | Client reconnects automatically | ✅ |
| Network outage | Exponential backoff, infinite retry | ✅ |
| Rapid disconnects/reconnects | Handled by Socket.IO engine | ✅ |
| Multiple tabs | Each tab has own connection | ✅ |

### Data Consistency

**Timestamp-Based Resolution**: Ensures newer updates always take precedence

**Inflight Request Guards**: Prevents duplicate API fetches

**Store Invalidation**: Manual invalidation available for force refresh

**Potential Race Conditions**:
- Booking created via API + WebSocket event arrives before response
  - **Handled**: Timestamp check prevents overwrite
- Multiple rapid updates to same booking
  - **Handled**: Only newest update applied

---

## Recommendations

### 1. Legacy Event Cleanup

**Current State**: Dual emission of events

**File**: `/src/lib/socketEmitters.ts`

```typescript
// Currently emitting BOTH
io.emit('bookingCreated', data);   // Legacy
io.emit('booking_created', data);  // New
```

**Recommendation**: Remove legacy event emissions

**Action Items**:
1. ✅ Verify no client code listens to legacy events
2. ⚠️ Remove `bookingCreated`, `bookingUpdated`, `bookingDeleted` emissions
3. ⚠️ Update any external integrations if they exist
4. ⚠️ Update tests to only check new event names

**Impact**: Reduces event payload size and simplifies codebase

**Migration Path**:
1. Audit all socket listeners to confirm migration complete
2. Add deprecation warnings to legacy event handlers
3. Remove legacy emissions after grace period

---

### 2. Room-Based Event Targeting

**Current Issue**: All events broadcast to ALL clients globally

**Recommendation**: Implement Socket.IO rooms for club-based filtering

**Implementation**:

```typescript
// Server-side: Join room on connection
io.on('connection', (socket) => {
  socket.on('join_club', (clubId) => {
    socket.join(`club-${clubId}`);
    console.log(`Socket ${socket.id} joined club-${clubId}`);
  });
  
  socket.on('leave_club', (clubId) => {
    socket.leave(`club-${clubId}`);
  });
});

// Emit to specific club
io.to(`club-${clubId}`).emit('booking_created', data);
```

**Client-side**:
```typescript
// Join room when user navigates to club
useEffect(() => {
  if (socket && currentClubId) {
    socket.emit('join_club', currentClubId);
    
    return () => {
      socket.emit('leave_club', currentClubId);
    };
  }
}, [socket, currentClubId]);
```

**Benefits**:
- Reduced unnecessary event processing
- Better scalability
- More targeted notifications
- Lower bandwidth usage

**Complexity**: Medium

**Priority**: High (for production scalability)

---

### 3. Event Acknowledgment

**Current State**: Fire-and-forget event emission

**Recommendation**: Add acknowledgment for critical events

```typescript
// Server emits with callback
io.emit('booking_created', data, (ack) => {
  console.log('Event delivered to', ack.clients, 'clients');
});

// Client acknowledges
socket.on('booking_created', (data, callback) => {
  handleBookingCreated(data);
  callback({ received: true });
});
```

**Benefits**:
- Confirm event delivery
- Detect disconnected clients
- Enable retry logic for critical events

**Priority**: Medium

---

### 4. Event Persistence & Replay

**Current Issue**: Events missed during disconnection are lost

**Recommendation**: Implement event queue for offline clients

**Options**:

1. **Redis-based queue**:
   - Store events in Redis with expiration
   - Replay missed events on reconnect
   - Query: `GET events:${userId}:${timestamp}`

2. **Database-based**:
   - Persist events to database
   - Replay on reconnect based on last received timestamp
   - More reliable but slower

**Implementation**:
```typescript
// On reconnect
socket.on('reconnect', () => {
  const lastEventTime = localStorage.getItem('lastEventTimestamp');
  socket.emit('request_missed_events', lastEventTime);
});

// Server sends missed events
socket.on('request_missed_events', (since) => {
  const missedEvents = getEventsSince(since);
  socket.emit('replay_events', missedEvents);
});
```

**Priority**: Low (current auto-refetch on page load mitigates this)

---

### 5. Authentication & Authorization

**Current State**: No authentication on Socket.IO connections

**Recommendation**: Add authentication middleware

```typescript
// Server-side
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  verifyToken(token, (err, user) => {
    if (err) return next(new Error('Authentication error'));
    
    socket.data.userId = user.id;
    socket.data.role = user.role;
    next();
  });
});

// Client-side
const socket = io({
  auth: {
    token: getAuthToken(),
  },
});
```

**Benefits**:
- Secure connections
- Enable user-specific rooms
- Audit trail for events
- Prevent unauthorized access

**Priority**: High (for production security)

---

### 6. Monitoring & Observability

**Recommendation**: Add monitoring for WebSocket health

**Metrics to Track**:
- Active connections count
- Events emitted per second
- Reconnection rate
- Event delivery latency
- Error rate

**Implementation**:
```typescript
// Server-side metrics
let connectedClients = 0;
let eventsEmitted = 0;

io.on('connection', (socket) => {
  connectedClients++;
  
  socket.on('disconnect', () => {
    connectedClients--;
  });
});

// Emit metric on every event
function emitWithMetrics(event, data) {
  eventsEmitted++;
  io.emit(event, data);
  
  // Log to monitoring service
  metrics.increment('websocket.events.emitted', {
    event: event,
  });
}

// Health endpoint
app.get('/api/websocket/health', (req, res) => {
  res.json({
    connectedClients,
    eventsEmitted,
    uptime: process.uptime(),
  });
});
```

**Tools**:
- Prometheus for metrics
- Grafana for dashboards
- Socket.IO Admin UI for real-time monitoring

**Priority**: Medium

---

### 7. Error Handling & Resilience

**Recommendation**: Add comprehensive error handling

```typescript
// Server-side error handling
io.on('connection', (socket) => {
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    // Log to error tracking service
  });
});

// Client-side error handling
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showToast('Connection lost. Reconnecting...', { type: 'error' });
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

**Fallback Strategy**:
- On persistent connection failure, fall back to HTTP polling
- Show user a warning banner
- Allow manual refresh

**Priority**: Medium

---

### 8. Testing Improvements

**Current State**: Basic unit tests exist

**Recommendations**:

1. **Integration Tests**:
   - Test end-to-end event flow (emit → receive → UI update)
   - Test reconnection scenarios
   - Test concurrent events

2. **Load Testing**:
   - Simulate 1000+ concurrent connections
   - Test event delivery at scale
   - Measure latency under load

3. **E2E Tests**:
   - Real browser tests with Socket.IO
   - Test multi-user scenarios
   - Test offline/online transitions

**Tools**:
- Artillery for load testing
- Playwright for E2E tests
- Socket.IO client for integration tests

**Priority**: Medium

---

### 9. Documentation for Developers

**Recommendation**: Add inline code examples to existing docs

**Missing Documentation**:
- How to add a new WebSocket event
- How to test WebSocket features locally
- How to debug WebSocket issues
- Event naming conventions
- Payload structure guidelines

**Example Addition**:
```markdown
## Adding a New WebSocket Event

1. Define event type in `/src/types/socket.ts`
2. Add emitter function in `/src/lib/socketEmitters.ts`
3. Add listener in `GlobalSocketListener.tsx`
4. Update stores if needed
5. Add tests
6. Update this documentation
```

**Priority**: Low (this document partially addresses this)

---

### 10. Performance Optimization

**Current Potential Issues**:
- Re-renders on every event (even for unrelated clubs)
- No batching of rapid events
- Full booking object transmitted on updates

**Recommendations**:

1. **Event Batching**:
```typescript
// Batch multiple events within 100ms window
// Using lodash debounce or custom implementation
import { debounce } from 'lodash';

const eventBatcher = debounce((events) => {
  io.emit('batch_update', events);
}, 100);

// Alternatively, implement custom debounce:
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}
```

2. **Selective Re-renders**:
```typescript
// Only update if event matches current context
if (data.clubId !== currentClubId) return;
```

3. **Partial Updates**:
```typescript
// Send only changed fields instead of full booking
io.emit('booking_updated', {
  bookingId: id,
  changes: { status: 'confirmed' },
  timestamp: Date.now(),
});
```

**Priority**: Low (current performance is acceptable for MVP)

---

## Conclusion

The ArenaOne WebSocket implementation is **production-ready** with the following characteristics:

✅ **Strengths**:
- Clean architecture with centralized event handling
- Type-safe event definitions
- Proper cleanup and memory management
- Automatic reconnection
- Duplicate prevention
- Real-time UI updates across multiple components

⚠️ **Areas for Improvement**:
- Remove legacy event emissions
- Implement room-based targeting for scalability
- Add authentication to Socket.IO connections
- Improve monitoring and observability
- Consider event persistence for offline resilience

**Next Steps**:
1. Prioritize legacy event cleanup
2. Implement room-based filtering (high priority for production)
3. Add Socket.IO authentication (high priority for security)
4. Set up monitoring dashboard
5. Document event addition process for developers

---

## Appendix

### Quick Reference: Event Emitters

```typescript
// Booking events
emitBookingCreated({ booking, clubId, courtId });
emitBookingUpdated({ booking, clubId, courtId, previousStatus });
emitBookingDeleted({ bookingId, clubId, courtId });

// Slot events
emitSlotLocked({ slotId, courtId, clubId, userId, startTime, endTime });
emitSlotUnlocked({ slotId, courtId, clubId });
emitLockExpired({ slotId, courtId, clubId });

// Payment events
emitPaymentConfirmed({ paymentId, bookingId, amount, currency, clubId });
emitPaymentFailed({ paymentId, bookingId, reason, clubId });
```

### Quick Reference: Consuming Events

```typescript
// In a component
import { useSocket } from '@/contexts/SocketContext';

const { socket, isConnected } = useSocket();

useEffect(() => {
  if (!socket) return;
  
  const handleEvent = (data) => {
    console.log('Event received:', data);
  };
  
  socket.on('event_name', handleEvent);
  
  return () => {
    socket.off('event_name', handleEvent);
  };
}, [socket]);
```

### Quick Reference: Updating Stores

```typescript
// Booking store
const updateBookingFromSocket = useBookingStore(state => state.updateBookingFromSocket);
updateBookingFromSocket(booking);

// Notification store
const addNotification = useNotificationStore(state => state.addNotification);
addNotification(notification);
```

---

**End of Document**
