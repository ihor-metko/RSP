# WebSocket Real-time Booking Updates - Testing Guide

This document provides guidance on testing WebSocket-based real-time booking updates using the unified socket architecture, both automated and manual.

## Overview

The ArenaOne platform uses WebSocket (Socket.IO) with a unified architecture to provide real-time updates for bookings across all connected clients. The `GlobalSocketListener` component automatically handles all socket events and updates the Zustand booking store, which triggers UI updates across all components.

## Architecture

- **SocketProvider**: Single global socket connection
- **GlobalSocketListener**: Centralized event dispatcher
- **useBookingStore**: Zustand store automatically updated by socket events
- **Components**: Read from store and automatically re-render

## Automated Tests

### Location
- **Primary test files**:
  - `src/__tests__/GlobalSocketListener.test.tsx` - Integration tests for the centralized listener (12 tests)
  - `src/__tests__/realtime-booking-updates.test.tsx` - Client-side integration tests (14 tests)
- **Supporting tests**: 
  - `src/__tests__/socketEmitters.test.ts` - Server-side event emitters (8 tests)
  - `src/__tests__/socketUpdateManager.test.ts` - Event debouncing and deduplication (14 tests)
  - `src/__tests__/useBookingStore-slotLocks.test.ts` - Slot lock management (12 tests)
  - `src/__tests__/globalNotificationManager.test.ts` - Toast notifications

**Total Tests**: 60+ automated tests for WebSocket functionality

### Running Automated Tests

```bash
# Run all WebSocket tests together
npm test -- GlobalSocketListener socketEmitters socketUpdateManager useBookingStore-slotLocks realtime-booking-updates

# Run specific test suites
npm test -- GlobalSocketListener
npm test -- realtime-booking-updates
npm test -- socketEmitters
npm test -- socketUpdateManager

# Run with coverage
npm test -- --coverage --collectCoverageFrom="src/components/GlobalSocketListener.tsx"

# Run with verbose output
npm test -- GlobalSocketListener --verbose
```

### Test Coverage

The automated test suite covers:

1. **Event Listener Registration** (GlobalSocketListener.test.tsx)
   - All event types properly registered
   - Proper cleanup on unmount
   - Connection state tracking

2. **Booking Events** (GlobalSocketListener.test.tsx)
   - Booking created: Store updated, toast notification, notification store persistence
   - Booking updated: Store updated with newer data, toast notification shown
   - Booking cancelled: Removed from store, toast notification shown
   - Unified notification system integration

3. **Payment and Slot Events** (GlobalSocketListener.test.tsx)
   - Payment confirmed/failed events handled
   - Slot locked/unlocked events processed
   - Lock expired notifications

4. **Multi-Client Updates** (realtime-booking-updates.test.tsx) ✨ NEW
   - Booking creation reflects in all clients simultaneously
   - Booking cancellation reflects in all clients
   - Real-time slot availability updates

5. **Rapid Events Deduplication** (realtime-booking-updates.test.tsx) ✨ NEW
   - Handles rapid consecutive updates without duplicates
   - Ignores outdated updates when newer data exists
   - Prevents duplicate bookings from multiple create events
   - Timestamp-based conflict resolution

6. **Slot Lock Synchronization** (realtime-booking-updates.test.tsx) ✨ NEW
   - Temporary slot locks reflect across all clients
   - Slot unlocks reflect immediately
   - Multiple slot locks handled without conflicts

7. **Socket Reconnection Behavior** (realtime-booking-updates.test.tsx) ✨ NEW
   - Maintains listener registration after reconnection
   - Handles events correctly after reconnection
   - No data loss during reconnection

8. **Listener Cleanup** (realtime-booking-updates.test.tsx) ✨ NEW
   - Complete cleanup on component unmount
   - Cleanup on route change (unmount/remount cycle)
   - No event processing after unmount

9. **Complex Scenarios** (realtime-booking-updates.test.tsx) ✨ NEW
   - Mixed rapid events (create, update, delete)
   - Concurrent operations across multiple clients
   - State consistency across rapid changes

