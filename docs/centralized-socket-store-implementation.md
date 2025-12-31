# Centralized Socket Store Implementation

## Overview

This document describes the implementation of a centralized Zustand store (`useSocketStore`) to manage all WebSocket connections in the ArenaOne application. This replaces the previous pattern where multiple components could create duplicate socket connections and event subscriptions.

## Problem Statement

The application had two different WebSocket connections:
- **Subscription A** (NotificationSocket): Initialized for general components
- **Subscription B** (BookingSocket): Initialized when visiting the operational page

The issues were:
1. **Duplicate subscriptions**: Multiple components subscribed individually to socket events
2. **Duplicate API calls**: Especially problematic in development mode (React StrictMode)
3. **No centralized state**: Socket state was scattered across context providers
4. **Triple listening**: `GlobalSocketListener`, `BookingSocketListener`, and `useCourtAvailability` all listened to the same events

## Solution

### Core Implementation

Created `src/stores/useSocketStore.ts` - a centralized Zustand store that:
- Manages both NotificationSocket and BookingSocket instances
- Handles socket token retrieval with caching and deduplication
- Provides reactive state for components
- Handles reconnections automatically
- Is shared across all components, avoiding duplicate socket connections
- Ensures development mode (React StrictMode) doesn't cause duplicate subscriptions

### Architecture

```typescript
useSocketStore (Zustand)
    ├── NotificationSocket (always active when authenticated)
    │   ├── Connection state
    │   ├── Token management
    │   └── Event listeners (via GlobalSocketListener)
    │
    └── BookingSocket (active when club selected + admin user)
        ├── Connection state
        ├── Club-specific targeting
        └── Event listeners (via GlobalSocketListener)
```

### Key Features

1. **Single Source of Truth**
   - All socket connections managed in one place
   - No duplicate instances possible
   - Centralized state management

2. **React StrictMode Safety**
   - Handles double-mounting in development mode
   - Prevents duplicate socket creation
   - Proper cleanup on unmount

3. **Token Management**
   - Cached socket tokens
   - Deduplicated API calls
   - Inflight request guards

4. **Type Safety**
   - Full TypeScript support
   - Typed socket events
   - Type-safe state selectors

## Changes Made

### 1. New Store: `useSocketStore`

**Location**: `src/stores/useSocketStore.ts`

**State**:
```typescript
{
  // NotificationSocket
  notificationSocket: Socket | null
  notificationConnected: boolean
  
  // BookingSocket
  bookingSocket: Socket | null
  bookingConnected: boolean
  activeClubId: string | null
  
  // Token management
  socketToken: string | null
  isLoadingToken: boolean
  tokenError: string | null
  tokenPromise: Promise<string | null> | null
}
```

**Actions**:
- `initializeNotificationSocket(token)` - Initialize notification socket
- `disconnectNotificationSocket()` - Disconnect notification socket
- `initializeBookingSocket(token, clubId)` - Initialize booking socket
- `disconnectBookingSocket()` - Disconnect booking socket
- `setActiveClubId(clubId)` - Set active club ID
- `getSocketToken()` - Get socket token (cached, deduplicated)
- `clearSocketToken()` - Clear socket token

### 2. Refactored Context Providers

**SocketContext** (`src/contexts/SocketContext.tsx`):
- Now a thin wrapper around `useSocketStore`
- Maintains backward compatibility
- Store handles all socket lifecycle

**BookingSocketContext** (`src/contexts/BookingSocketContext.tsx`):
- Now a thin wrapper around `useSocketStore`
- Maintains backward compatibility
- Store handles all socket lifecycle

### 3. Refactored Hooks

**useCourtAvailability** (`src/hooks/useCourtAvailability.ts`):
- **Before**: Directly listened to socket events (duplicate subscription)
- **After**: Subscribes to store state (updated by GlobalSocketListener)
- No more duplicate event listeners
- Reactive to store changes

### 4. Event Handling

**GlobalSocketListener** remains the single source of socket event handling:
- Listens to both NotificationSocket and BookingSocket
- Updates appropriate stores (NotificationStore, BookingStore)
- No duplicate listeners

**BookingSocketListener** - Not used anywhere (can be safely removed in cleanup)

### 5. Tests

Added comprehensive test suite (`src/__tests__/useSocketStore.test.ts`):
- ✅ 16 tests, all passing
- Token management (caching, deduplication, error handling)
- Socket lifecycle (initialization, connection, disconnection)
- React StrictMode safety
- Active club ID management

### 6. Documentation

