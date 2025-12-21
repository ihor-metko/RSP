# WebSocket Examples

This directory contains example components demonstrating how to use the unified Socket.IO architecture for real-time updates in ArenaOne.

## Available Examples

### 1. BookingListWithWebSocket

A complete example showing how to display bookings with automatic real-time updates.

**Features:**
- Connection status indicator
- Real-time booking updates (create, update, delete)
- Integration with `useBookingStore`
- Automatic updates via `GlobalSocketListener`

**Usage:**
```tsx
import { BookingListWithWebSocket } from '@/components/examples/BookingListWithWebSocket';

export default function MyBookingsPage() {
  return (
    <BookingListWithWebSocket 
      clubId="club-123" 
      date="2024-01-15" 
    />
  );
}
```

### 2. WebSocketStatusIndicator

A minimal status indicator component that shows WebSocket connection status.

**Usage:**
```tsx
import { WebSocketStatusIndicator } from '@/components/examples/BookingListWithWebSocket';

export default function MyComponent() {
  return (
    <div>
      <h1>My Page <WebSocketStatusIndicator /></h1>
      {/* Rest of your content */}
    </div>
  );
}
```

### 3. WebSocketTestingDemo

An interactive testing component for manual WebSocket testing during development.

**Features:**
- Real-time event logs
- Manual connect/disconnect controls
- Connection status display
- Current bookings list with live updates

**Usage:**
```tsx
import { WebSocketTestingDemo } from '@/components/examples/WebSocketTestingDemo';

export default function TestPage() {
  return <WebSocketTestingDemo clubId="club-123" showDebugLogs={true} />;
}
```

## How to Use These Examples

1. **Copy and adapt**: These are demonstration components. Copy the relevant parts to your own components.

2. **Learn the patterns**: Study how components use `useSocket` from `SocketContext` and read from Zustand stores.

3. **Customize**: Modify the UI and logic to fit your specific needs.

## Key Patterns

### Pattern 1: Read from Store (Recommended)

Components simply read from the store - updates happen automatically:

```tsx
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

function MyComponent({ clubId, date }: Props) {
  // Optional: Get connection status for UI indicator
  const { isConnected } = useSocket();
  
  // Read bookings from store
  const bookings = useBookingStore(state => state.bookings);
  const fetchBookingsForDay = useBookingStore(state => state.fetchBookingsForDay);
  
  // Initial fetch
  useEffect(() => {
    fetchBookingsForDay(clubId, date);
  }, [clubId, date, fetchBookingsForDay]);
  
  // Bookings automatically update via GlobalSocketListener
  return (
    <div>
      {isConnected && <span>🟢 Live</span>}
      {bookings.map(b => <div key={b.id}>{b.courtName}</div>)}
    </div>
  );
}
```

### Pattern 2: Custom Socket Events

For custom events not handled by GlobalSocketListener:

```tsx
import { useSocket } from '@/contexts/SocketContext';

function MyComponent() {
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) return;
    
    const handleCustomEvent = (data: any) => {
      console.log('Custom event:', data);
    };
    
    socket.on('custom_event', handleCustomEvent);
    return () => socket.off('custom_event', handleCustomEvent);
  }, [socket]);
}
```

## Architecture

The unified socket architecture consists of:

1. **SocketProvider** (`@/contexts/SocketContext`): Single global socket connection
2. **GlobalSocketListener** (`@/components/GlobalSocketListener`): Centralized event dispatcher
3. **Zustand Stores** (`@/stores/useBookingStore`): Data storage
4. **Components**: Read from stores, automatically re-render

## Testing

To test these examples:

1. Start the development server with the custom server:
   ```bash
   npm run dev
   ```

2. Open the browser console to see WebSocket logs:
   - `[SocketProvider] Socket connected: <id>` - Connection established
   - `[GlobalSocketListener] Registering event listeners` - Listener active
   - Event logs when bookings change

3. Create/update/delete bookings through the UI or API to trigger real-time updates

## Next Steps

- See [WebSocket Client Setup Documentation](../../docs/websocket-client-setup.md) for complete guide
- Check [GlobalSocketListener](../GlobalSocketListener.tsx) for event handling implementation
- Review [Socket Types](../types/socket.ts) for event type definitions

## Need Help?

Common issues and solutions can be found in the [Troubleshooting section](../../docs/websocket-client-setup.md#troubleshooting) of the WebSocket documentation.
