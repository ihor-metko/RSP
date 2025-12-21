# WebSocket & Notification Flow Audit

**Date:** 2025-12-21  
**Scope:** Analysis of current WebSocket-based notifications from event reception to UI rendering  
**Goal:** Document why socket events appear as toasts but do not populate header notification dropdown or notifications page

---

## Executive Summary

**Current Status:**
- ✅ WebSocket (Socket.IO) is properly initialized and connected
- ✅ Socket events trigger toast notifications successfully
- ✅ Notification store exists and is properly implemented
- ✅ Header bell component exists and connects to notification store
- ✅ Notifications page exists and connects to notification store
- ⚠️ **Critical Gap:** Socket events for booking activities show as toasts but do NOT update the notification store
- ✅ Admin notification events (training requests) work end-to-end correctly

**Root Cause:**
The `GlobalSocketListener` handles two types of notifications differently:
1. **Booking events** (created/updated/cancelled) → Only trigger toasts via `globalNotificationManager`
2. **Admin notification events** (training requests) → Update notification store via `addNotification()`

The booking-related toast notifications are ephemeral and never persist to the store, so they never appear in the header bell dropdown or notifications page.

---

## 1. WebSocket Flow

### 1.1 Socket.IO Client Initialization

**Location:** `/src/contexts/SocketContext.tsx`

**Initialization Steps:**
1. `SocketProvider` component wraps the entire app (in root layout)
2. Socket.IO client is initialized on mount with path `/socket.io`
3. Single global socket instance is stored in a ref
4. Connection state is tracked via `isConnected` state
5. Connection events are logged (connect, disconnect, reconnect)

**Code:**
```typescript
const socket: TypedSocket = io({
  path: '/socket.io',
});
```

**Lifecycle:**
- Initialized once per app session
- Singleton pattern prevents duplicate connections
- Auto-reconnection enabled by default
- Cleanup on component unmount

### 1.2 Server-Side Socket.IO

**Location:** `/server.js`

**Setup:**
1. Custom Next.js server with HTTP server
2. Socket.IO server attached to HTTP server
3. Global `io` instance stored for API routes to access
4. Basic connection logging only

**Code:**
```javascript
const io = new Server(httpServer, {
  cors: {
    origin: dev ? 'http://localhost:3000' : process.env.NEXT_PUBLIC_APP_URL || false,
    methods: ['GET', 'POST'],
  },
});
global.io = io;
```

### 1.3 Socket Event Listeners

**Location:** `/src/components/GlobalSocketListener.tsx`

**Registered in:** Root layout (`/src/app/layout.tsx`)

**Events Monitored:**

| Event Name | Type | Handler |
|------------|------|---------|
| `booking_created` | Booking | Shows toast + updates booking store |
| `booking_updated` | Booking | Shows toast + updates booking store |
| `booking_cancelled` | Booking | Shows toast + removes from booking store |
| `bookingCreated` | Legacy | Same as booking_created |
| `bookingUpdated` | Legacy | Same as booking_updated |
| `bookingDeleted` | Legacy | Same as booking_cancelled |
| `admin_notification` | Admin | Updates notification store |
| `slot_locked` | Slot | Shows toast only |
| `slot_unlocked` | Slot | Shows toast only |
| `lock_expired` | Slot | Shows toast only |
| `payment_confirmed` | Payment | Shows toast only |
| `payment_failed` | Payment | Shows toast only |

**Execution Flow (Booking Event Example):**
```
1. Socket receives 'booking_created' event
2. handleBookingCreated() is called with event data
3. handleSocketEvent() triggers toast notification (globalNotificationManager)
4. updateBookingFromSocket() updates booking store
5. Toast appears on screen
6. Booking list UI re-renders with new booking
```

**Execution Flow (Admin Notification Event):**
```
1. Socket receives 'admin_notification' event
2. handleAdminNotification() is called with event data
3. addNotification() updates notification store
4. Notification store triggers re-render
5. Header bell badge updates
6. Notification appears in dropdown and page
```

---

## 2. Notification Handling

### 2.1 Toast Notifications

**Location:** `/src/utils/globalNotificationManager.ts`

**Trigger:** Socket events call `handleSocketEvent(eventType, data)`

