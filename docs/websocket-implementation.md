# WebSocket Implementation

## Overview

Socket.IO provides real-time updates for bookings and court availability. The implementation uses a custom server (required for WebSocket support in Next.js) with a singleton pattern.

## Architecture

### Server (`server.js`)
- Custom HTTP server wrapping Next.js
- Socket.IO initialized with singleton pattern
- WebSocket-only transport (no polling)
- Path: `/api/socket`

### Backend Libraries

#### `src/lib/socket-instance.ts`
- Provides `getIO()` accessor for API routes
- Returns singleton Socket.IO instance

#### `src/lib/websocket.ts`
- Type-safe event helpers
- Event types: `BookingEventPayload`, `CourtAvailabilityEventPayload`
- Emit functions: `emitBookingCreated`, `emitBookingUpdated`, `emitBookingDeleted`, `emitCourtAvailabilityChanged`

### Frontend Hook

#### `src/hooks/useWebSocket.ts`
- Manages WebSocket connection lifecycle
- Handles club channel subscriptions
- Auto-reconnection support
- Event handlers for real-time updates

## Events

### Client → Server
- `subscribe:club:bookings` - Subscribe to club's booking channel
- `unsubscribe:club:bookings` - Unsubscribe from club's booking channel

### Server → Client
- `booking:created` - New booking created
- `booking:updated` - Booking updated
- `booking:deleted` - Booking deleted
- `court:availability` - Court availability changed

### Connection Events
- `connect` - Connection established
- `disconnect` - Connection closed
- `subscribed` - Successfully joined room
- `unsubscribed` - Successfully left room

## Room Structure

Room naming: `club:{clubId}:bookings`

Example: `club:abc123:bookings`

## Usage Example

### Backend (API Route)
```typescript
import { getIO } from "@/lib/socket-instance";
import { emitBookingCreated } from "@/lib/websocket";

const io = getIO();
if (io) {
  emitBookingCreated(io, clubId, bookingData);
}
```

### Frontend (React Component)
```typescript
import { useWebSocket } from "@/hooks/useWebSocket";

const { isConnected, subscribe, unsubscribe } = useWebSocket({
  onBookingCreated: (data) => {
    // Handle new booking
  },
  onBookingUpdated: (data) => {
    // Handle booking update
  },
});

// Subscribe to club
subscribe(clubId);

// Cleanup
unsubscribe(clubId);
```

## Docker + Nginx

The implementation works seamlessly with Docker and Nginx. Ensure WebSocket upgrade headers are configured in Nginx:

```nginx
location / {
  proxy_pass http://app:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

## Development

Start server:
```bash
npm run dev
```

The server will:
1. Start Next.js on port 3000
2. Initialize Socket.IO with singleton pattern
3. Listen for WebSocket connections on `/api/socket`

## Testing

Open browser DevTools → Network → WS to verify:
- WebSocket connection to `/api/socket`
- Transport type: `websocket`
- Connection events in console

Check server logs:
```bash
docker logs -f arena_one_app
```

Expected logs:
- `[WebSocket] Socket.IO initialized on /api/socket`
- `[WebSocket] Client connected: {socket-id}`
- `[WebSocket] {socket-id} joined club:{clubId}:bookings`

## Security

Current implementation:
- Room isolation (no cross-club data)
- CORS configured for app domain
- Events only to subscribed clients
- WebSocket-only transport

Future enhancements:
- Authentication middleware
- Authorization for room subscription
- Rate limiting
- TLS/WSS in production