10. **Slot Lock Management** (useBookingStore-slotLocks.test.ts)
    - Add/remove locked slots
    - Check slot lock status
    - Cleanup expired locks (5-minute expiration)
    - Prevent duplicate locks

11. **Update Manager** (socketUpdateManager.test.ts)
    - Debouncing rapid consecutive calls
    - Throttling event processing
    - Timestamp-based conflict detection
    - Merge booking lists with conflict resolution

## Manual Testing

### Setup for Manual Testing

1. **Start the development server with WebSocket support**:
   ```bash
   npm run dev
   ```
   This starts Next.js with the custom server (`server.js`) that includes Socket.IO.

2. **Open multiple browser tabs/windows**:
   - Open 3-4 browser tabs or windows
   - Navigate to a page that displays bookings (e.g., admin operations page)
   - Ensure all tabs are viewing the same club's bookings

### Manual Test Scenarios

#### Scenario 1: Verify Multi-Client Updates

**Objective**: Confirm that all connected clients see booking updates in real-time.

**Steps**:
1. Open 3 browser tabs to the same club operations page
2. In tab 1, create a new booking
3. **Verify**: All 3 tabs show the new booking within 1-2 seconds
4. In tab 2, update the booking (e.g., change status to "Cancelled")
5. **Verify**: All 3 tabs reflect the updated status
6. In tab 3, delete the booking
7. **Verify**: All 3 tabs no longer show the deleted booking

**Expected Results**:
- ✅ New bookings appear in all tabs automatically
- ✅ Updates are reflected across all tabs
- ✅ Deletions remove the booking from all tabs
- ✅ No page refresh required
- ✅ UI updates smoothly without flickering

#### Scenario 2: Test Reconnection

**Objective**: Verify that clients can reconnect and resync data after network issues.

**Steps**:
1. Open browser tab to club operations page
2. Open browser DevTools → Network tab
3. Toggle "Offline" mode to simulate network loss
4. **Verify**: WebSocket status indicator shows "Disconnected" or "Offline"
5. Toggle "Online" mode to restore network
6. **Verify**: WebSocket reconnects automatically
7. Create a booking in another tab
8. **Verify**: The reconnected tab receives the update

**Expected Results**:
- ✅ Client detects disconnection
- ✅ Client automatically reconnects when network is restored
- ✅ After reconnection, client receives all missed updates
- ✅ No errors in browser console

#### Scenario 3: Test Rapid Updates

**Objective**: Verify that rapid consecutive updates don't cause UI flickering or performance issues.

**Steps**:
1. Open browser tab to club operations page
2. Using an API client (Postman/curl) or another browser tab, rapidly create/update 10 bookings within 5 seconds
3. **Observe** the UI in the first tab

**Expected Results**:
- ✅ UI remains smooth and responsive
- ✅ No visible flickering or jumping
- ✅ All final booking states are correctly displayed
- ✅ No duplicate bookings appear
- ✅ Browser remains responsive (no freezing)

#### Scenario 4: Test Timestamp Conflict Resolution

**Objective**: Verify that outdated updates are ignored in favor of newer data.

**Steps**:
1. Open browser tab to club operations page with a booking visible
2. Note the current status of a booking
3. Using browser DevTools Console, manually trigger an update with an older timestamp:
   ```javascript
   // Assuming the booking's current updatedAt is "2024-01-15T12:00:00Z"
   // Try to apply an update with an older timestamp
   const socket = window.io(); // Access socket from window if exposed
   socket.emit('bookingUpdated', {
     booking: {
       id: 'booking-id',
       // ... other fields
       bookingStatus: 'Cancelled',
       updatedAt: '2024-01-15T11:00:00Z' // Older than current
     },
     clubId: 'club-id',
     courtId: 'court-id',
     previousStatus: 'Active'
   });
   ```
4. **Verify**: The booking status does NOT change (older update is ignored)

**Expected Results**:
- ✅ Older updates are ignored
- ✅ Current state is preserved
- ✅ Console shows conflict detection message (in development mode)

### Manual Testing Checklist

Use this checklist when performing manual testing:

