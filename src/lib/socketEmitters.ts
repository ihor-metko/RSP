import type {
  TypedServer,
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
  LockExpiredEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
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
  io.emit('booking_created', data); // New event name
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
  io.emit('booking_updated', data); // New event name
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
  io.emit('booking_cancelled', data); // New event name
  console.log('Emitted bookingDeleted event:', {
    bookingId: data.bookingId,
    clubId: data.clubId,
    courtId: data.courtId,
  });
}

/**
 * Emit a slot locked event to all connected clients
 */
export function emitSlotLocked(data: SlotLockedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('slot_locked', data);
  console.log('Emitted slot_locked event:', {
    slotId: data.slotId,
    courtId: data.courtId,
    clubId: data.clubId,
  });
}

/**
 * Emit a slot unlocked event to all connected clients
 */
export function emitSlotUnlocked(data: SlotUnlockedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('slot_unlocked', data);
  console.log('Emitted slot_unlocked event:', {
    slotId: data.slotId,
    courtId: data.courtId,
    clubId: data.clubId,
  });
}

/**
 * Emit a lock expired event to all connected clients
 */
export function emitLockExpired(data: LockExpiredEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('lock_expired', data);
  console.log('Emitted lock_expired event:', {
    slotId: data.slotId,
    courtId: data.courtId,
    clubId: data.clubId,
  });
}

/**
 * Emit a payment confirmed event to all connected clients
 */
export function emitPaymentConfirmed(data: PaymentConfirmedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('payment_confirmed', data);
  console.log('Emitted payment_confirmed event:', {
    paymentId: data.paymentId,
    bookingId: data.bookingId,
    amount: data.amount,
    currency: data.currency,
  });
}

/**
 * Emit a payment failed event to all connected clients
 */
export function emitPaymentFailed(data: PaymentFailedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  io.emit('payment_failed', data);
  console.log('Emitted payment_failed event:', {
    paymentId: data.paymentId,
    bookingId: data.bookingId,
    reason: data.reason,
  });
}
