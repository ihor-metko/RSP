# WebSocket Backend Setup Documentation

## Overview

The ArenaOne platform now includes real-time WebSocket support for the Operations page using Socket.io. This enables live updates for bookings and court availability changes without requiring page refreshes.

## Architecture

### Technology Stack

- **Server**: Socket.io 4.8.1
- **Transport**: WebSocket with polling fallback
- **Room Pattern**: `club:{clubId}:bookings` for club-specific channels

### Custom Server Setup

Since Next.js 15 with App Router doesn't natively support WebSocket upgrades, we've implemented a custom Node.js server that wraps Next.js and adds Socket.io support.

**File**: `server.js` (root directory)

The custom server:
1. Initializes Next.js app
2. Creates HTTP server for Next.js requests
3. Attaches Socket.io to the HTTP server
4. Exposes Socket.io instance globally as `global.io`
5. Handles WebSocket connections and room subscriptions

### Server Configuration

```javascript
// Socket.io initialization
const io = new Server(httpServer, {
  path: '/api/socket',
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  addTrailingSlash: false,
});
```

## Room-Based Architecture

### Room Naming Convention

```
club:{clubId}:bookings
```

**Examples:**
- `club:abc123:bookings` - Booking events for club with ID "abc123"
- `club:def456:bookings` - Booking events for club with ID "def456"

### Why Rooms?

Rooms allow us to:
1. **Isolate events by club** - Admins only receive updates for clubs they manage
2. **Handle multiple connections** - Multiple admins can connect to the same club without duplicates
3. **Efficient broadcasting** - Events are only sent to relevant subscribers

## Events

### Client → Server Events

#### `subscribe:club:bookings`
Subscribe to booking events for a specific club.

**Payload**: `clubId` (string)

**Response**: Server emits `subscribed` event with:
```javascript
{
  room: "club:{clubId}:bookings",
  clubId: "{clubId}"
}
```

#### `unsubscribe:club:bookings`
Unsubscribe from booking events for a specific club.

**Payload**: `clubId` (string)

**Response**: Server emits `unsubscribed` event

### Server → Client Events

#### `booking:created`
Emitted when a new booking is created.

**Payload**:
```typescript
{
  id: string;           // Booking ID
  clubId: string;       // Club ID
  courtId: string;      // Court ID
  userId: string;       // User ID
  start: string;        // ISO 8601 datetime
  end: string;          // ISO 8601 datetime
  status: string;       // Booking status
  price: number;        // Price in cents
}
```

**Triggered by**:
- `POST /api/admin/bookings/create` - Admin creates a booking

#### `booking:updated`
Emitted when a booking is updated or cancelled.

**Payload**: Same structure as `booking:created`

**Triggered by**:
- `PATCH /api/admin/bookings/[id]` - Admin updates booking (including cancellations)

#### `booking:deleted`
Emitted when a booking is deleted (soft or hard delete).

**Payload**:
```typescript
{
  id: string;     // Booking ID
  clubId: string; // Club ID
}
```

**Note**: Currently not implemented as the system uses status updates for cancellations rather than deletions.

#### `court:availability`
Emitted when court availability changes (e.g., court becomes active/inactive, price changes).

**Payload**:
```typescript
{
  clubId: string;   // Club ID
  courtId: string;  // Court ID
  date: string;     // Date in YYYY-MM-DD format
}
```

**Triggered by**:
- `PATCH /api/admin/courts/[courtId]` - Admin updates court (isActive or pricing changes)
- `DELETE /api/admin/courts/[courtId]` - Admin deletes a court

## Integration with API Routes

### Accessing Socket.io from API Routes

Use the `getIO()` helper function:

```typescript
import { getIO } from "@/lib/socket-instance";
import type { BookingEventPayload } from "@/lib/websocket";

// Inside your API route
const io = getIO();
if (io) {
  const eventPayload: BookingEventPayload = {
    id: booking.id,
    clubId: club.id,
    courtId: booking.courtId,
    userId: booking.userId,
    start: booking.start.toISOString(),
    end: booking.end.toISOString(),
    status: booking.status,
    price: booking.price,
  };
  
  io.to(`club:${club.id}:bookings`).emit("booking:created", eventPayload);
}
```

### Instrumented API Routes

The following API routes have been updated to emit WebSocket events:

1. **`POST /api/admin/bookings/create`**
   - Emits: `booking:created`
   - When: Booking successfully created (both mock and real mode)

2. **`PATCH /api/admin/bookings/[id]`**
   - Emits: `booking:updated`
   - When: Booking successfully updated (both mock and real mode)

3. **`PATCH /api/admin/courts/[courtId]`**
   - Emits: `court:availability`
   - When: Court's `isActive` or `defaultPriceCents` changed

4. **`DELETE /api/admin/courts/[courtId]`**
   - Emits: `court:availability`
   - When: Court successfully deleted

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts the custom server with WebSocket support on `http://localhost:3000`.

