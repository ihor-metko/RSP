/**
 * WebSocket Event Types and Helper Functions
 * 
 * Provides type-safe event payloads and helper functions for emitting
 * Socket.IO events to club-specific rooms.
 * 
 * Room naming convention: club:{clubId}:bookings
 * 
 * Events:
 * - booking:created - New booking created
 * - booking:updated - Booking updated
 * - booking:deleted - Booking deleted/cancelled
 * - court:availability - Court availability changed
 */

import type { Server as SocketIOServer } from "socket.io";

// Event payload types
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
 */
export function emitBookingCreated(
  io: SocketIOServer | null,
  clubId: string,
  booking: BookingEventPayload
): void {
  if (!io) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[WebSocket] Cannot emit booking:created - server not initialized");
    }
    return;
  }

  const room = `club:${clubId}:bookings`;
  io.to(room).emit("booking:created", booking);

  if (process.env.NODE_ENV === "development") {
    console.log(`[WebSocket] Emitted booking:created to room ${room}:`, booking.id);
  }
}

/**
 * Emit booking updated event to club room
 */
export function emitBookingUpdated(
  io: SocketIOServer | null,
  clubId: string,
  booking: BookingEventPayload
): void {
  if (!io) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[WebSocket] Cannot emit booking:updated - server not initialized");
    }
    return;
  }

  const room = `club:${clubId}:bookings`;
  io.to(room).emit("booking:updated", booking);

  if (process.env.NODE_ENV === "development") {
    console.log(`[WebSocket] Emitted booking:updated to room ${room}:`, booking.id);
  }
}

/**
 * Emit booking deleted event to club room
 */
export function emitBookingDeleted(
  io: SocketIOServer | null,
  clubId: string,
  bookingId: string
): void {
  if (!io) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[WebSocket] Cannot emit booking:deleted - server not initialized");
    }
    return;
  }

  const room = `club:${clubId}:bookings`;
  io.to(room).emit("booking:deleted", { id: bookingId, clubId });

  if (process.env.NODE_ENV === "development") {
    console.log(`[WebSocket] Emitted booking:deleted to room ${room}:`, bookingId);
  }
}

/**
 * Emit court availability changed event to club room
 */
export function emitCourtAvailabilityChanged(
  io: SocketIOServer | null,
  clubId: string,
  data: CourtAvailabilityEventPayload
): void {
  if (!io) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[WebSocket] Cannot emit court:availability - server not initialized");
    }
    return;
  }

  const room = `club:${clubId}:bookings`;
  io.to(room).emit("court:availability", data);

  if (process.env.NODE_ENV === "development") {
    console.log(`[WebSocket] Emitted court:availability to room ${room}:`, data.courtId);
  }
}
