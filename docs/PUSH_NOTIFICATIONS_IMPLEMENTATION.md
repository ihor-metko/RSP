# Push Notifications Implementation via Socket.IO

## Overview

This document describes the implementation of real-time push notifications for booking events using Socket.IO. The system ensures that all connected clients receive instant updates when bookings are created, updated, or deleted.

## Implementation Date
December 20, 2024

## Requirements Met

✅ **Create server-side functions that trigger on booking events**: `createBooking`, `updateBooking`, `deleteBooking`

✅ **Emit Socket.IO messages to all connected clients** with event names:
- `bookingCreated`
- `bookingUpdated`
- `bookingDeleted`

✅ **Include full booking data payload** in emitted messages

✅ **Ensure emission only happens after database transaction is successfully committed**

✅ **Easy frontend subscription** via the unified socket architecture (`SocketProvider` + `GlobalSocketListener`)

## Architecture

### Server-Side Components

#### 1. Socket Emitter Functions (`src/lib/socketEmitters.ts`)
Pre-existing utility functions for emitting Socket.IO events:

- `emitBookingCreated(data: BookingCreatedEvent)` - Emits when a booking is created
- `emitBookingUpdated(data: BookingUpdatedEvent)` - Emits when a booking is updated
- `emitBookingDeleted(data: BookingDeletedEvent)` - Emits when a booking is deleted

These functions:
- Access the global Socket.IO instance
- Emit events to all connected clients
- Log events for debugging
- Gracefully handle cases where Socket.IO is not initialized

#### 2. Type Definitions (`src/types/socket.ts`)
Pre-existing type-safe event definitions:

```typescript
interface BookingCreatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
}

interface BookingUpdatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
  previousStatus?: string;
}

interface BookingDeletedEvent {
  bookingId: string;
  clubId: string;
  courtId: string;
}
```

### API Routes Modified

#### 1. Admin Booking Creation (`src/app/api/admin/bookings/create/route.ts`)
**Changes Made:**
- Import `emitBookingCreated` and required types
- After successful booking creation (both mock and database modes)
- Construct `OperationsBooking` object from the created booking
- Call `emitBookingCreated()` with full booking data

**Key Points:**
- Emission happens **after** database transaction commits
- Includes full booking details (user, court, club info)
- Works in both mock mode and production mode

#### 2. Admin Booking Update (`src/app/api/admin/bookings/[id]/route.ts`)
**Changes Made:**
- Import `emitBookingUpdated` and `emitBookingDeleted`
- On PATCH: Emit `bookingUpdated` after successful update
- NEW: Added DELETE endpoint that emits `bookingDeleted` after successful deletion

**Key Points:**
- PATCH updates (status changes, cancellations) trigger `bookingUpdated`
- DELETE operations trigger `bookingDeleted`
- Includes `previousStatus` in update events for tracking changes
- Both operations only emit after successful database commits

#### 3. Player Booking Creation (`src/app/api/(player)/bookings/route.ts`)
**Changes Made:**
- Import `emitBookingCreated` and required types
- Modified transaction to include user and court details
- Emit `bookingCreated` after transaction completes successfully

**Key Points:**
- Uses Prisma transaction for atomicity
- Emission happens **outside** the transaction (after commit)
- Fetches additional data (court name, club info) for complete event payload

### Client-Side Components

#### 1. SocketProvider (`src/contexts/SocketContext.tsx`)
Creates a single global socket connection shared across the entire app:

**Features:**
- Singleton socket connection
- Automatic reconnection handling
- Connection state tracking
- Safe cleanup on unmount

#### 2. GlobalSocketListener (`src/components/GlobalSocketListener.tsx`)
Centralized event dispatcher that handles all socket events:

**Features:**
- Listens to all booking events (created, updated, deleted/cancelled)
- Automatically updates Zustand booking store
- Displays toast notifications via `globalNotificationManager`
- Supports both new and legacy event names
- No duplicate event listeners

**Usage:**
The GlobalSocketListener is automatically included in the root layout. Components simply read from the booking store:

```typescript
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

function BookingsPage() {
  // Optional: Get connection status for UI indicator
  const { isConnected } = useSocket();
  
  // Read bookings from store - automatically updated by GlobalSocketListener
  const bookings = useBookingStore(state => state.bookings);
  const fetchBookings = useBookingStore(state => state.fetchBookingsForDay);
  
  useEffect(() => {
    fetchBookings(clubId, date);
  }, [clubId, date, fetchBookings]);
  
  // Bookings automatically update in real-time via GlobalSocketListener
  
  return (
    <div>
      {isConnected && <span>🟢 Live</span>}
      {bookings.map(b => <div key={b.id}>{b.courtName}</div>)}
    </div>
  );
}
```

#### 2. Example Component (`src/components/examples/BookingListWithWebSocket.tsx`)
Pre-existing example demonstrating WebSocket integration:

