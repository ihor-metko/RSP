# WebSocket Event Handling & State Synchronization

## Overview

This document describes the enhanced WebSocket event handling and state synchronization system for the ArenaOne Operations page. The implementation ensures real-time updates with robust event validation, filtering, and consistency guarantees.

## Architecture

### Event Flow

```
Backend API → Socket.io Server → Client (useWebSocket) → Event Handler (useOperationsWebSocket) → Zustand Store → UI Update
```

1. **Backend API**: Performs booking/court operations and emits WebSocket events
2. **Socket.io Server**: Broadcasts events to subscribed clients in club-specific rooms
3. **Client WebSocket**: Receives raw events from server
4. **Event Handler**: Validates, filters, and normalizes events
5. **Zustand Store**: Updates application state immutably
6. **UI**: Automatically re-renders based on state changes

## Event Types

### Booking Events

#### `booking:created`
Emitted when a new booking is created.

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
  bookingStatus?: string;
  paymentStatus?: string;
  price: number;      // cents
  coachId?: string | null;
}
```

#### `booking:updated`
Emitted when a booking is updated or status changes.

**Payload:** Same as `booking:created`

#### `booking:deleted`
Emitted when a booking is deleted or cancelled.

**Payload:**
```typescript
{
  id: string;
  clubId: string;
}
```

### Court Events

#### `court:availability`
Emitted when court availability changes (status, price, or deletion).

**Payload:**
```typescript
{
  clubId: string;
  courtId: string;
  date: string;       // YYYY-MM-DD
  availableSlots?: Array<{
    start: string;
    end: string;
  }>;
}
```

## Event Handling Features

### 1. Payload Validation

All event handlers validate incoming data before processing:

```typescript
// Example validation
if (!data || !data.id || !data.clubId) {
  console.warn("[Operations WebSocket] Invalid payload:", data);
  return;
}
```

**Validation Checks:**
- Required fields present (id, clubId, etc.)
- Data types are correct
- Graceful handling of malformed payloads

### 2. Club-Based Filtering

Events are filtered to ensure only events for the currently active club are processed:

```typescript
// Filter by active club
if (clubId && data.clubId !== clubId) {
  console.log("[Operations WebSocket] Ignoring event from different club:", data.clubId);
  return;
}
```

**Benefits:**
- Prevents cross-club data pollution
- Reduces unnecessary store updates
- Improves performance

### 3. Stale Event Prevention

The system tracks event timestamps to prevent outdated events from overriding newer state:

```typescript
// Store tracks last event timestamp per booking
_lastEventTimestamp: Record<string, number>

// Check for stale events
const lastTimestamp = state._lastEventTimestamp[booking.id] || 0;
if (now < lastTimestamp) {
  console.warn("[Booking Store] Ignoring stale event:", booking.id);
  return state;
}
```

**Scenarios Handled:**
- Network delays causing out-of-order delivery
- Multiple rapid updates to the same booking
- Race conditions between API responses and WebSocket events

### 4. Duplicate Prevention

The `addBookingFromEvent` method checks for existing bookings to prevent duplicates:

```typescript
// Check if booking already exists
const existingIndex = state.bookings.findIndex((b) => b.id === booking.id);

