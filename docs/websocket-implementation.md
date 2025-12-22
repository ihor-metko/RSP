# WebSocket Server for Real-time Booking Updates

This document describes the Socket.IO implementation for real-time booking updates in the ArenaOne application.

## Overview

The WebSocket server is implemented using Socket.IO and provides real-time updates for booking operations. **Events are now isolated per club** using room-based targeting to improve security and scalability.

## Key Features

- **Club-Based Room Targeting**: Events are delivered only to clients connected to the same club
- **Automatic Room Switching**: Socket reconnects when user switches clubs
- **Server-Side Filtering**: Room membership is controlled server-side for security
- **Backward Compatible**: Legacy mode supported for gradual migration

## Architecture

### Server-side Components

1. **`server.js`** - Custom Next.js server with Socket.IO integration
   - Initializes the Socket.IO server
   - Handles client connections/disconnections
   - **Implements club-based room targeting**
   - Stores the Socket.IO instance globally for API routes

2. **`socketAuth.js`** - Socket authentication module (CommonJS)
   - Verifies JWT tokens from socket connections
   - Fetches user's organization and club memberships
   - Returns user data including accessible clubIds

3. **`src/types/socket.ts`** - TypeScript type definitions
   - Defines event payloads for booking operations
   - Provides strongly-typed Socket.IO server and client interfaces
   - Includes types for all real-time events

4. **`src/lib/socketEmitters.ts`** - Event emitter utilities
   - `emitBookingCreated()` - Emit when a new booking is created
   - `emitBookingUpdated()` - Emit when a booking is updated
   - `emitBookingDeleted()` - Emit when a booking is deleted
   - `emitSlotLocked()`, `emitSlotUnlocked()`, `emitLockExpired()` - Slot lock events
   - `emitPaymentConfirmed()`, `emitPaymentFailed()` - Payment events
   - **All events target specific club rooms: `io.to(\`club:${clubId}\`).emit(...)`**
   - Safely handles cases when Socket.IO is not initialized

5. **`src/app/api/socket/route.ts`** - API endpoint
   - GET `/api/socket` - Check Socket.IO server status
   - Returns connection information and client count

### Client-side Components

1. **`src/contexts/ClubContext.tsx`** - Active Club Provider
   - Tracks the currently active/selected club
   - Persists activeClubId in localStorage
   - Used by SocketProvider to determine which club room to join

2. **`src/contexts/SocketContext.tsx`** - Global Socket Provider
   - Creates a single global socket connection
   - Provides socket instance and connection status to all components
   - **Passes activeClubId during connection for room targeting**
   - **Automatically reconnects when activeClubId changes**
   - Handles automatic reconnection

3. **`src/components/GlobalSocketListener.tsx`** - Centralized Event Dispatcher
   - Listens to all socket events globally
   - Automatically updates Zustand stores when events are received
   - Displays toast notifications via globalNotificationManager
   - **No client-side filtering needed** - server guarantees correct targeting
   - No duplicate connections or event listeners

4. **`src/utils/globalNotificationManager.ts`** - Notification Handler
   - Manages toast notifications for socket events
   - Prevents duplicate notifications
   - Handles all booking, payment, and slot events

## Club-Based Room Targeting

### How It Works

1. **Client Connection**:
   ```typescript
   // User navigates to a club page
   setActiveClubId('club-123');
   
   // Socket connects with clubId
   const socket = io({
     auth: {
       token: jwtToken,
       clubId: 'club-123', // Passed to server
     },
   });
   ```

2. **Server Room Joining**:
   ```javascript
   // server.js connection handler
   io.on('connection', (socket) => {
     const clubId = socket.data.clubId;
     
     // Verify user has access to this club
     if (userData.clubIds.includes(clubId)) {
       socket.join(`club:${clubId}`);
     }
   });
   ```

3. **Event Emission**:
   ```typescript
   // API route emits event to specific club room
   emitBookingCreated({
     booking,
     clubId: 'club-123',
     courtId: 'court-456',
   });
   
   // In socketEmitters.ts
   io.to(`club:${clubId}`).emit('booking_created', data);
   ```

4. **Room Switching**:
   ```typescript
   // User navigates to different club
   setActiveClubId('club-456');
   
   // Socket automatically disconnects and reconnects with new clubId
   // Old room: club:123 (left)
   // New room: club:456 (joined)
   ```

### Security Benefits

- **Server-Side Validation**: Users can only join clubs they have access to
- **Isolated Events**: Users never receive events from clubs they don't belong to
- **No Client-Side Filtering**: Room membership is controlled entirely by server
- **Root Admin Support**: Root admins join `root_admin` room to receive all events

### Legacy Mode

For backward compatibility, if no clubId is provided during connection:
- Socket joins **all accessible clubs** (legacy behavior)
- This allows gradual migration of existing pages
- Client-side filtering in `useCourtAvailability` is marked as LEGACY

Eventually, all pages should set activeClubId and legacy filtering will be removed.

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

### Using in Components

The socket architecture is already configured in the root layout. Components simply read from Zustand stores:

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

function BookingManager({ clubId, date }: { clubId: string; date: string }) {
  // Optional: Get connection status for UI indicator
  const { isConnected } = useSocket();
  
  // Read bookings from store
  const bookings = useBookingStore(state => state.bookings);
  const fetchBookingsForDay = useBookingStore(state => state.fetchBookingsForDay);
  
  // Initial fetch
  useEffect(() => {
    fetchBookingsForDay(clubId, date);
  }, [clubId, date, fetchBookingsForDay]);
  
  // That's it! Bookings automatically update via GlobalSocketListener
  // No manual event handling needed

  return (
    <div>
      {isConnected ? '🟢 Live' : '🔴 Offline'}
      {bookings.map(booking => (
        <div key={booking.id}>{booking.courtName}</div>
      ))}
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
# Run socket-related tests
npm test -- GlobalSocketListener.test.tsx
npm test -- socketEmitters.test.ts
npm test -- socketUpdateManager.test.ts
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
