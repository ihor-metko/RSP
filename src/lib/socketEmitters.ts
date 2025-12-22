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
 * Provides helper functions to emit real-time events from API routes.
 * Events are emitted to specific rooms based on club/organization membership.
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
 * Emit a booking created event to authorized clients only
 * Emits to: club room, organization room (if applicable), and root admins
 */
export function emitBookingCreated(data: BookingCreatedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('booking_created', data);
  
  // Also emit legacy event for backward compatibility
  io.to(clubRoom).emit('bookingCreated', data);

  console.log('Emitted booking_created event to room:', {
    room: clubRoom,
    bookingId: data.booking.id,
    clubId: data.clubId,
    courtId: data.courtId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('booking_created', data);
  io.to('root_admin').emit('bookingCreated', data);
}

/**
 * Emit a booking updated event to authorized clients only
 * Emits to: club room, organization room (if applicable), and root admins
 */
export function emitBookingUpdated(data: BookingUpdatedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('booking_updated', data);
  
  // Also emit legacy event for backward compatibility
  io.to(clubRoom).emit('bookingUpdated', data);

  console.log('Emitted booking_updated event to room:', {
    room: clubRoom,
    bookingId: data.booking.id,
    clubId: data.clubId,
    courtId: data.courtId,
    status: data.booking.bookingStatus,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('booking_updated', data);
  io.to('root_admin').emit('bookingUpdated', data);
}

/**
 * Emit a booking deleted event to authorized clients only
 * Emits to: club room, organization room (if applicable), and root admins
 */
export function emitBookingDeleted(data: BookingDeletedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('booking_cancelled', data);
  
  // Also emit legacy event for backward compatibility
  io.to(clubRoom).emit('bookingDeleted', data);

  console.log('Emitted booking_cancelled event to room:', {
    room: clubRoom,
    bookingId: data.bookingId,
    clubId: data.clubId,
    courtId: data.courtId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('booking_cancelled', data);
  io.to('root_admin').emit('bookingDeleted', data);
}

/**
 * Emit a slot locked event to authorized clients only
 * Emits to: club room and root admins
 */
export function emitSlotLocked(data: SlotLockedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('slot_locked', data);

  console.log('Emitted slot_locked event to room:', {
    room: clubRoom,
    slotId: data.slotId,
    courtId: data.courtId,
    clubId: data.clubId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('slot_locked', data);
}

/**
 * Emit a slot unlocked event to authorized clients only
 * Emits to: club room and root admins
 */
export function emitSlotUnlocked(data: SlotUnlockedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('slot_unlocked', data);

  console.log('Emitted slot_unlocked event to room:', {
    room: clubRoom,
    slotId: data.slotId,
    courtId: data.courtId,
    clubId: data.clubId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('slot_unlocked', data);
}

/**
 * Emit a lock expired event to authorized clients only
 * Emits to: club room and root admins
 */
export function emitLockExpired(data: LockExpiredEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('lock_expired', data);

  console.log('Emitted lock_expired event to room:', {
    room: clubRoom,
    slotId: data.slotId,
    courtId: data.courtId,
    clubId: data.clubId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('lock_expired', data);
}

/**
 * Emit a payment confirmed event to authorized clients only
 * Emits to: club room and root admins
 */
export function emitPaymentConfirmed(data: PaymentConfirmedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('payment_confirmed', data);

  console.log('Emitted payment_confirmed event to room:', {
    room: clubRoom,
    paymentId: data.paymentId,
    bookingId: data.bookingId,
    amount: data.amount,
    currency: data.currency,
    clubId: data.clubId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('payment_confirmed', data);
}

/**
 * Emit a payment failed event to authorized clients only
 * Emits to: club room and root admins
 */
export function emitPaymentFailed(data: PaymentFailedEvent): void {
  const io = getSocketIO();
  if (!io) return;

  // Emit to club room
  const clubRoom = `club:${data.clubId}`;
  io.to(clubRoom).emit('payment_failed', data);

  console.log('Emitted payment_failed event to room:', {
    room: clubRoom,
    paymentId: data.paymentId,
    bookingId: data.bookingId,
    reason: data.reason,
    clubId: data.clubId,
  });
  
  // Emit to root admins
  io.to('root_admin').emit('payment_failed', data);
}