**Process:**
1. Generate unique event ID from event type and data
2. Check for duplicates within 5-second window
3. Map event type to toast type (info/success/error/warning)
4. Generate user-friendly message
5. Call `showToast()` from `/src/lib/toast.ts`
6. Toast appears in top-right corner for 6 seconds

**Event to Toast Mapping:**
```typescript
const EVENT_TO_TOAST_TYPE: Record<SocketEventType, ToastType> = {
  booking_created: 'info',
  booking_updated: 'info',
  booking_cancelled: 'info',
  slot_locked: 'info',
  slot_unlocked: 'info',
  lock_expired: 'info',
  payment_confirmed: 'success',
  payment_failed: 'error',
};
```

**Storage:** Toasts are ephemeral - they are NOT stored anywhere after display

**Duplicate Prevention:** Event IDs are stored in a Set for 5 seconds, then removed

### 2.2 Notification Store

**Location:** `/src/stores/useNotificationStore.ts`

**Type:** Zustand store (centralized state management)

**State:**
```typescript
{
  notifications: AdminNotification[],
  unreadCount: number,
  loading: boolean,
  error: string | null
}
```

**Actions:**
- `setNotifications()` - Replace entire list (from initial fetch)
- `setUnreadCount()` - Update unread count
- `addNotification()` - Add single notification (from socket or SSE)
- `markAsRead()` - Mark notification as read (local only)
- `markAllAsRead()` - Mark all as read (local only)
- `clearNotifications()` - Clear all notifications

**Duplicate Prevention:** 
```typescript
const exists = state.notifications.some((n) => n.id === notification.id);
if (exists) return state;
```

**Update Mechanism:**
- Initial load: HTTP fetch on app startup
- Real-time: Socket events via `addNotification()`
- API calls: Mark as read operations

---

## 3. Header Bell Component

**Location:** `/src/components/ui/NotificationsDropdown.tsx`

**Rendered In:** Header component at `/src/components/layout/Header.tsx` (line 266-268)

**Condition:** Only shown for authenticated admin users
```typescript
{isAuthenticated && isAdmin && (
  <NotificationsDropdown maxDropdownItems={10} />
)}
```

**Data Source:**
```typescript
const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } 
  = useNotifications({ enabled: true, onNewNotification: handleNewNotification });
```

**Hook:** `useNotifications()` at `/src/hooks/useNotifications.ts`

**Data Flow:**
1. Hook reads from `useNotificationStore` (Zustand)
2. Store is updated by:
   - Initial fetch (NotificationStoreInitializer)
   - Socket events (GlobalSocketListener via `addNotification()`)
3. Component re-renders automatically when store updates
4. Unread count is displayed as badge
5. Dropdown shows up to 10 most recent notifications

**Features:**
- Toast popups for new notifications (via `onNewNotification` callback)
- Click to view notification details in modal
- Mark as read functionality (API call + local store update)
- Mark all as read button
- "View all notifications" link to `/admin/notifications`

**Dependencies:**
- Does NOT poll
- Does NOT fetch directly
- Fully reactive to store changes
- No caching beyond store

---

## 4. Notifications Page

**Location:** `/src/app/(pages)/admin/notifications/page.tsx`

**Component:** `AdminNotificationsPanel` at `/src/components/admin/AdminNotifications.tsx`

**Data Source:**
```typescript
const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } 
  = useNotifications({ enabled: true });
```

**Data Flow:**
1. Same as header bell - reads from `useNotificationStore`
2. Store is updated by:
   - Initial fetch (NotificationStoreInitializer)
   - Socket events (GlobalSocketListener)
3. Page re-renders automatically when store updates
4. No pagination (shows all notifications in store)

**Features:**
- Filter: All notifications / Unread only
- Mark individual notification as read
- Mark all as read
- Real-time updates via socket

**Dependencies:**
- Does NOT poll
- Does NOT fetch directly
- Fully reactive to store changes
- No manual refresh needed

---

## 5. Initial Data Loading

**Location:** `/src/components/NotificationStoreInitializer.tsx`

**Registered In:** Root layout (`/src/app/layout.tsx`)

**Purpose:** Fetch initial notifications once on app startup

**Execution:**
1. Wait for user store to hydrate
2. Check if user is admin (isRoot)
3. Perform single HTTP GET to `/api/admin/notifications`
4. Populate store with initial data
5. Never runs again (uses `hasInitialized` ref)