if (existingIndex >= 0) {
  // Merge update instead of adding
  console.log("[Booking Store] Booking already exists, merging update");
  // ... merge logic
}
```

### 5. Immutable State Updates

All store updates follow immutability principles:

```typescript
// Immutable update example
const newBookings = [...state.bookings];
newBookings[existingIndex] = { ...newBookings[existingIndex], ...booking };
return { 
  bookings: newBookings,
  _lastEventTimestamp: { ...state._lastEventTimestamp, [booking.id]: now }
};
```

**Benefits:**
- Predictable state changes
- Better React rendering optimization
- Easier debugging and time-travel debugging

## Store Methods

### Booking Store Event Handlers

#### `addBookingFromEvent(booking)`

Handles new booking creation events.

**Behavior:**
1. Validates event timestamp to prevent stale updates
2. Checks for existing booking (duplicate prevention)
3. If exists, merges update instead of adding
4. If new, triggers refetch to get complete data (including user/court names)
5. Updates timestamp tracking

**Why Refetch for New Bookings?**
WebSocket events contain only core booking data (IDs, times, status) but not display information like user names, court names, etc. To ensure the UI has complete data, we trigger a refetch when a new booking is detected.

#### `updateBookingFromEvent(booking)`

Handles booking update events.

**Behavior:**
1. Validates event timestamp
2. Finds existing booking in store
3. Merges new data immutably
4. Updates timestamp tracking
5. Silently ignores if booking not in current view

#### `removeBookingFromEvent(bookingId)`

Handles booking deletion events.

**Behavior:**
1. Validates event timestamp
2. Checks if booking exists in current view
3. Removes booking immutably if found
4. Updates timestamp tracking

## Usage Example

### In Operations Page

```typescript
import { useOperationsWebSocket } from "@/hooks/useOperationsWebSocket";

function OperationsPage({ clubId }: { clubId: string }) {
  // Initialize WebSocket connection
  const { isConnected, isConnecting, error } = useOperationsWebSocket({
    clubId,
    enabled: true, // Enable WebSocket
  });

  // Store automatically updates on events
  const bookings = useBookingStore(state => state.bookings);
  
  // UI automatically re-renders when bookings change
  return (
    <div>
      <ConnectionStatusIndicator 
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={error}
      />
      <BookingCalendar bookings={bookings} />
    </div>
  );
}
```

### Custom Event Handling

For advanced use cases, you can use the base `useWebSocket` hook directly:

```typescript
import { useWebSocket } from "@/hooks/useWebSocket";

const { isConnected, subscribe, unsubscribe } = useWebSocket({
  onBookingCreated: (data) => {
    console.log('New booking:', data);
    // Custom handling
  },
  onBookingUpdated: (data) => {
    console.log('Updated booking:', data);
    // Custom handling
  },
  onBookingDeleted: (data) => {
    console.log('Deleted booking:', data);
    // Custom handling
  },
}, {
  autoConnect: true,
});

// Subscribe to specific club
useEffect(() => {
  if (clubId && isConnected) {
    subscribe(clubId);
    return () => unsubscribe(clubId);
  }
}, [clubId, isConnected, subscribe, unsubscribe]);
```

## Error Handling

### Malformed Payloads

Invalid payloads are caught early and logged:

```typescript
if (!data || !data.id || !data.clubId) {
  console.warn("[Operations WebSocket] Invalid payload:", data);
  return; // Silently ignore
}
```

### Connection Errors

Connection errors are tracked in the WebSocket state:

```typescript
const { error } = useOperationsWebSocket({ clubId, enabled: true });

if (error) {
  // Show error indicator to user
  return <ErrorBanner message={error} />;
}
```

### Event Processing Errors

Errors during event processing are logged but don't crash the app:

```typescript
onError: (error: Error) => {
  console.error("[Operations WebSocket] Error:", error);
  // Application continues to function
}
```

## Performance Considerations

### Reduced API Calls

WebSocket replaces polling, reducing API calls by ~90%:

**Before (Polling):**
- Poll every 15 seconds
- ~240 requests per hour per user

**After (WebSocket):**
- Initial fetch on page load
- Event-driven updates only
- ~1-10 events per hour per user

### Optimized Updates

- Events filtered by club reduce unnecessary processing
- Immutable updates enable React rendering optimization
- Stale event prevention avoids redundant updates

### Memory Management

- Timestamp tracking uses a simple object (not a Map)
- Old timestamps naturally pruned when bookings removed
- No memory leaks from event listeners (cleanup on unmount)

## Testing

### Unit Tests

Test coverage includes:

1. **Store Event Handlers**
   - Validation logic
   - Stale event prevention
   - Duplicate prevention
   - Immutable updates

2. **WebSocket Hook**
   - Event filtering by club
   - Payload validation
   - Error handling

3. **Integration**
   - Operations page with WebSocket
   - Connection status indicators
   - No polling when WebSocket active

### Manual Testing

1. **Real-time Updates**
   - Create booking → UI updates instantly
   - Update booking → Changes appear immediately
   - Cancel booking → Removed from calendar

2. **Multi-User**
   - Open same club in two tabs
   - Create booking in tab 1
   - Verify appears in tab 2

3. **Network Issues**
   - Disconnect network
   - Verify connection indicator shows error
   - Reconnect network
   - Verify auto-reconnection and sync

## Troubleshooting

### Events Not Received

**Check:**
1. WebSocket connection status (`isConnected`)
2. Correct club subscription (`subscribedClubId`)
3. User has access to the club
4. Backend emitting events correctly

**Debug:**
```typescript
// Enable verbose logging
const { isConnected, subscribedClubId } = useOperationsWebSocket({ 
  clubId, 
  enabled: true 
});

