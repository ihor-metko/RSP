# WebSocket Client Setup for Real-Time Bookings

## Overview

The ArenaOne platform uses Socket.IO to provide real-time updates for bookings. The WebSocket client uses a unified architecture with centralized event handling through the `GlobalSocketListener`.

## Architecture

### Server-Side
- **Server**: Custom Next.js server with Socket.IO (`server.js`)
- **Socket Types**: Typed events defined in `@/types/socket`
- **Emitters**: Helper functions in `@/lib/socketEmitters` for emitting events from API routes

### Client-Side (Unified Architecture)
- **SocketProvider**: Creates a single global socket connection (`@/contexts/SocketContext`)
- **GlobalSocketListener**: Centralized event listener that updates Zustand stores (`@/components/GlobalSocketListener`)
- **Library**: `socket.io-client@4.8.1`
- **Connection**: Single global connection with automatic reconnection

## Setup

### 1. Root Layout Configuration

The socket architecture is already configured in the root layout:

```tsx
// src/app/layout.tsx

import { SocketProvider } from '@/contexts/SocketContext';
import { GlobalSocketListener } from '@/components/GlobalSocketListener';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SocketProvider>
          {/* GlobalSocketListener handles all socket events centrally */}
          <GlobalSocketListener />
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
```

### 2. How It Works

1. **SocketProvider**: Initializes a single socket connection shared across the entire app
2. **GlobalSocketListener**: Listens to all socket events (booking_created, booking_updated, etc.)
3. **Automatic Store Updates**: When events are received, the listener automatically updates the Zustand booking store
4. **Components**: Just read from the store - they automatically re-render when data changes

## Usage in Components

### Basic Usage - Reading Connection Status

```tsx
import { useSocket } from '@/contexts/SocketContext';

function MyComponent() {
  // Get connection status if needed for UI indication
  const { isConnected } = useSocket();

  return (
    <div>
      <p>WebSocket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
    </div>
  );
}
```

### Recommended Pattern - Use Booking Store

Components should read booking data from the Zustand store, which is automatically updated by `GlobalSocketListener`:

```tsx
import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

function BookingsList({ clubId, date }: { clubId: string; date: string }) {
  // Get bookings from store
  const bookings = useBookingStore(state => state.bookings);
  const fetchBookingsForDay = useBookingStore(state => state.fetchBookingsForDay);
  
  // Optional: Get connection status for UI indicator
  const { isConnected } = useSocket();

  // Initial fetch
  useEffect(() => {
    fetchBookingsForDay(clubId, date);
  }, [clubId, date, fetchBookingsForDay]);

  // That's it! The bookings will automatically update in real-time
  // GlobalSocketListener handles all socket events and updates the store

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2>Bookings for {date}</h2>
        {isConnected && <span className="text-green-500">● Live</span>}
      </div>
      
      {bookings.map(booking => (
        <div key={booking.id}>
          {booking.courtName} - {booking.userName}
        </div>
      ))}
    </div>
  );
}
```

### Advanced Usage - Custom Socket Events

If you need to listen to custom socket events (beyond the standard booking events), you can access the socket directly:

```tsx
import { useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

function CustomEventComponent() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleCustomEvent = (data: any) => {
      console.log('Custom event received:', data);
    };

    socket.on('custom_event', handleCustomEvent);

    return () => {
      socket.off('custom_event', handleCustomEvent);
    };
  }, [socket]);

  return <div>Listening for custom events...</div>;
}
```

## Event Types

The following events are automatically handled by `GlobalSocketListener`:

### Booking Events
- `booking_created` - New booking created
- `booking_updated` - Booking status or details updated
- `booking_cancelled` - Booking cancelled/deleted

### Legacy Event Names (supported for backward compatibility)
- `bookingCreated`
- `bookingUpdated`
- `bookingDeleted`

### Slot Lock Events
- `slot_locked` - Time slot locked for booking
- `slot_unlocked` - Time slot unlocked
- `lock_expired` - Lock expired

### Payment Events
- `payment_confirmed` - Payment successfully processed
- `payment_failed` - Payment failed

## Benefits of the Unified Architecture

1. **Single Socket Connection**: No duplicate connections or memory leaks
2. **Centralized Event Handling**: All socket logic in one place (`GlobalSocketListener`)
3. **Automatic Store Updates**: Zustand stores updated automatically
4. **Toast Notifications**: Automatic notifications for events via `globalNotificationManager`
5. **Simpler Components**: Components just read from stores, no event handling needed
6. **Better Performance**: Single connection, no duplicate listeners
7. **Easier Testing**: Mock `SocketContext` instead of testing hook in every component

## Troubleshooting

### Events not being received

1. Check that the server is running via `npm run dev` or `npm start` (not `next dev`)
2. Verify Socket.IO is initialized: `curl http://localhost:3000/api/socket`
3. Check browser console for connection errors
4. Ensure `SocketProvider` wraps your app in the root layout

### Store not updating

1. Verify `GlobalSocketListener` is rendered in the root layout
2. Check that the booking store methods are working: `updateBookingFromSocket` and `removeBookingFromSocket`
3. Look for errors in the browser console

### Connection status always showing disconnected

1. Ensure the custom Next.js server (`server.js`) is running
2. Check that Socket.IO middleware is properly initialized
3. Verify no network/firewall issues blocking WebSocket connections

## Related Files

- **SocketProvider**: `src/contexts/SocketContext.tsx`
- **GlobalSocketListener**: `src/components/GlobalSocketListener.tsx`
- **Socket Types**: `src/types/socket.ts`
- **Emitters**: `src/lib/socketEmitters.ts`
- **Notification Manager**: `src/utils/globalNotificationManager.ts`
- **Booking Store**: `src/stores/useBookingStore.ts`

## Migration from Old Architecture

If you're migrating from the deprecated `useSocketIO` hook:

### Old Pattern (Deprecated)
```tsx
import { useSocketIO } from '@/hooks/useSocketIO';

const { isConnected } = useSocketIO({
  onBookingCreated: (data) => {
    // Handle event
  }
});
```

### New Pattern (Current)
```tsx
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

// Just use the socket for connection status
const { isConnected } = useSocket();

// Read bookings from store - automatically updated by GlobalSocketListener
const bookings = useBookingStore(state => state.bookings);
```

## Testing

For testing components that use the socket:

```tsx
import { useSocket } from '@/contexts/SocketContext';

jest.mock('@/contexts/SocketContext', () => ({
  useSocket: jest.fn(() => ({
    socket: mockSocket,
    isConnected: true,
  })),
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
```

See `src/__tests__/GlobalSocketListener.test.tsx` for testing examples.
