# Notification System Architecture

## Overview

The notification system is built on a centralized Zustand store that serves as the single source of truth for all notification-related UI components. Notifications are updated in real-time via Socket.IO events.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Server Side                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  createAdminNotification()                                   │
│         │                                                     │
│         ├─► Saves to Database (Prisma)                      │
│         ├─► Emits SSE event (notificationEmitter)           │
│         └─► Emits Socket.IO event (admin_notification)      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Client Side                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GlobalSocketListener                                        │
│         │                                                     │
│         ├─► Listens for 'admin_notification' event          │
│         └─► Calls useNotificationStore.addNotification()    │
│                                                               │
│  useNotificationStore (Zustand)                              │
│         │                                                     │
│         ├─► Stores notifications array                      │
│         ├─► Stores unread count                             │
│         ├─► Prevents duplicates                             │
│         └─► Provides actions (add, markAsRead, etc.)        │
│                                                               │
│  useNotifications Hook                                       │
│         │                                                     │
│         ├─► Reads from store                                │
│         ├─► Initial HTTP fetch (on mount)                   │
│         ├─► API calls for mark-as-read                      │
│         └─► Triggers callbacks for new notifications        │
│                                                               │
│  UI Components                                               │
│         │                                                     │
│         ├─► NotificationBell (header)                        │
│         ├─► AdminNotificationsPanel (page)                  │
│         └─► Toast notifications (via callback)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### Server Side

#### `createAdminNotification()`
Located in `src/lib/adminNotifications.ts`

- Creates notification in database
- Emits SSE event (legacy, for backward compatibility)
- **Emits Socket.IO event** (`admin_notification`)

### Client Side

#### `useNotificationStore`
Located in `src/stores/useNotificationStore.ts`

**State:**
- `notifications: AdminNotification[]` - All notifications
- `unreadCount: number` - Number of unread notifications
- `loading: boolean` - Loading state
- `error: string | null` - Error message

**Actions:**
- `addNotification()` - Add notification (called by Socket.IO listener)
- `markAsRead()` - Mark as read (local update)
- `markAllAsRead()` - Mark all as read (local update)
- `setNotifications()` - Set entire list (from HTTP fetch)

#### `GlobalSocketListener`
Located in `src/components/GlobalSocketListener.tsx`

- Listens for `admin_notification` Socket.IO events
- Calls `useNotificationStore.addNotification()` when event received
- Automatically syncs all UI components

#### `useNotifications` Hook
Located in `src/hooks/useNotifications.ts`

- Wrapper around the notification store
- Performs initial HTTP fetch on mount
- Provides API methods for mark-as-read operations
- Triggers `onNewNotification` callback when new notifications arrive
- **No polling** - relies on Socket.IO for real-time updates

#### UI Components

**NotificationBell**
- Shows unread count badge
- Dropdown with recent notifications
- Uses `useNotifications` hook
- Shows toasts for new notifications

**AdminNotificationsPanel**
- Full notifications page
- Filter by read/unread
- Mark as read actions
- Uses `useNotifications` hook

## Data Flow

### New Notification Flow

1. Server creates notification via `createAdminNotification()`
2. Server emits `admin_notification` Socket.IO event
3. `GlobalSocketListener` receives event
4. Calls `useNotificationStore.addNotification()`
5. Store updates `notifications` and `unreadCount`
6. All subscribed components re-render automatically
7. `useNotifications` hook detects new notification
8. Triggers `onNewNotification` callback (for toasts)

### Mark as Read Flow

1. User clicks "Mark as Read" button
2. Component calls `useNotifications.markAsRead(id)`
3. Hook makes API call to `/api/admin/notifications/{id}`
4. On success, calls `useNotificationStore.markAsRead(id)`
5. Store updates notification's `read` property
6. Store decrements `unreadCount`
7. All subscribed components re-render automatically

### Initial Load Flow

1. Component mounts with `useNotifications` hook
2. Hook calls `/api/admin/notifications` (HTTP)
3. Response contains notifications and unread count
4. Hook calls `useNotificationStore.setNotifications()`
5. Hook calls `useNotificationStore.setUnreadCount()`
6. All subscribed components render with initial data
7. Socket.IO handles all subsequent updates

## Key Features

### ✅ Single Source of Truth
- All notification data lives in `useNotificationStore`
- No component maintains its own notification state
- Eliminates sync issues between components

### ✅ Real-Time Updates
- Socket.IO provides instant updates
- No polling required
- Lower server load
- Better UX

### ✅ Duplicate Prevention
- Store automatically checks for duplicate IDs
- Prevents duplicate toasts
- Prevents duplicate list items

### ✅ Automatic Unread Count
- Count calculated automatically when notifications added/marked
- Always accurate across all components
- No manual counting required

### ✅ No Polling
- Legacy polling completely removed
- `useAdminNotifications` hook deprecated
- Socket.IO handles all real-time updates

## Migration from Old System

### Before (Polling + SSE)
```typescript
// Old hook with polling and SSE
const { notifications, unreadCount } = useAdminNotifications({
  pollInterval: 30000, // Poll every 30 seconds
});
```

### After (Socket.IO + Store)
```typescript
// New hook with Socket.IO and centralized store
const { notifications, unreadCount } = useNotifications();
// No polling needed - Socket.IO handles updates
```

## Testing

To test the notification system:

1. **Create a notification** (server-side):
   ```typescript
   import { createAdminNotification } from '@/lib/adminNotifications';
   
   await createAdminNotification({
     type: 'REQUESTED',
     playerId: 'user-123',
     coachId: 'coach-456',
     sessionDate: new Date(),
     sessionTime: '10:00',
   });
   ```

2. **Verify:**
   - Socket.IO event is emitted
   - Bell icon shows updated unread count
   - Notification appears in bell dropdown
   - Notification appears on notifications page
   - Toast notification appears
   - No duplicates

3. **Mark as read:**
   - Click "Mark as Read"
   - Unread count decrements in all components
   - Notification appears as read everywhere

## Backward Compatibility

- SSE endpoint (`/api/admin/notifications/stream`) still works but is not used
- `useAdminNotifications` hook still works but is deprecated
- Old polling interval parameters are ignored
- Migration is backward compatible

## Future Improvements

- [ ] Add notification categories/filtering
- [ ] Add notification preferences
- [ ] Add push notifications (browser API)
- [ ] Add notification archiving
- [ ] Add notification search
