# WebSocket Integration Testing Documentation

## Overview

This document describes the WebSocket testing infrastructure for the ArenaOne application using the unified socket architecture. The tests ensure reliable real-time booking updates using the centralized `GlobalSocketListener` and `SocketProvider`.

## Test Architecture

### Current Test Files

1. **`GlobalSocketListener.test.tsx`** - Core Integration Tests (6 tests)
   - Event listener registration
   - Booking event handling (created, updated, cancelled)
   - Payment event handling
   - Store updates via socket events
   - Component cleanup on unmount
   - Proper event unregistration

2. **`socketEmitters.test.ts`** - Server-side Emitter Tests
   - Event emission for booking operations
   - Proper event payload structure
   - Safe handling when Socket.IO not initialized

3. **`socketUpdateManager.test.ts`** - Update Manager Tests
   - Debouncing of rapid socket events
   - Prevention of UI flickering
   - Event deduplication

4. **`globalNotificationManager.test.ts`** - Notification Tests
   - Toast notification generation for events
   - Duplicate notification prevention
   - Event-specific message formatting

### Total Coverage

- **Total WebSocket Tests**: 20+ tests covering the unified architecture
- **Test Coverage**: All socket components and utilities
- **Event Types Tested**: booking_created, booking_updated, booking_cancelled, slot_locked, slot_unlocked, payment_confirmed, payment_failed
- **Legacy Events**: bookingCreated, bookingUpdated, bookingDeleted (for backward compatibility)

## Testing Strategy

### Mock Implementation

Tests use a custom Socket.IO mock for the unified architecture:

```typescript
// Mock socket instance
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  id: 'test-socket-id',
  connected: false,
  io: {
    on: jest.fn(),
    off: jest.fn(),
  },
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock SocketProvider
jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: true,
  })),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

### Mock Booking Store

```typescript
const mockUpdateBookingFromSocket = jest.fn();
const mockRemoveBookingFromSocket = jest.fn();

jest.mock('@/stores/useBookingStore', () => ({
  useBookingStore: jest.fn((selector) => {
    const mockStore = {
      updateBookingFromSocket: mockUpdateBookingFromSocket,
      removeBookingFromSocket: mockRemoveBookingFromSocket,
    };
    return selector(mockStore);
  }),
}));
```

### Mock Notification Manager

```typescript
jest.mock('@/utils/globalNotificationManager', () => ({
  handleSocketEvent: jest.fn(),
  cleanupNotificationManager: jest.fn(),
}));
```

## Key Test Scenarios

### 1. Event Listener Registration

Tests that `GlobalSocketListener` registers all necessary event listeners:

```typescript
it('should register all event listeners', () => {
  render(<GlobalSocketListener />);

  const registeredEvents = mockSocket.on.mock.calls.map(call => call[0]);
  
  expect(registeredEvents).toContain('booking_created');
  expect(registeredEvents).toContain('booking_updated');
  expect(registeredEvents).toContain('booking_cancelled');
  expect(registeredEvents).toContain('slot_locked');
  expect(registeredEvents).toContain('payment_confirmed');
  
  // Legacy events
  expect(registeredEvents).toContain('bookingCreated');
  expect(registeredEvents).toContain('bookingUpdated');
  expect(registeredEvents).toContain('bookingDeleted');
});
```

### 2. Booking Created Event

Tests that booking creation events update the store and trigger notifications:

```typescript
it('should handle booking_created event', async () => {
  render(<GlobalSocketListener />);

  const eventHandler = mockSocket.on.mock.calls.find(
    call => call[0] === 'booking_created'
  )?.[1];

  const eventData = {
    booking: { id: 'booking-1', bookingStatus: 'CONFIRMED' },
    clubId: 'club-1',
    courtId: 'court-1',
  };

  eventHandler(eventData);

  await waitFor(() => {
    expect(handleSocketEvent).toHaveBeenCalledWith('booking_created', eventData);
    expect(mockUpdateBookingFromSocket).toHaveBeenCalledWith(eventData.booking);
  });
});
```

### 3. Booking Cancelled Event

Tests that booking cancellation removes from store:

```typescript
it('should handle booking_cancelled event', async () => {
  render(<GlobalSocketListener />);

  const eventHandler = mockSocket.on.mock.calls.find(
    call => call[0] === 'booking_cancelled'
  )?.[1];

  const eventData = {
    bookingId: 'booking-1',
    clubId: 'club-1',
    courtId: 'court-1',
  };

  eventHandler(eventData);

  await waitFor(() => {
    expect(handleSocketEvent).toHaveBeenCalledWith('booking_cancelled', eventData);
    expect(mockRemoveBookingFromSocket).toHaveBeenCalledWith(eventData.bookingId);
  });
});
```

### 4. Cleanup on Unmount

Tests proper cleanup of event listeners:

```typescript
it('should cleanup on unmount', () => {
  const { unmount } = render(<GlobalSocketListener />);

  unmount();

  expect(mockSocket.off).toHaveBeenCalledWith('booking_created', expect.any(Function));
  expect(mockSocket.off).toHaveBeenCalledWith('booking_updated', expect.any(Function));
  expect(mockSocket.off).toHaveBeenCalledWith('booking_cancelled', expect.any(Function));
  expect(cleanupNotificationManager).toHaveBeenCalled();
});
```

## Running Tests

### Run All WebSocket Tests

```bash
# Run all socket-related tests
npm test -- GlobalSocketListener
npm test -- socketEmitters
npm test -- socketUpdateManager
npm test -- globalNotificationManager
```

### Run Specific Test File

```bash
# Run GlobalSocketListener tests
npm test -- GlobalSocketListener.test.tsx

