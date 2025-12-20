# WebSocket Server for Real-time Booking Updates

This document describes the Socket.IO implementation for real-time booking updates in the ArenaOne application.

## Overview

The WebSocket server is implemented using Socket.IO and provides real-time updates for booking operations across all connected clients.

## Architecture

### Server-side Components

1. **`server.js`** - Custom Next.js server with Socket.IO integration
   - Initializes the Socket.IO server
   - Handles client connections/disconnections
   - Stores the Socket.IO instance globally for API routes

2. **`src/types/socket.ts`** - TypeScript type definitions
   - Defines event payloads for booking operations
   - Provides strongly-typed Socket.IO server and client interfaces
   - Includes types for `bookingCreated`, `bookingUpdated`, and `bookingDeleted` events

3. **`src/lib/socketEmitters.ts`** - Event emitter utilities
   - `emitBookingCreated()` - Emit when a new booking is created
   - `emitBookingUpdated()` - Emit when a booking is updated
   - `emitBookingDeleted()` - Emit when a booking is deleted
   - Safely handles cases when Socket.IO is not initialized

4. **`src/app/api/socket/route.ts`** - API endpoint
   - GET `/api/socket` - Check Socket.IO server status
   - Returns connection information and client count

### Client-side Components

1. **`src/hooks/useSocketIO.ts`** - React hook for Socket.IO client
   - Auto-connects to the Socket.IO server
   - Provides event listeners for booking events
   - Handles connection state management
   - Cleans up connections on unmount

## Usage

### Starting the Server

The Socket.IO server runs automatically when you start the Next.js application:

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The server will log:
```
> Ready on http://localhost:3000
> Socket.IO server initialized
```

### Using the Client Hook

In your React components, use the `useSocketIO` hook to listen for real-time updates:

```typescript
import { useSocketIO } from '@/hooks/useSocketIO';
import { useBookingStore } from '@/stores/useBookingStore';

function BookingManager() {
  const fetchBookingsForDay = useBookingStore(state => state.fetchBookingsForDay);
  
  const { isConnected } = useSocketIO({
    onBookingCreated: (data) => {
      console.log('New booking created:', data);
      // Refresh bookings list for the affected club
      fetchBookingsForDay(data.clubId, data.booking.start.split('T')[0]);
    },
    
    onBookingUpdated: (data) => {
      console.log('Booking updated:', data);
      // Refresh bookings list
      fetchBookingsForDay(data.clubId, data.booking.start.split('T')[0]);
    },
    
    onBookingDeleted: (data) => {
      console.log('Booking deleted:', data);
      // Refresh bookings list
      fetchBookingsForDay(data.clubId, /* date */);
    },
  });

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
      {/* Your booking UI */}
    </div>
  );
}
```

### Emitting Events from API Routes

In your API routes, use the emitter functions to broadcast events to all connected clients:

```typescript
import { emitBookingCreated } from '@/lib/socketEmitters';
import type { OperationsBooking } from '@/types/booking';

// In your booking creation handler
export async function POST(req: Request) {
  // ... create booking in database
  const booking: OperationsBooking = await prisma.booking.create({
    // ... booking data
  });

  // Emit event to all connected clients
  emitBookingCreated({
    booking,
    clubId: booking.clubId,
    courtId: booking.courtId,
  });

  return NextResponse.json(booking);
}
```

## Event Types

### BookingCreatedEvent
```typescript
{
  booking: OperationsBooking;  // Full booking object
  clubId: string;               // Club ID for filtering
  courtId: string;              // Court ID for filtering
}
```

### BookingUpdatedEvent
```typescript
{
  booking: OperationsBooking;  // Updated booking object
  clubId: string;               // Club ID for filtering
  courtId: string;              // Court ID for filtering
  previousStatus?: string;      // Optional: previous booking status
}
```

### BookingDeletedEvent
```typescript
{
  bookingId: string;  // ID of deleted booking
  clubId: string;     // Club ID for filtering
  courtId: string;    // Court ID for filtering
}
```

## Testing

Run the test suite:

```bash
# Run all Socket.IO tests
npm test -- useSocketIO.test.ts
npm test -- socketEmitters.test.ts
```

### Manual Testing

1. Start the server:
   ```bash
   npm run dev
   ```

2. Check server status:
   ```bash
   curl http://localhost:3000/api/socket
   ```

3. Test client connection:
   ```javascript
   const { io } = require('socket.io-client');
   const socket = io('http://localhost:3000');
   
   socket.on('connect', () => {
     console.log('Connected:', socket.id);
   });
   
   socket.on('bookingCreated', (data) => {
     console.log('Booking created:', data);
   });
   ```

## Configuration

### CORS Settings

The Socket.IO server is configured to accept connections from:
- Development: `http://localhost:3000`
- Production: Value of `NEXT_PUBLIC_APP_URL` environment variable (required)

**Security Note**: In production, the `NEXT_PUBLIC_APP_URL` environment variable **must** be set. If not set, Socket.IO connections will be rejected for security reasons.

To modify CORS settings, edit `server.js`:

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: 'https://your-domain.com',
    methods: ['GET', 'POST'],
  },
});
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `HOSTNAME` - Server hostname (default: localhost)
- `NEXT_PUBLIC_APP_URL` - Production app URL for CORS

## Best Practices

1. **Always emit events after successful database operations**
   - Emit after the booking is created/updated/deleted
   - Don't emit if the operation fails

2. **Include relevant context in events**
   - Always include `clubId` and `courtId` for filtering
   - Include full booking object for complete updates

3. **Handle disconnections gracefully**
   - The hook automatically reconnects on disconnection
   - Always check `isConnected` before showing "live" indicators

4. **Use type safety**
   - All events are strongly typed via TypeScript
   - Use the provided types from `@/types/socket`

5. **Test in both development and production**
   - Socket.IO behaves slightly differently in different modes
   - Verify CORS settings work in production

## Troubleshooting

### "Socket.IO server not initialized" warning

This warning appears when:
- The app is not started via the custom server (`server.js`)
- Running `next dev` directly instead of `npm run dev`

**Solution**: Always use `npm run dev` or `npm start` to run the server with Socket.IO support.

### Clients not receiving events

Check:
1. Is the server running via `server.js`?
2. Are clients connected? Check `/api/socket` endpoint
3. Are events being emitted after successful operations?
4. Check browser console for connection errors

### CORS errors in production

Ensure `NEXT_PUBLIC_APP_URL` environment variable is set correctly in your production environment.

## Future Enhancements

Potential improvements for the WebSocket implementation:

1. **Room-based filtering**
   - Join clients to specific club/court rooms
   - Emit events only to relevant rooms

2. **Authentication**
   - Verify user identity on connection
   - Restrict events based on user roles

3. **Presence tracking**
   - Track which users are viewing which bookings
   - Show "live viewers" indicators

4. **Optimistic updates**
   - Update UI immediately, then confirm via WebSocket
   - Rollback if server event differs

5. **Event history**
   - Store recent events for new connections
   - Replay events on reconnection
