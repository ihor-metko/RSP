# Socket.IO Implementation Guide

## Overview

This document describes the Socket.IO implementation for real-time WebSocket communication in the ArenaOne platform.

## Architecture

### Server-Side Implementation

The Socket.IO server is initialized using Next.js custom server pattern with a singleton design to prevent multiple instances.

**Key Files:**
- `server.js` - Next.js custom server that initializes Socket.IO
- `src/lib/socket-instance.ts` - Singleton pattern implementation for Socket.IO server
- `src/lib/websocket.ts` - Event types and helper functions for emitting events

**Features:**
- ✅ Singleton pattern (one instance only)
- ✅ Websocket-only transport (no polling fallback)
- ✅ Room-based architecture for club-specific channels
- ✅ Compatible with Docker + Nginx deployment
- ✅ Hot module reload safe (development)

### Client-Side Implementation

The frontend connects to Socket.IO using a custom React hook that manages connection lifecycle and room subscriptions.

**Key Files:**
- `src/hooks/useWebSocket.ts` - React hook for WebSocket connection management

**Features:**
- ✅ Auto-connect/disconnect lifecycle
- ✅ Room subscription management
- ✅ Automatic reconnection
- ✅ TypeScript type safety
- ✅ Websocket-only transport

## Configuration

### Server Configuration

Socket.IO server is configured with the following settings:

```javascript
{
  path: "/api/socket",              // WebSocket endpoint path
  transports: ["websocket"],        // Websocket only, no polling
  cors: {
    origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  addTrailingSlash: false,
}
```

### Client Configuration

```javascript
{
  path: "/api/socket",
  transports: ["websocket"],        // Websocket only, no polling
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
}
```

## Room-Based Architecture

Socket.IO uses rooms to broadcast events to specific clubs.

**Room Naming Convention:** `club:{clubId}:bookings`

**Example:**
- Room: `club:abc123:bookings`
- Events in this room are only sent to clients subscribed to club `abc123`

## Events

### Client → Server Events

#### `subscribe:club:bookings`
Subscribe to booking events for a specific club.

**Payload:** `clubId` (string)

```javascript
socket.emit('subscribe:club:bookings', 'club-id-123');
```

#### `unsubscribe:club:bookings`
Unsubscribe from booking events.

**Payload:** `clubId` (string)

```javascript
socket.emit('unsubscribe:club:bookings', 'club-id-123');
```

### Server → Client Events

#### `subscribed`
Confirmation of successful room subscription.

**Payload:**
```typescript
{
  room: string;    // "club:{clubId}:bookings"
  clubId: string;
}
```

#### `unsubscribed`
Confirmation of successful room unsubscription.

**Payload:** Same as `subscribed`

#### `booking:created`
New booking created.

**Payload:**
```typescript
{
  id: string;
  clubId: string;
  courtId: string;
  userId: string;
  start: string;      // ISO 8601
  end: string;        // ISO 8601
  status: string;
  price: number;      // cents
}
```

#### `booking:updated`
Booking updated or status changed.

**Payload:** Same as `booking:created`

#### `booking:deleted`
Booking deleted or cancelled.

**Payload:**
```typescript
{
  id: string;
  clubId: string;
}
```

#### `court:availability`
Court availability changed (price update, active status change, etc).

**Payload:**
```typescript
{
  clubId: string;
  courtId: string;
  date: string;       // YYYY-MM-DD
}
```

## Usage Examples

### Server-Side: Emitting Events

```typescript
import { getIO } from "@/lib/socket-instance";
import { emitBookingCreated } from "@/lib/websocket";
import type { BookingEventPayload } from "@/lib/websocket";

// In an API route after creating a booking
const io = getIO();
const eventPayload: BookingEventPayload = {
  id: booking.id,
  clubId: "club-123",
  courtId: booking.courtId,
  userId: booking.userId,
  start: booking.start.toISOString(),
  end: booking.end.toISOString(),
  status: booking.status,
  price: booking.price,
};

emitBookingCreated(io, "club-123", eventPayload);
```

