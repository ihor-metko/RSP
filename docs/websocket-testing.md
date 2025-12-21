# WebSocket Integration Testing Documentation

## Overview

This document describes the comprehensive WebSocket testing infrastructure for the ArenaOne application. The tests ensure reliable real-time booking updates across all components using Socket.IO.

## Test Architecture

### Test Files

1. **`useSocketIO.test.ts`** - Core Hook Tests (9 tests)
   - Socket initialization and connection
   - Event handler registration
   - Manual connect/disconnect functionality
   - Cleanup on unmount
   - Event type structures

2. **`websocket-realtime-booking-updates.test.tsx`** - Multi-Client Integration Tests (15 tests)
   - Multiple client connections
   - Booking event broadcasting (created, updated, deleted)
   - Reconnection handling with data sync
   - Rapid consecutive event debouncing
   - No duplication of bookings
   - Timestamp-based conflict resolution
   - UI state consistency

3. **`bookings-overview-socketio.test.tsx`** - Component Tests (5 tests)
   - BookingsOverview component WebSocket integration
   - Real-time updates with toast notifications
   - Conditional socket connection based on `enableRealtime` prop
   - Event filtering and refresh callbacks

4. **`today-bookings-list-socketio.test.tsx`** - Component Tests (6 tests)
   - TodayBookingsList component WebSocket integration
   - Club-specific event filtering
   - Booking store updates
   - Event handling for all booking lifecycle events

5. **`websocket-error-handling.test.tsx`** - Error Handling Tests (13 tests) ⭐ NEW
   - Malformed event data (null, undefined, empty objects)
   - Missing required fields in events
   - Wrong data types in events
   - Unexpected event types
   - State consistency after invalid events
   - Concurrent invalid and valid events
   - Connection error handling

6. **`websocket-reconnection-state-consistency.test.tsx`** - Reconnection Tests (10 tests) ⭐ NEW
   - Basic reconnection flow
   - State preservation after reconnection
   - Data synchronization after missed updates
   - Multiple reconnection attempts
   - Concurrent events during reconnection
   - Event order preservation
   - Rapid connect/disconnect cycles
   - Recovery from reconnect callback errors

### Total Coverage

- **Total WebSocket Tests**: 58 tests (as of Dec 2024 - update when adding/removing tests)
- **Test Coverage**: All components with WebSocket subscriptions
- **Event Types Tested**: bookingCreated, bookingUpdated, bookingDeleted
- **Edge Cases Covered**: 25+ edge cases and error scenarios

## Testing Strategy

### Mock Implementation

The tests use a custom Socket.IO mock instead of `socket.io-mock` library for better control:

```typescript
// Mock socket instance
let mockSocket: any;

jest.mock("socket.io-client", () => {
  return {
    io: jest.fn(() => {
      mockSocket = {
        id: "mock-socket-id",
        connected: false,
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connect: jest.fn(function () {
          this.connected = true;
        }),
        disconnect: jest.fn(function () {
          this.connected = false;
        }),
        io: {
          on: jest.fn(),
          off: jest.fn(),
        },
      };
      return mockSocket;
    }),
  };
});
```

### Event Simulation

Tests simulate server-side event emissions:

```typescript
function emitSocketEvent(eventName: string, data: any) {
  const handler = mockSocket.on.mock.calls.find(
    (call: any) => call[0] === eventName
  )?.[1];
  if (handler) {
    handler(data);
  }
}
```

### Debouncing Awareness

Tests account for the 300ms debounce on WebSocket events. The test files define a constant for consistent wait times:

```typescript
// Test constants
const DEBOUNCE_WAIT_TIME = 350; // Wait time for 300ms debounce + buffer

// In tests
act(() => {
  emitSocketEvent("bookingCreated", event);
});

// Wait for debounce
await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_TIME));

// Verify results
await waitFor(() => {
  expect(callback).toHaveBeenCalled();
});
```

## Key Test Scenarios

### 1. Component State Updates

