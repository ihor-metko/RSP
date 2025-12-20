# Integration Guide: WebSocket Events in Booking APIs

This guide shows how to integrate WebSocket event broadcasting into existing booking API routes.

## Example: Booking Creation API

Add event emission to the booking creation endpoint:

```typescript
// src/app/api/admin/bookings/create/route.ts

import { emitBookingCreated } from '@/lib/socketEmitters';
import type { OperationsBooking } from '@/types/booking';

export async function POST(req: Request) {
  // ... existing authentication and validation code ...

  try {
    // Create booking in database
    const booking = await prisma.booking.create({
      // ... booking data ...
      include: {
        user: true,
        court: { include: { club: true } },
        coach: true,
      },
    });

    // Transform to OperationsBooking format
    const operationsBooking: OperationsBooking = {
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      courtId: booking.courtId,
      courtName: booking.court.name,
      clubId: booking.court.clubId,
      clubName: booking.court.club.name,
      start: booking.start.toISOString(),
      end: booking.end.toISOString(),
      bookingStatus: booking.status,
      paymentStatus: booking.paymentStatus,
      price: booking.price,
      sportType: booking.court.sportType,
      coachId: booking.coachId,
      coachName: booking.coach?.name || null,
      createdAt: booking.createdAt.toISOString(),
    };

    // 🔥 Emit WebSocket event to all connected clients
    emitBookingCreated({
      booking: operationsBooking,
      clubId: booking.court.clubId,
      courtId: booking.courtId,
    });

    return NextResponse.json(operationsBooking);
  } catch (error) {
    // ... error handling ...
  }
}
```

## Example: Booking Update API

Add event emission to the booking update endpoint:

```typescript
// src/app/api/admin/bookings/[id]/route.ts

import { emitBookingUpdated } from '@/lib/socketEmitters';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  // ... existing authentication and validation code ...

  try {
    const { status } = await req.json();
    
    // Get the previous booking state
    const previousBooking = await prisma.booking.findUnique({
      where: { id: params.id },
    });

    // Update booking in database
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
      include: {
        user: true,
        court: { include: { club: true } },
        coach: true,
      },
    });

    // Transform to OperationsBooking format
    const operationsBooking: OperationsBooking = {
      // ... same transformation as above ...
    };

    // 🔥 Emit WebSocket event
    emitBookingUpdated({
      booking: operationsBooking,
      clubId: booking.court.clubId,
      courtId: booking.courtId,
      previousStatus: previousBooking?.status,
    });

    return NextResponse.json(operationsBooking);
  } catch (error) {
    // ... error handling ...
  }
}
```

## Example: Booking Deletion

Add event emission when a booking is deleted:

```typescript
// In your booking deletion handler

import { emitBookingDeleted } from '@/lib/socketEmitters';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get booking details before deletion
    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { court: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Delete booking
    await prisma.booking.delete({
      where: { id: params.id },
    });

    // 🔥 Emit WebSocket event
    emitBookingDeleted({
      bookingId: booking.id,
      clubId: booking.court.clubId,
      courtId: booking.courtId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // ... error handling ...
  }
}
```

## Client-side Integration

In components that display booking lists, add the WebSocket hook:

```typescript
// src/app/(pages)/admin/clubs/[id]/operations/page.tsx

'use client';

import { useSocketIO } from '@/hooks/useSocketIO';
import { useBookingStore } from '@/stores/useBookingStore';

export default function ClubOperationsPage({ params }: { params: { id: string } }) {
  const { fetchBookingsForDay } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 🔥 Listen for real-time booking updates
  const { isConnected } = useSocketIO({
    onBookingCreated: (data) => {
      // Only refresh if it's for the current club and date
      if (data.clubId === params.id) {
        const bookingDate = data.booking.start.split('T')[0];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        
        if (bookingDate === selectedDateStr) {
          console.log('New booking received, refreshing...');
          fetchBookingsForDay(params.id, selectedDateStr);
        }
      }
    },
    
    onBookingUpdated: (data) => {
      if (data.clubId === params.id) {
        const bookingDate = data.booking.start.split('T')[0];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        
        if (bookingDate === selectedDateStr) {
          console.log('Booking updated, refreshing...');
          fetchBookingsForDay(params.id, selectedDateStr);
        }
      }
    },
    
    onBookingDeleted: (data) => {
      if (data.clubId === params.id) {
        console.log('Booking deleted, refreshing...');
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        fetchBookingsForDay(params.id, selectedDateStr);
      }
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1>Club Operations</h1>
        {isConnected ? (
          <span className="text-green-500">● Live</span>
        ) : (
          <span className="text-gray-500">● Offline</span>
        )}
      </div>
      {/* Rest of your component */}
    </div>
  );
}
```

## Best Practices

1. **Always emit after successful database operations**
   - Emit only after the transaction commits
   - Don't emit if the operation fails

2. **Include relevant filtering data**
   - Always include `clubId` and `courtId`
   - Clients can filter events they care about

3. **Handle graceful degradation**
   - WebSocket events are optional enhancements
   - Don't rely on them for critical functionality
   - Always have a fallback (polling, manual refresh)

4. **Test thoroughly**
   - Test with multiple clients connected
   - Verify events are received correctly
   - Check that filters work as expected

## Troubleshooting

### Events not being received on client

1. Check that the server is running via `npm run dev` or `npm start` (not `next dev`)
2. Verify Socket.IO is initialized: `curl http://localhost:3000/api/socket`
3. Check browser console for connection errors
4. Ensure event filtering logic is correct

### Events emitted but clients not updating

1. Verify the event handler is calling the correct store method
2. Check that the date/club filtering logic is working
3. Ensure the store's `fetchBookingsForDay` is actually making the request

## Performance Considerations

- WebSocket events are broadcast to **all** connected clients
- Clients filter events based on their current context (clubId, date)
- For large deployments, consider implementing room-based broadcasting
- Monitor Socket.IO server memory usage with many concurrent connections