**Features:**
- Shows real-time connection status
- Displays last update notification
- Auto-refreshes booking list on events
- Filters events by club ID

**Minor Fix Applied:**
- Updated status comparisons to use correct `BookingStatus` enum values (`'Active'` instead of `'confirmed'`, `'Cancelled'` instead of `'cancelled'`)

## Event Flow

### Creating a Booking

```
User Action → API Route → Database Transaction → Transaction Commits → emitBookingCreated() → All Clients Receive Update
```

1. User submits booking request (admin or player)
2. API route validates and processes the request
3. Database transaction creates the booking
4. Transaction commits successfully
5. Server emits `bookingCreated` event with full booking data
6. All connected clients receive the event via Socket.IO
7. Client handlers refresh UI/update state

### Updating a Booking

```
Admin Updates → API Route → Database Update → Update Commits → emitBookingUpdated() → All Clients Receive Update
```

1. Admin updates booking (e.g., changes status to cancelled)
2. API validates update
3. Database updates booking
4. Update commits successfully
5. Server emits `bookingUpdated` with new and previous status
6. Clients receive update and refresh UI

### Deleting a Booking

```
Admin Deletes → API Route → Database Delete → Delete Commits → emitBookingDeleted() → All Clients Receive Update
```

1. Admin deletes booking via DELETE endpoint
2. API validates permissions
3. Database deletes booking
4. Delete commits successfully
5. Server emits `bookingDeleted` with booking ID and context
6. Clients remove booking from UI

## Data Consistency

### Transaction Safety
All emissions occur **after** database transactions commit, ensuring:
- No race conditions
- No phantom updates if transaction fails
- Clients never receive notifications for failed operations

### Full Data Payload
All events include complete booking information:
- Booking ID, status, times
- User information (name, email)
- Court and club information
- Payment status
- Sport type
- Coach information (if applicable)

## Testing

### Unit Tests
- `src/__tests__/socketEmitters.test.ts` - Tests for all emitter functions
- All tests pass ✅
- Coverage includes:
  - Successful emissions
  - Handling missing Socket.IO instance
  - Type safety validation

### Build Validation
- TypeScript compilation: ✅ Successful
- ESLint validation: ✅ No errors or warnings
- Next.js build: ✅ Successful

## Integration Points

### Backend
- `server.js` - Socket.IO server initialization
- `global.io` - Global Socket.IO instance available to all API routes
- Prisma transactions - Ensure atomic operations

### Frontend
- `SocketProvider` + `GlobalSocketListener` - Unified socket architecture
- Zustand stores - Automatically updated by GlobalSocketListener
- Example components - Reference implementation

## Performance Considerations

1. **Efficient Logging**: Only essential data logged to console
2. **No Blocking**: Emissions are fire-and-forget, don't block API responses
3. **Error Handling**: Gracefully handles Socket.IO unavailability
4. **Connection Management**: Automatic reconnection handled by Socket.IO

## Security Considerations

1. **Authentication**: API routes use existing auth middleware (`requireAnyAdmin`, `requireAuth`)
2. **Authorization**: Only authorized users can create/update/delete bookings
3. **Data Filtering**: Events include club/court IDs for client-side filtering
4. **No Sensitive Data**: Payment details excluded from broadcasts

## Future Enhancements (Optional)

1. **Room-based emissions**: Send events only to users subscribed to specific clubs
2. **Event throttling**: Batch multiple updates within a time window
3. **Offline queue**: Store events for clients that reconnect
4. **Event replay**: Allow clients to request missed events

## Files Modified

1. `src/app/api/admin/bookings/create/route.ts`
2. `src/app/api/admin/bookings/[id]/route.ts` (+ added DELETE endpoint)
3. `src/app/api/(player)/bookings/route.ts`
4. `src/__tests__/socketEmitters.test.ts` (fixed enum values)
5. `src/components/examples/BookingListWithWebSocket.tsx` (fixed status comparisons)

## Files Created

None - All infrastructure was pre-existing. Implementation focused on integrating existing components.

## Verification

### Manual Testing Checklist

To verify the implementation works:

1. **Start the server**: `npm run dev`
2. **Open multiple browser tabs** to the bookings page
3. **Create a booking** from one tab
4. **Verify**: Other tabs receive real-time update
5. **Update a booking** (e.g., cancel it)
6. **Verify**: All tabs show the updated status
7. **Delete a booking** (if using DELETE endpoint)
8. **Verify**: Booking disappears from all tabs

### Expected Behavior

- ✅ All connected clients receive updates instantly
- ✅ No page refresh needed to see changes
- ✅ Connection status indicator shows "connected"
- ✅ Console logs show emitted events
- ✅ No errors in server or client console

## Conclusion

The push notification system is now fully integrated and operational. All booking operations (create, update, delete) emit real-time events to connected clients, ensuring instant UI updates across all users.

The implementation leverages pre-existing Socket.IO infrastructure and follows the project's TypeScript, type-safety, and architectural patterns.