Updated `src/stores/README.md`:
- Documented socket store architecture
- Usage examples
- Migration guide
- Best practices

## Migration Guide

### Before (Multiple Subscriptions)

```typescript
// ❌ Direct socket usage in components
const { socket } = useSocket();

useEffect(() => {
  if (!socket) return;
  
  socket.on('booking_created', handleBooking);
  return () => socket.off('booking_created', handleBooking);
}, [socket]);
```

### After (Centralized Store)

```typescript
// ✅ Use store state (updated by GlobalSocketListener)
const bookings = useBookingStore(state => state.bookings);

// Bookings automatically update via GlobalSocketListener
// No need to listen to socket events directly
```

### Using the Store Directly

```typescript
import { useSocketStore } from '@/stores/useSocketStore';

// Get socket instance (for advanced use cases)
const notificationSocket = useSocketStore(state => state.notificationSocket);
const isConnected = useSocketStore(state => state.notificationConnected);

// Initialize socket (usually done by context providers)
const initSocket = useSocketStore(state => state.initializeNotificationSocket);
```

## Benefits

1. **No Duplicate Subscriptions**
   - Single socket instance per type
   - Prevents duplicate event listeners
   - More efficient resource usage

2. **Development Mode Safe**
   - Handles React StrictMode correctly
   - No duplicate connections on double-mount
   - Proper cleanup

3. **Better Performance**
   - Cached token fetching
   - Deduplicated API calls
   - Efficient state updates

4. **Improved Developer Experience**
   - Single source of truth
   - Reactive state
   - Type-safe
   - Easy to debug

5. **Maintainability**
   - Centralized logic
   - Clear architecture
   - Well-tested
   - Documented

## Testing

### Test Coverage

- **Socket Token Management** (5 tests)
  - Token fetching
  - Caching
  - Deduplication
  - Error handling
  - Validation

- **NotificationSocket** (4 tests)
  - Initialization
  - Duplicate prevention
  - Connection state
  - Disconnection

- **BookingSocket** (4 tests)
  - Initialization with clubId
  - Duplicate prevention
  - Club switching
  - Disconnection

- **React StrictMode** (1 test)
  - Double initialization safety

- **Active Club ID** (2 tests)
  - Setting club ID
  - Clearing club ID

### Running Tests

```bash
npm test -- useSocketStore
```

All 16 tests passing ✅

## Code Quality

- ✅ **Linting**: Passes
- ✅ **Type checking**: Passes
- ✅ **Code review**: All feedback addressed
- ✅ **Security scan**: 0 vulnerabilities
- ✅ **Tests**: 16/16 passing

## Next Steps

### Recommended

1. **Remove BookingSocketListener**
   - Not used anywhere
   - Duplicate of GlobalSocketListener
   - Safe to delete

2. **Manual Testing**
   - Test operations page with new store
   - Verify notification socket in browser
   - Test booking socket in operations page
   - Verify development mode behavior

3. **Performance Monitoring**
   - Monitor socket connections in production
   - Verify no duplicate connections
   - Check for memory leaks

### Future Enhancements

1. **Reconnection Logic**
   - Exponential backoff
   - Configurable retry attempts
   - Better error messages

2. **Health Monitoring**
   - Connection health status
   - Last activity timestamp
   - Connection quality metrics

3. **Analytics**
   - Track connection events
   - Monitor socket errors
   - Usage statistics

## Files Changed

1. **New Files**:
   - `src/stores/useSocketStore.ts` - Centralized socket store
   - `src/__tests__/useSocketStore.test.ts` - Comprehensive tests

2. **Modified Files**:
   - `src/contexts/SocketContext.tsx` - Now uses store
   - `src/contexts/BookingSocketContext.tsx` - Now uses store
   - `src/hooks/useCourtAvailability.ts` - Uses store state
   - `src/stores/README.md` - Updated documentation

3. **No Changes Required**:
   - `src/components/GlobalSocketListener.tsx` - Still handles events
   - `src/stores/useNotificationStore.ts` - Still updated by listener
   - `src/stores/useBookingStore.ts` - Still updated by listener

## Conclusion

The centralized socket store successfully addresses all requirements:

✅ Single WebSocket instance per type (no duplicates)  
✅ Reactive state for components  
✅ Automatic reconnection handling  
✅ Shared across all components  
✅ Development mode safe (React StrictMode)  
✅ Preserves existing socket behavior  
✅ Type-safe handling  
✅ Comprehensive tests  
✅ Well-documented  

The implementation follows the project's architecture guidelines and maintains backward compatibility while significantly improving the socket management architecture.
