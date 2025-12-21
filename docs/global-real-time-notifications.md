# Global Real-Time Notifications System

## Overview

The Global Real-Time Notifications System provides real-time feedback to users for all important booking, slot lock, and payment events across the entire application. This MVP implementation shows toast notifications for all events regardless of the current page or route.

## Features

- **Real-time Updates**: Instant notifications via Socket.IO WebSocket connection
- **Multi-toast Support**: Displays up to 5 notifications simultaneously with automatic queuing
- **Duplicate Prevention**: Prevents duplicate notifications for the same event within a 5-second window
- **Auto-dismiss**: Notifications automatically disappear after 6 seconds
- **Non-blocking**: Toast notifications don't interrupt user workflow
- **Type-safe**: Full TypeScript support with typed events
- **Global Coverage**: Works on all pages without route-based conditions

## Supported Events

### Booking Events
- `booking_created` - New booking created (info toast)
- `booking_updated` - Booking updated (info toast)
- `booking_cancelled` - Booking cancelled (info toast)

### Slot Lock Events
- `slot_locked` - Court slot locked (info toast)
- `slot_unlocked` - Court slot unlocked (info toast)
- `lock_expired` - Slot lock expired (info toast)

### Payment Events
- `payment_confirmed` - Payment successful (success toast)
- `payment_failed` - Payment failed (error toast)

## Architecture

### Components

1. **GlobalSocketListener** (`src/components/GlobalSocketListener.tsx`)
   - Client-side component initialized once at app startup
   - Establishes Socket.IO connection
   - Subscribes to all real-time events
   - Delegates event handling to notification manager

2. **GlobalNotificationManager** (`src/utils/globalNotificationManager.ts`)
   - Singleton service managing notification display
   - Maps events to toast types
   - Prevents duplicate notifications
   - Handles event ID generation and cleanup

3. **Toast System** (`src/lib/toast.ts`)
   - Enhanced to support multiple simultaneous toasts
   - Automatic positioning and stacking
   - Smooth animations and transitions

### Backend Integration

**Socket Emitters** (`src/lib/socketEmitters.ts`)
```typescript
import { 
  emitBookingCreated, 
  emitBookingUpdated, 
  emitBookingDeleted,
  emitSlotLocked,
  emitSlotUnlocked,
  emitLockExpired,
  emitPaymentConfirmed,
  emitPaymentFailed
} from '@/lib/socketEmitters';

// Example: Emit a booking created event
emitBookingCreated({
  booking: bookingData,
  clubId: 'club-123',
  courtId: 'court-456',
});
```

## Usage

### For Developers

The system is already integrated into the root layout and requires no additional setup. All you need to do is emit events from your API routes when relevant actions occur.

#### Example: Emitting a Payment Confirmed Event

```typescript
// In your payment webhook handler
import { emitPaymentConfirmed } from '@/lib/socketEmitters';

export async function POST(request: Request) {
  // ... payment processing logic ...
  
  if (paymentSuccess) {
    emitPaymentConfirmed({
      paymentId: payment.id,
      bookingId: booking.id,
      amount: payment.amount,
      currency: payment.currency,
      clubId: booking.clubId,
    });
  }
  
  return Response.json({ success: true });
}
```

#### Example: Emitting a Slot Lock Event

```typescript
// In your slot locking endpoint
import { emitSlotLocked } from '@/lib/socketEmitters';

export async function POST(request: Request) {
  // ... slot locking logic ...
  
  emitSlotLocked({
    slotId: slot.id,
    courtId: slot.courtId,
    clubId: slot.clubId,
    userId: session.user.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
  });
  
  return Response.json({ locked: true });
}
```

### For Users

Users will automatically receive toast notifications when:
- A booking is created, updated, or cancelled
- A court slot is locked or unlocked
- A slot lock expires
- A payment is confirmed or fails

No action is required from users to enable this feature.

## Configuration

### Toast Duration

The default toast duration is 6 seconds. To change this, edit the `DEFAULT_DURATION` constant in `src/utils/globalNotificationManager.ts`:

```typescript
const DEFAULT_DURATION = 6000; // milliseconds
```

### Maximum Simultaneous Toasts

The maximum number of toasts displayed at once is 5. To change this, edit the `MAX_TOASTS` constant in `src/lib/toast.ts`:

```typescript
const MAX_TOASTS = 5;
```

### Duplicate Prevention Window

The duplicate prevention window is 5 seconds. To change this, edit the `DUPLICATE_WINDOW` property in `src/utils/globalNotificationManager.ts`:

```typescript
private readonly DUPLICATE_WINDOW = 5000; // milliseconds
```

## Event-to-Toast Type Mapping

| Event Type | Toast Type | Color |
|------------|------------|-------|
| booking_created | info | Blue |
| booking_updated | info | Blue |
| booking_cancelled | info | Blue |
| slot_locked | info | Blue |
| slot_unlocked | info | Blue |
| lock_expired | info | Blue |
| payment_confirmed | success | Green |
| payment_failed | error | Red |

## Future Enhancements

This MVP implementation can be extended with:

1. **Contextual Rules**: Show/hide notifications based on current route
2. **User Preferences**: Allow users to customize notification settings
3. **Notification History**: Store and display notification history
4. **Sound Effects**: Add audio cues for important notifications
5. **Rich Notifications**: Include action buttons (e.g., "View Booking")
6. **Notification Categories**: Filter notifications by type
7. **Silent Mode**: Temporarily disable notifications

## Testing

The system includes comprehensive tests:

- **Unit Tests**: `src/__tests__/globalNotificationManager.test.ts`
- **Integration Tests**: `src/__tests__/GlobalSocketListener.test.tsx`

Run tests with:
```bash
npm test -- globalNotificationManager.test.ts
npm test -- GlobalSocketListener.test.tsx
```

## Troubleshooting

### Notifications Not Appearing

1. Check that Socket.IO server is running
2. Verify WebSocket connection in browser DevTools (Network tab)
3. Check browser console for connection errors
4. Ensure events are being emitted from backend

### Duplicate Notifications

If you see duplicate notifications, check:
- Events are not being emitted multiple times from backend
- The duplicate prevention window (5 seconds) has elapsed

### Toast Overlap

If toasts overlap, check:
- Maximum toast limit is set appropriately
- Toast spacing constant in `src/lib/toast.ts`

## Performance Considerations

- Socket.IO connection is established once per session
- Duplicate prevention uses an in-memory Set (minimal memory impact)
- Toast elements are removed from DOM after dismissal
- No refetching of data (notification-only, no data sync)

## Browser Compatibility

Works on all modern browsers that support:
- WebSocket API
- ES6 JavaScript
- CSS Transitions
- DOM Manipulation

## Security

- No sensitive data in toast messages
- All events validated through TypeScript types
- Socket.IO connection uses standard security practices
- No user input in notification messages (XSS prevention)