**Alternative** (without WebSocket):
```bash
npm run dev:next
```

This uses the standard Next.js dev server without WebSocket support.

### Production Mode

```bash
npm run build
npm start
```

This builds the Next.js app and starts the custom production server with WebSocket support.

**Alternative** (without WebSocket):
```bash
npm run build
npm run start:next
```

## Testing WebSocket Connection

### Using the Test Client

A test client is available at `/tmp/test-websocket-client.js`:

```bash
# Terminal 1: Start the server
npm run dev

# Terminal 2: Run the test client
node /tmp/test-websocket-client.js
```

The test client will:
1. Connect to the WebSocket server
2. Subscribe to `club:test-club-123:bookings`
3. Listen for all booking and court events
4. Log received events to the console

### Manual Testing with curl/API Clients

1. Start the server and test client (as above)
2. Make an API call to create or update a booking
3. Observe the event logged in the test client terminal

Example:
```bash
# Create a booking (requires authentication)
curl -X POST http://localhost:3000/api/admin/bookings/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "courtId": "court-id",
    "startTime": "2024-12-18T10:00:00Z",
    "endTime": "2024-12-18T11:00:00Z"
  }'
```

## Connection Flow

```
┌─────────────┐                 ┌──────────────┐                 ┌────────────┐
│   Client    │                 │    Server    │                 │  API Route │
│  (Browser)  │                 │  (server.js) │                 │  Handler   │
└──────┬──────┘                 └──────┬───────┘                 └─────┬──────┘
       │                               │                               │
       │ 1. Connect to Socket.io       │                               │
       ├──────────────────────────────>│                               │
       │                               │                               │
       │ 2. Connection established     │                               │
       │<──────────────────────────────┤                               │
       │                               │                               │
       │ 3. subscribe:club:bookings    │                               │
       ├──────────────────────────────>│                               │
       │    (clubId: "abc123")         │                               │
       │                               │                               │
       │ 4. Joined room                │                               │
       │    subscribed event           │                               │
       │<──────────────────────────────┤                               │
       │                               │                               │
       │                               │ 5. Booking created            │
       │                               │<──────────────────────────────┤
       │                               │    (via POST /api/.../create) │
       │                               │                               │
       │                               │ 6. Emit to room               │
       │                               │    club:abc123:bookings       │
       │                               │                               │
       │ 7. booking:created event      │                               │
       │<──────────────────────────────┤                               │
       │    (event payload)            │                               │
       │                               │                               │
```

## Security Considerations

1. **Room Isolation**: Clients can only receive events from rooms they've subscribed to
2. **No Authentication on WebSocket**: The WebSocket connection itself doesn't authenticate. Frontend should only subscribe to clubs the user has access to (enforced by the Operations page logic)
3. **API Route Protection**: All API routes that emit events are protected by `requireAnyAdmin()` middleware
4. **CORS Configuration**: WebSocket CORS is configured to match the application's domain

## Future Enhancements

1. **Authentication**: Add Socket.io middleware to authenticate connections using JWT tokens
2. **Presence Detection**: Track which admins are viewing which operations pages
3. **Typing Indicators**: Show when an admin is creating/editing a booking
4. **Conflict Prevention**: Lock bookings being edited by another admin
5. **Event History**: Store recent events for clients that reconnect
6. **Compression**: Enable Socket.io compression for large payloads

## Troubleshooting

### WebSocket connection fails

1. Check that you're running the custom server (`npm run dev`, not `npm run dev:next`)
2. Verify the Socket.io path is correct: `/api/socket`
3. Check browser console for CORS errors
4. Ensure port 3000 is not blocked by firewall

### Events not being received

1. Verify the client subscribed to the correct room (`club:{clubId}:bookings`)
2. Check server logs for event emission confirmation (in development mode)
3. Confirm the API route successfully called `getIO()` and emitted the event
4. Test with the provided test client to isolate frontend vs backend issues

### Server won't start

1. Check that Socket.io dependencies are installed: `npm install`
2. Verify Node.js version (requires Node.js 16+)
3. Look for port conflicts (port 3000 already in use)

## Files Reference

- `server.js` - Custom Next.js server with Socket.io
- `src/lib/websocket.ts` - WebSocket types and helper functions
- `src/lib/socket-instance.ts` - Helper to access global io instance from API routes
- `src/app/api/admin/bookings/create/route.ts` - Booking creation with events
- `src/app/api/admin/bookings/[id]/route.ts` - Booking update with events
- `src/app/api/admin/courts/[courtId]/route.ts` - Court updates with events
- `/tmp/test-websocket-client.js` - Test client for manual verification

## Support

For questions or issues related to the WebSocket implementation, please contact the development team or refer to the Socket.io documentation: https://socket.io/docs/v4/