Tests verify that components correctly update their state when receiving events:

```typescript
it("should update booking store when booking is created", async () => {
  const booking = createMockBooking("booking-new");
  
  useBookingStore.setState({
    bookings: [createMockBooking("booking-1")],
  });

  const callback = jest.fn((data: BookingCreatedEvent) => {
    useBookingStore.getState().updateBookingFromSocket(data.booking);
  });

  // ... emit event ...

  await waitFor(() => {
    const bookings = useBookingStore.getState().bookings;
    expect(bookings.length).toBe(2);
    expect(bookings.find((b) => b.id === "booking-new")).toBeTruthy();
  });
});
```

### 2. Reconnection with State Sync

Tests verify reconnection triggers data synchronization:

```typescript
it("should sync missed updates after reconnection via onReconnect callback", async () => {
  const onReconnect = jest.fn(() => {
    // Simulate fetching missed updates
    const newBooking = createMockBooking("booking-2");
    useBookingStore.getState().updateBookingFromSocket(newBooking);
  });

  // ... setup and reconnect ...

  await waitFor(() => {
    expect(onReconnect).toHaveBeenCalled();
  });

  const bookings = useBookingStore.getState().bookings;
  expect(bookings.length).toBe(2); // Initial + synced
});
```

### 3. Invalid Message Handling

Tests ensure the UI doesn't break with malformed data:

```typescript
it("should not crash when receiving null data", async () => {
  const onBookingCreated = jest.fn();

  renderHook(() =>
    useSocketIO({
      autoConnect: true,
      onBookingCreated,
      debounceMs: 100,
    })
  );

  expect(() => {
    act(() => {
      emitSocketEvent("bookingCreated", null);
    });
  }).not.toThrow();
});
```

### 4. Multi-Client Scenarios

Tests verify events are broadcast to all connected clients:

```typescript
it("should notify all connected clients when a booking is created", async () => {
  const callback1 = jest.fn();
  const callback2 = jest.fn();
  const callback3 = jest.fn();

  renderHook(() => useSocketIO({ autoConnect: true, onBookingCreated: callback1 }));
  renderHook(() => useSocketIO({ autoConnect: true, onBookingCreated: callback2 }));
  renderHook(() => useSocketIO({ autoConnect: true, onBookingCreated: callback3 }));

  // ... emit event to all ...

  await waitFor(() => {
    expect(callback1).toHaveBeenCalledWith(event);
    expect(callback2).toHaveBeenCalledWith(event);
    expect(callback3).toHaveBeenCalledWith(event);
  });
});
```

## Event Types and Schemas

### BookingCreatedEvent

```typescript
interface BookingCreatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
}
```

### BookingUpdatedEvent

```typescript
interface BookingUpdatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
  previousStatus?: string;
}
```

### BookingDeletedEvent

```typescript
interface BookingDeletedEvent {
  bookingId: string;
  clubId: string;
  courtId: string;
}
```

## Running Tests

### Run All WebSocket Tests

```bash
npm run test -- --testNamePattern="socket|Socket"
```

### Run Individual Test Suites

```bash
# Core hook tests
npm run test -- src/__tests__/useSocketIO.test.ts

# Integration tests
npm run test -- src/__tests__/websocket-realtime-booking-updates.test.tsx

# Component tests
npm run test -- src/__tests__/bookings-overview-socketio.test.tsx
npm run test -- src/__tests__/today-bookings-list-socketio.test.tsx

# Error handling tests
npm run test -- src/__tests__/websocket-error-handling.test.tsx

# Reconnection tests
npm run test -- src/__tests__/websocket-reconnection-state-consistency.test.tsx
```

### Run with Coverage

```bash
npm run test -- --coverage --collectCoverageFrom="src/hooks/useSocketIO.ts" --collectCoverageFrom="src/components/**/*WebSocket*"
```

## Best Practices

### 1. Isolation

Each test is completely isolated:
- Mock socket is reset before each test
- Booking store is cleared before each test
- No shared state between tests