console.log('WebSocket connected:', isConnected);
console.log('Subscribed to club:', subscribedClubId);
```

### Stale Data

**Check:**
1. Initial fetch on page load completes
2. No errors in event processing
3. Timestamp tracking working correctly

**Solution:**
```typescript
// Force refetch if needed
const { invalidateBookings } = useBookingStore();
invalidateBookings();
```

### Duplicate Bookings

**Should Not Happen** - The system prevents duplicates via:
1. Duplicate detection in `addBookingFromEvent`
2. Merge updates instead of adding
3. Event deduplication at Socket.io level

If duplicates occur, check:
1. Multiple WebSocket connections
2. Mixed WebSocket + polling (shouldn't happen)
3. Race conditions in custom code

## Best Practices

### DO ✅

- Use `useOperationsWebSocket` for Operations page
- Let the store handle all event processing
- Trust the validation and filtering logic
- Use connection status indicators for UX

### DON'T ❌

- Mix WebSocket with polling (use one or the other)
- Process events directly in components
- Bypass validation and filtering
- Modify store state directly (always use actions)

## Migration Notes

### From Polling to WebSocket

If migrating a page from polling to WebSocket:

1. **Remove** polling logic:
   ```typescript
   // REMOVE
   startPolling(clubId, selectedDate, 15000);
   ```

2. **Add** WebSocket hook:
   ```typescript
   // ADD
   const { isConnected } = useOperationsWebSocket({ 
     clubId, 
     enabled: true 
   });
   ```

3. **Keep** initial fetch:
   ```typescript
   // KEEP - needed for page load
   useEffect(() => {
     fetchBookingsForDay(clubId, selectedDate);
   }, [clubId, selectedDate]);
   ```

## Future Enhancements

Potential improvements for future consideration:

1. **Optimistic Updates**
   - Update UI immediately on user action
   - Rollback on WebSocket error
   - Better perceived performance

2. **Event Batching**
   - Batch multiple events for single store update
   - Reduce re-render frequency
   - Better for high-frequency events

3. **Presence Indicators**
   - Show who else is viewing the page
   - Real-time collaboration features
   - Conflict detection

4. **Offline Support**
   - Queue events when offline
   - Replay on reconnection
   - Sync conflict resolution

## Related Documentation

- [WebSocket Backend Setup](./websocket-backend-setup.md)
- [WebSocket Frontend Integration](./WEBSOCKET_FRONTEND_INTEGRATION.md)
- [Booking Store](../src/stores/useBookingStore.ts)
- [Operations WebSocket Hook](../src/hooks/useOperationsWebSocket.ts)

## Summary

The enhanced WebSocket event handling system provides:

✅ **Robust validation** - All payloads validated before processing
✅ **Smart filtering** - Events filtered by active club
✅ **Consistency** - Stale event prevention ensures correct state
✅ **Safety** - Duplicate prevention and immutable updates
✅ **Performance** - ~90% reduction in API calls vs polling
✅ **Reliability** - Graceful error handling and auto-reconnection
✅ **Maintainability** - Centralized, reusable, and well-tested

The Operations page now provides a true real-time experience with instant updates and no manual refresh required.