**API Response:**
```typescript
{
  notifications: AdminNotification[],
  totalCount: number,
  unreadCount: number,
  hasMore: boolean
}
```

**Error Handling:**
- 401/403: Access denied message
- Other errors: Generic error message
- Errors stored in notification store state

---

## 6. Gaps & Issues

### 6.1 Critical Gap: Booking Event Notifications Don't Persist

**Problem:**
- Booking events (`booking_created`, `booking_updated`, `booking_cancelled`) trigger toast notifications
- These toasts are ephemeral and disappear after 6 seconds
- The events do NOT call `addNotification()` to persist to the store
- Therefore, they never appear in header bell dropdown or notifications page

**Evidence:**
In `GlobalSocketListener.tsx`:
```typescript
// Booking events - handle both notifications and store updates
const handleBookingCreated = (data: BookingCreatedEvent) => {
  handleSocketEvent('booking_created', data);  // ← Shows toast only
  updateBookingFromSocket(data.booking);       // ← Updates booking store, not notification store
};
```

**Expected Behavior:**
Booking events should:
1. Show toast (current ✅)
2. Update booking store (current ✅)
3. Add to notification store (missing ❌)
4. Appear in bell dropdown (missing ❌)
5. Appear in notifications page (missing ❌)

### 6.2 Admin Notifications Work Correctly

**Contrast:**
Admin notification events (`admin_notification`) work end-to-end:

```typescript
const handleAdminNotification = (data: AdminNotificationEvent) => {
  console.log('[GlobalSocketListener] Admin notification received:', data);
  addNotification(data);  // ← Correctly updates notification store
};
```

**Flow:**
1. Server emits `admin_notification` event (via `/src/lib/adminNotifications.ts`)
2. GlobalSocketListener receives event
3. Calls `addNotification()` to update store
4. Header bell shows notification
5. Notifications page shows notification
6. Toast also appears via `onNewNotification` callback in components

### 6.3 No Connection Between Toast System and Notification Store

**Issue:**
- `globalNotificationManager` is separate from notification store
- Toast system is designed for ephemeral messages
- Notification store is designed for persistent admin notifications
- No bridge between the two systems

**Current Architecture:**
```
Socket Event → globalNotificationManager → Toast → Disappears
Socket Event → Notification Store → UI Components → Persists
```

**Missing Connection:**
Booking events only follow the first path, not the second.

### 6.4 Type Mismatch Between Toast Events and Admin Notifications

**Toast Events:**
```typescript
type SocketEventType =
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'slot_locked'
  | 'slot_unlocked'
  | 'lock_expired'
  | 'payment_confirmed'
  | 'payment_failed';
```

**Admin Notifications:**
```typescript
type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED"
```

**Issue:**
The notification store expects `AdminNotification` objects with a specific structure (training request related). Booking events have a completely different structure (`BookingCreatedEvent`, etc.).

**Impact:**
Cannot directly add booking events to notification store without transformation or schema changes.

### 6.5 No Notification History for Non-Admin Events

**Problem:**
- Booking events are user-facing (players, coaches)
- Currently only show as temporary toasts
- No persistent history for users to review past booking events
- Admins have notification history, regular users do not

---

## 7. Current Data Flow Summary

### 7.1 Booking Events (booking_created, booking_updated, booking_cancelled)