### 2. Realistic Scenarios

Tests simulate real-world scenarios:
- Network disconnections
- Multiple simultaneous clients
- Rapid event sequences
- Invalid server responses

### 3. Debounce Handling

All tests account for the 300ms debounce:
- Use appropriate wait times (350ms+)
- Don't rely on immediate callback execution

### 4. Cleanup Verification

Tests verify proper cleanup:
- Event listeners are removed
- Sockets are disconnected
- No memory leaks

## Edge Cases Covered

### Connection Issues
- ✅ Connection failures
- ✅ Disconnections
- ✅ Reconnections
- ✅ Multiple reconnection attempts
- ✅ Rapid connect/disconnect cycles

### Data Integrity
- ✅ Null/undefined events
- ✅ Empty objects
- ✅ Missing required fields
- ✅ Wrong data types
- ✅ Unexpected event types

### Concurrency
- ✅ Multiple clients receiving same event
- ✅ Rapid consecutive events
- ✅ Events during reconnection
- ✅ Concurrent valid and invalid events

### State Management
- ✅ No duplicate bookings
- ✅ Timestamp-based conflict resolution
- ✅ State preservation during disconnection
- ✅ Data synchronization after reconnection
- ✅ Event order preservation

## Components with WebSocket Integration

### Tested Components

1. **`BookingsOverview`** (`src/components/admin/BookingsOverview.tsx`)
   - Displays booking statistics
   - Refreshes on booking events
   - Shows toast notifications
   - Controlled by `enableRealtime` prop

2. **`TodayBookingsList`** (`src/components/club-operations/TodayBookingsList.tsx`)
   - Displays bookings for selected day
   - Filters events by clubId
   - Updates booking store
   - Triggers refresh callback

3. **`useSocketIO`** (`src/hooks/useSocketIO.ts`)
   - Core WebSocket hook
   - Handles connection lifecycle
   - Provides event callbacks
   - Implements debouncing

### Example Component

**`BookingListWithWebSocket`** (`src/components/examples/BookingListWithWebSocket.tsx`)
- Demonstration component
- Shows connection status
- Displays last update
- Full event handling example

## Maintenance

### Adding New Tests

When adding new WebSocket functionality:

1. Add test file following naming convention: `*-socketio.test.tsx` or `websocket-*.test.tsx`
2. Use the custom mock pattern shown above
3. Account for debouncing (350ms wait)
4. Test all three event types
5. Verify cleanup on unmount

### Updating Existing Tests

When modifying WebSocket behavior:

1. Update relevant test expectations
2. Add tests for new edge cases
3. Verify all existing tests still pass
4. Update documentation if event schemas change

## Troubleshooting

### Tests Timeout

If tests timeout, check:
- Debounce wait time is sufficient (350ms+)
- Mock socket handlers are properly set up
- waitFor conditions are correct

### Callbacks Not Called

If callbacks aren't triggered:
- Verify mock socket event handlers are registered
- Check event emission is wrapped in `act()`
- Ensure proper wait time after emission

### State Not Updating

If store state doesn't update:
- Verify callback function updates the store
- Check waitFor conditions
- Ensure store is reset before test

## Future Enhancements

Potential areas for additional testing:

1. **Performance Testing**
   - Event throughput limits
   - Memory usage under high load
   - Debounce effectiveness metrics

2. **Network Simulation**
   - Latency simulation
   - Packet loss handling
   - Bandwidth constraints

3. **Browser Compatibility**
   - Cross-browser WebSocket support
   - Fallback mechanisms

4. **Security Testing**
   - XSS prevention in event data
   - Authorization checks
   - Rate limiting

## References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Jest Testing Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Zustand Testing Guide](https://docs.pmnd.rs/zustand/guides/testing)

## Contact

For questions about WebSocket testing:
- Review existing test files for patterns
- Check the copilot-settings.md for project conventions
- Refer to this documentation for test strategies
