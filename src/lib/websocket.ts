/**
 * WebSocket Event Helpers
 * 
 * Type-safe event emission for Socket.IO
 * Room naming: club:{clubId}:bookings
 */

import type { Server as SocketIOServer } from "socket.io";

export interface BookingEventPayload {
  id: string;
  clubId: string;
  courtId: string;
  userId: string;
  start: string;
  end: string;
  status: string;
  bookingStatus?: string;
  paymentStatus?: string;
  price: number;
  coachId?: string | null;
}

export interface CourtAvailabilityEventPayload {
  clubId: string;
  courtId: string;
  date: string;
  availableSlots?: Array<{
    start: string;
    end: string;
  }>;
}

/**
 * Emit booking created event to club room
 * @param io - Socket.IO server instance
 * @param clubId - Club identifier
 * @param booking - Booking event data
 */
export function emitBookingCreated(
  io: SocketIOServer | null,
  clubId: string,
  booking: BookingEventPayload
): void {
  if (!io) return;
  io.to(`club:${clubId}:bookings`).emit("booking:created", booking);
}

/**
 * Emit booking updated event to club room
 * @param io - Socket.IO server instance
 * @param clubId - Club identifier
 * @param booking - Booking event data
 */
export function emitBookingUpdated(
  io: SocketIOServer | null,
  clubId: string,
  booking: BookingEventPayload
): void {
  if (!io) return;
  io.to(`club:${clubId}:bookings`).emit("booking:updated", booking);
}

/**
 * Emit booking deleted event to club room
 * @param io - Socket.IO server instance
 * @param clubId - Club identifier
 * @param bookingId - Booking identifier
 */
export function emitBookingDeleted(
  io: SocketIOServer | null,
  clubId: string,
  bookingId: string
): void {
  if (!io) return;
  io.to(`club:${clubId}:bookings`).emit("booking:deleted", { id: bookingId, clubId });
}

/**
 * Emit court availability changed event to club room
 * @param io - Socket.IO server instance
 * @param clubId - Club identifier
 * @param data - Court availability data
 */
export function emitCourtAvailabilityChanged(
  io: SocketIOServer | null,
  clubId: string,
  data: CourtAvailabilityEventPayload
): void {
  if (!io) return;
  io.to(`club:${clubId}:bookings`).emit("court:availability", data);
}