```
┌─────────────────────────────────────────────────────────────────┐
│ API Route (creates/updates booking)                             │
│ ↓                                                                │
│ Emits Socket.IO event (booking_created/updated/cancelled)       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ GlobalSocketListener (receives event)                           │
│ ├─→ handleSocketEvent() → globalNotificationManager            │
│ │   └─→ showToast() → Toast appears for 6s → Disappears        │
│ └─→ updateBookingFromSocket() → Booking store updated          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Result:                                                          │
│ ✅ Toast notification shown                                     │
│ ✅ Booking list updated in real-time                            │
│ ❌ NOT in notification store                                    │
│ ❌ NOT in header bell dropdown                                  │
│ ❌ NOT in notifications page                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Admin Notification Events (admin_notification)

```
┌─────────────────────────────────────────────────────────────────┐
│ createAdminNotification() in adminNotifications.ts              │
│ ├─→ Creates DB record (AdminNotification table)                │
│ ├─→ Emits to notificationEmitter (SSE - not analyzed)          │
│ └─→ Emits Socket.IO event (admin_notification)                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ GlobalSocketListener (receives event)                           │
│ └─→ addNotification() → Notification store updated             │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ UI Components (reactive to store changes)                       │
│ ├─→ Header bell dropdown (onNewNotification callback)          │
│ │   └─→ Shows toast + updates dropdown                         │
│ └─→ Notifications page                                          │
│     └─→ Shows in list                                           │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Result:                                                          │
│ ✅ Toast notification shown                                     │
│ ✅ In notification store                                        │
│ ✅ In header bell dropdown                                      │
│ ✅ In notifications page                                        │
│ ✅ Persisted in database                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Header Bell Dropdown Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ App Startup                                                      │
│ └─→ NotificationStoreInitializer                                │
│     └─→ HTTP GET /api/admin/notifications                       │
│         └─→ setNotifications() + setUnreadCount()              │
│             └─→ Notification store populated                    │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Real-time Updates                                                │
│ └─→ Socket.IO event 'admin_notification'                        │
│     └─→ GlobalSocketListener                                    │
│         └─→ addNotification()                                   │
│             └─→ Notification store updated                      │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Header Component (reactive)                                     │
│ └─→ NotificationsDropdown                                       │
│     └─→ useNotifications() hook                                 │
│         └─→ Reads from useNotificationStore (Zustand)          │
│             └─→ Auto re-renders on store changes               │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ User Interaction                                                 │
│ ├─→ Click notification → Opens modal → Calls markAsRead()      │
│ ├─→ Mark all read → Calls markAllAsRead()                      │
│ └─→ View all → Navigate to /admin/notifications                │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Notifications Page Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Page Load                                                        │
│ └─→ AdminNotificationsPanel component                           │
│     └─→ useNotifications() hook                                 │
│         └─→ Reads from useNotificationStore (Zustand)          │
│             └─→ Shows notifications from store                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Real-time Updates (same as header bell)                         │
│ └─→ Socket events update store                                  │
│     └─→ Page re-renders automatically                           │
│         └─→ New notifications appear instantly                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Architecture Summary

### 8.1 Component Hierarchy

```
RootLayout
├─→ SocketProvider (initializes global socket)
├─→ GlobalSocketListener (listens to all socket events)
│   ├─→ Booking events → Toast only
│   └─→ Admin events → Notification store
├─→ NotificationStoreInitializer (one-time HTTP fetch)
└─→ App Content
    ├─→ Header
    │   └─→ NotificationsDropdown (if admin)
    │       └─→ useNotifications()
    │           └─→ useNotificationStore
    └─→ Pages
        └─→ /admin/notifications
            └─→ AdminNotificationsPanel
                └─→ useNotifications()
                    └─→ useNotificationStore
```

### 8.2 Store Dependencies

```
useNotificationStore (Zustand)
├─→ Updated by:
│   ├─→ NotificationStoreInitializer (initial HTTP fetch)
│   └─→ GlobalSocketListener (admin_notification events only)
└─→ Read by:
    ├─→ NotificationsDropdown (header bell)
    └─→ AdminNotificationsPanel (notifications page)
```

### 8.3 Socket Event Flow

```
Server emits event
    ↓
GlobalSocketListener receives
    ↓
    ├─→ Booking events
    │   ├─→ globalNotificationManager (toast)
    │   └─→ Booking store (list update)
    │
    └─→ Admin notification events
        └─→ Notification store (persistent)
            ├─→ Header bell dropdown
            └─→ Notifications page
```

---

## 9. Key Findings

### 9.1 What Works

1. **Socket.IO Infrastructure:**
   - Single global socket connection
   - Proper initialization and cleanup
   - Auto-reconnection enabled
   - No duplicate connections

2. **Admin Notifications:**
   - End-to-end flow works correctly
   - Events are persisted to database
   - Real-time updates via socket
   - Appear in header bell and notifications page
   - Toast notifications also shown

3. **Notification Store:**
   - Well-designed Zustand store
   - Proper duplicate prevention
   - Reactive updates to UI
   - Clean state management

4. **UI Components:**
   - Header bell and notifications page properly connected
   - No polling (fully socket-based, polling removed December 2024)
   - Good UX with toasts and persistent list

### 9.2 What Doesn't Work

1. **Booking Event Notifications:**
   - Only show as temporary toasts
   - Do not persist to notification store
   - Do not appear in header bell dropdown
   - Do not appear in notifications page
   - User has no history of booking events