# Run with coverage
npm test -- --coverage --collectCoverageFrom="src/components/GlobalSocketListener.tsx"
```

### Watch Mode

```bash
# Watch mode for active development
npm test -- --watch GlobalSocketListener
```

## Test Best Practices

### 1. Mock the Socket Context

Always mock `SocketContext` instead of creating real socket connections:

```typescript
jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: true,
  })),
}));
```

### 2. Test Event Handlers

Extract and test event handlers directly:

```typescript
const eventHandler = mockSocket.on.mock.calls.find(
  call => call[0] === 'booking_created'
)?.[1];

expect(eventHandler).toBeDefined();
eventHandler(mockEventData);
```

### 3. Test Store Integration

Verify that socket events update Zustand stores correctly:

```typescript
await waitFor(() => {
  expect(mockUpdateBookingFromSocket).toHaveBeenCalledWith(expectedData);
});
```

### 4. Test Cleanup

Always test that event listeners are properly cleaned up:

```typescript
const { unmount } = render(<GlobalSocketListener />);
unmount();

expect(mockSocket.off).toHaveBeenCalled();
expect(cleanupNotificationManager).toHaveBeenCalled();
```

## Coverage Goals

- **GlobalSocketListener**: 100% coverage of all event handlers
- **socketEmitters**: 100% coverage of emit functions
- **socketUpdateManager**: 100% coverage of debouncing logic
- **globalNotificationManager**: 100% coverage of notification logic

## Continuous Integration

WebSocket tests run automatically on:
- Pull request creation
- Push to main branch
- Pre-commit hooks (if configured)

All tests must pass before merging changes.

## Troubleshooting Tests

### Mock Socket Not Working

Ensure the mock is set up before importing components:

```typescript
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Then import components
import { GlobalSocketListener } from '@/components/GlobalSocketListener';
```

### Store Not Updating

Verify the store mock selector is working:

```typescript
jest.mock('@/stores/useBookingStore', () => ({
  useBookingStore: jest.fn((selector) => {
    const store = { /* ... */ };
    return selector(store);
  }),
}));
```

### Async Events Not Firing

Use `waitFor` for async assertions:

```typescript
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled();
});
```

## Related Documentation

- [WebSocket Client Setup](./websocket-client-setup.md) - Client-side integration guide
- [WebSocket Implementation](./websocket-implementation.md) - Server and client architecture
- [GlobalSocketListener Source](../src/components/GlobalSocketListener.tsx) - Implementation
- [SocketContext Source](../src/contexts/SocketContext.tsx) - Context implementation

## Future Improvements

- Add E2E tests with real Socket.IO server
- Test reconnection scenarios with network simulation
- Add performance benchmarks for event processing
- Test concurrent event handling under load
