import type {
  TypedServer,
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
} from '@/types/socket';

/**
 * Socket.IO Event Emitter Utilities
 * 
 * Provides helper functions to emit real-time events from API routes
 */

/**
 * Get the Socket.IO server instance
 */
export function getSocketIO(): TypedServer | null {
  if (!global.io) {
    console.warn('Socket.IO server not initialized');
    return null;
  }
  return global.io;
}

/**
 * Emit a booking created event to all connected clients
 */
export function emitBookingCreated(data: BookingCreatedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('bookingCreated', data);
  console.log('Emitted bookingCreated event:', {
    bookingId: data.booking.id,
    clubId: data.clubId,
    courtId: data.courtId,
  });
}

/**
 * Emit a booking updated event to all connected clients
 */
export function emitBookingUpdated(data: BookingUpdatedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('bookingUpdated', data);
  console.log('Emitted bookingUpdated event:', {
    bookingId: data.booking.id,
    clubId: data.clubId,
    courtId: data.courtId,
    status: data.booking.bookingStatus,
  });
}

/**
 * Emit a booking deleted event to all connected clients
 */
export function emitBookingDeleted(data: BookingDeletedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('bookingDeleted', data);
  console.log('Emitted bookingDeleted event:', {
    bookingId: data.bookingId,
    clubId: data.clubId,
    courtId: data.courtId,
  });
}