2. **Architectural Mismatch:**
   - Toast system and notification store are separate
   - Booking events incompatible with AdminNotification schema
   - No transformation layer to convert booking events to notifications

3. **User Experience Gap:**
   - Admins can review notification history
   - Regular users cannot review booking event history
   - All booking-related information is ephemeral

### 9.3 Why Toasts Work But Not Persistent Notifications

**Toasts Work Because:**
- `globalNotificationManager.handleSocketEvent()` is called for booking events
- This triggers `showToast()` which creates ephemeral DOM elements
- No persistence required

**Persistent Notifications Don't Work Because:**
- `addNotification()` is NOT called for booking events
- Only called for `admin_notification` events
- Booking events have incompatible data structure
- No code path exists to transform and persist booking events

---

## 10. Technical Details

### 10.1 Socket Event Types

**Defined in:** `/src/types/socket.ts`

**Server to Client Events:**
```typescript
interface ServerToClientEvents {
  booking_created: (data: BookingCreatedEvent) => void;
  booking_updated: (data: BookingUpdatedEvent) => void;
  booking_cancelled: (data: BookingDeletedEvent) => void;
  slot_locked: (data: SlotLockedEvent) => void;
  slot_unlocked: (data: SlotUnlockedEvent) => void;
  lock_expired: (data: LockExpiredEvent) => void;
  payment_confirmed: (data: PaymentConfirmedEvent) => void;
  payment_failed: (data: PaymentFailedEvent) => void;
  admin_notification: (data: AdminNotificationEvent) => void;
}
```

Note: Legacy event names (bookingCreated, bookingUpdated, bookingDeleted) have been removed as of December 2024.

### 10.2 AdminNotification Schema

**Defined in:** `/src/types/socket.ts` (interface) and Prisma schema

```typescript
interface AdminNotificationEvent {
  id: string;
  type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED";
  playerId: string;
  playerName?: string;
  playerEmail?: string | null;
  coachId: string;
  coachName?: string;
  trainingRequestId: string | null;
  bookingId: string | null;
  sessionDate: string | null;
  sessionTime: string | null;
  courtInfo: string | null;
  summary?: string;
  read: boolean;
  createdAt: string;
}
```

### 10.3 BookingEvent Schema

**Example:** `BookingCreatedEvent`

```typescript
interface BookingCreatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
}
```

**Key Difference:**
- Booking events contain full booking objects
- Admin notifications contain training request metadata
- No overlap in structure or purpose
- Would require significant transformation to merge

---

## 11. Conclusion

### Current State
The WebSocket infrastructure is properly implemented with:
- Reliable Socket.IO connection
- Global event listener
- Centralized notification store
- Reactive UI components

### The Problem
Two separate notification systems exist:
1. **Ephemeral toast system** (for booking events) - works but doesn't persist
2. **Persistent notification system** (for admin events) - works end-to-end

Booking events only use the toast system, never updating the persistent notification store.

### Why This Happens
- `GlobalSocketListener` handles different event types differently
- Booking events call `handleSocketEvent()` (toast only)
- Admin events call `addNotification()` (persistent)
- This is by design, not a bug

### Impact
- Users see booking activity as toasts
- Toasts disappear after 6 seconds
- No persistent record in header bell or notifications page
- Admin notifications work as expected
- Architectural gap between toast notifications and persistent notifications

---

## File Reference

**Key Files Analyzed:**

1. `/src/contexts/SocketContext.tsx` - Socket initialization
2. `/src/components/GlobalSocketListener.tsx` - Event listener
3. `/src/utils/globalNotificationManager.ts` - Toast system
4. `/src/stores/useNotificationStore.ts` - Notification store
5. `/src/hooks/useNotifications.ts` - Notification hook
6. `/src/components/NotificationStoreInitializer.tsx` - Initial data load
7. `/src/components/ui/NotificationsDropdown.tsx` - Header bell
8. `/src/components/admin/AdminNotifications.tsx` - Notifications page
9. `/src/lib/adminNotifications.ts` - Admin notification creator
10. `/src/types/socket.ts` - Type definitions
11. `/server.js` - Socket.IO server
12. `/src/app/layout.tsx` - Root layout with providers

**Total Files Reviewed:** 12  
**Lines of Code Analyzed:** ~2,500