- [ ] Multiple tabs receive updates simultaneously
- [ ] Create booking event updates all clients
- [ ] Update booking event updates all clients
- [ ] Delete booking event updates all clients
- [ ] Connection status indicator shows correct state
- [ ] Reconnection works after network interruption
- [ ] Rapid updates don't cause flickering
- [ ] No duplicate bookings appear
- [ ] Timestamp-based conflict resolution works
- [ ] No errors in browser console
- [ ] Page remains responsive under load
- [ ] Toast notifications appear for updates (if enabled)

## Debugging WebSocket Issues

### Enable WebSocket Logging

WebSocket events are logged to the browser console in development mode:

```javascript
// In browser console, you'll see:
// "Socket.IO connected: <socket-id>"
// "Socket.IO disconnected"
// "Socket.IO reconnected after N attempts"
// "[Socket Update Conflict]" - when outdated update is ignored
```

### Common Issues and Solutions

1. **Events not received**
   - Check that Socket.IO server is running (`npm run dev`)
   - Verify WebSocket connection in Network tab (look for `socket.io` requests)
   - Check browser console for connection errors
   - Ensure `GlobalSocketListener` is rendered in root layout

2. **UI not updating**
   - Verify `GlobalSocketListener` is active (check console logs)
   - Check that booking store methods work: `updateBookingFromSocket`, `removeBookingFromSocket`
   - Inspect Zustand store state in React DevTools
   - Ensure components are reading from the store

3. **Duplicate bookings**
   - Check that `updateBookingFromSocket` uses proper deduplication
   - Verify booking IDs are unique
   - Check for multiple `GlobalSocketListener` instances (should only be one)

4. **Performance issues**
   - Event debouncing is handled by `socketUpdateManager`
   - Check that `GlobalSocketListener` is only rendered once
   - Monitor memory usage in browser DevTools

## Example Usage in Components

### Basic Integration (Recommended)

Components simply read from the store - updates happen automatically:

```tsx
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

function BookingsList({ clubId, date }: { clubId: string; date: string }) {
  // Optional: Get connection status for UI indicator
  const { isConnected } = useSocket();
  
  // Read bookings from store
  const bookings = useBookingStore(state => state.bookings);
  const fetchBookings = useBookingStore(state => state.fetchBookingsForDay);

  // Initial fetch
  useEffect(() => {
    fetchBookings(clubId, date);
  }, [clubId, date, fetchBookings]);

  // That's it! Bookings automatically update via GlobalSocketListener

  return (
    <div>
      {isConnected && <div>🟢 Live updates enabled</div>}
      {bookings.map(booking => (
        <div key={booking.id}>{booking.courtName} - {booking.userName}</div>
      ))}
    </div>
  );
}
```

### Testing WebSocket in Storybook

If you use Storybook, mock the SocketContext:

```tsx
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { BookingsList } from './BookingsList';

export default {
  title: 'Components/BookingsList',
  component: BookingsList,
} as ComponentMeta<typeof BookingsList>;

const Template: ComponentStory<typeof BookingsList> = (args) => (
  <BookingsList {...args} />
);

export const WithRealtimeUpdates = Template.bind({});
WithRealtimeUpdates.args = {
  clubId: 'club-1',
};
```

## Performance Benchmarks

Expected performance metrics:

- **Event latency**: < 100ms from server emit to client receive
- **UI update latency**: < 300ms from event receive to UI render (includes debounce)
- **Memory per connection**: < 1MB
- **Max concurrent clients tested**: 100+ clients
- **Events per second**: Can handle 50+ events/second with debouncing

## Continuous Integration

WebSocket tests are included in the CI pipeline:

```bash
# In CI, tests run with:
npm test -- --ci --maxWorkers=2
```

All WebSocket tests must pass before merging to main branch.

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [React Testing Library](https://testing-library.com/react)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- Project-specific socket components:
  - SocketProvider: `src/contexts/SocketContext.tsx`
  - GlobalSocketListener: `src/components/GlobalSocketListener.tsx`
  - Socket event types: `src/types/socket.ts`