### Client-Side: Using the Hook

```typescript
import { useWebSocket } from "@/hooks/useWebSocket";

function MyComponent() {
  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onBookingCreated: (data) => {
      console.log('New booking:', data);
      // Update UI
    },
    onBookingUpdated: (data) => {
      console.log('Updated booking:', data);
      // Update UI
    },
    onConnect: () => {
      console.log('Connected to WebSocket');
    },
  });

  useEffect(() => {
    if (isConnected && clubId) {
      subscribe(clubId);
    }
    return () => {
      if (clubId) {
        unsubscribe(clubId);
      }
    };
  }, [isConnected, clubId, subscribe, unsubscribe]);

  return <div>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</div>;
}
```

## Development

### Running the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Testing WebSocket Connection

Use the test client script:

```bash
# Make sure the server is running
npm run dev

# In another terminal
node test-socket-io.js
```

**Expected output:**
```
Attempting to connect to Socket.IO server...
✅ Connected to Socket.IO server
Socket ID: abc123xyz

Subscribing to club room: test-club-123
✅ Subscribed successfully: { room: 'club:test-club-123:bookings', clubId: 'test-club-123' }

Test completed successfully! Disconnecting...
Disconnected: io client disconnect
```

### Debugging

Enable development logging by running in development mode (`NODE_ENV=development`).

Server logs will show:
- `[WebSocket] Socket.IO server initialized`
- `[WebSocket] Client connected: {socket-id}`
- `[WebSocket] Client {socket-id} joined room: {room-name}`
- `[WebSocket] Client disconnected: {socket-id}`

## Docker + Nginx Deployment

The implementation works correctly with Docker and Nginx reverse proxy.

### Nginx Configuration

Ensure WebSocket upgrade headers are configured:

```nginx
location /api/socket {
    proxy_pass http://backend:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Docker Configuration

The Dockerfile already includes the necessary configuration:

```dockerfile
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

```env
PORT=3000
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
```

## Security Considerations

### Current Implementation

- ✅ Room isolation prevents cross-club data leakage
- ✅ API routes protected by authentication middleware
- ✅ CORS configured for application domain only
- ✅ Events only sent to subscribed clients
- ✅ Websocket-only transport (no polling fallback)

### Future Enhancements

1. **Socket Authentication**: Add middleware to verify user session before allowing connections
2. **Room Authorization**: Verify user has access to club before allowing room subscription
3. **Rate Limiting**: Prevent connection/event spam
4. **TLS**: Ensure WSS (WebSocket Secure) in production

## Troubleshooting

### Connection Fails

**Problem:** Client cannot connect to Socket.IO server

**Solutions:**
1. Verify server is running: `npm run dev` or `npm start`
2. Check port 3000 is not blocked
3. Verify path is `/api/socket`
4. Check transport is set to `["websocket"]`

### Events Not Received

**Problem:** Client connected but not receiving events

**Solutions:**
1. Verify room subscription: Check `subscribed` event
2. Check clubId matches the emitted events
3. Verify event handlers are registered before subscription
4. Check server logs for event emission

### Multiple Instances

**Problem:** Multiple Socket.IO instances created

**Solutions:**
1. Ensure `initSocketIO()` uses singleton pattern
2. Check server.js only calls `initSocketIO()` once
3. Verify no hot module reload issues in development

## Migration Notes

### Changes from Previous Implementation

1. **Singleton Pattern**: Moved Socket.IO initialization to `socket-instance.ts` with proper singleton
2. **Websocket Only**: Removed polling transport for better performance
3. **Cleaner Code**: Separated concerns between server initialization and event handling
4. **Type Safety**: Improved TypeScript types throughout

### Breaking Changes

None. The implementation is backward compatible with existing code.
