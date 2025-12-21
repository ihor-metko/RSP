import type { Server as SocketIOServer, Socket } from 'socket.io';
import type { OperationsBooking } from './booking';

/**
 * Socket.IO Event Types
 * 
 * Defines all real-time events that can be emitted/received through WebSocket
 */

/**
 * Booking event payloads
 */
export interface BookingCreatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
}

export interface BookingUpdatedEvent {
  booking: OperationsBooking;
  clubId: string;
  courtId: string;
  previousStatus?: string;
}

export interface BookingDeletedEvent {
  bookingId: string;
  clubId: string;
  courtId: string;
}

/**
 * Slot lock event payloads
 */
export interface SlotLockedEvent {
  slotId: string;
  courtId: string;
  clubId: string;
  userId?: string;
  startTime: string;
  endTime: string;
}

export interface SlotUnlockedEvent {
  slotId: string;
  courtId: string;
  clubId: string;
}

export interface LockExpiredEvent {
  slotId: string;
  courtId: string;
  clubId: string;
}

/**
 * Payment event payloads
 */
export interface PaymentConfirmedEvent {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  clubId: string;
}

export interface PaymentFailedEvent {
  paymentId: string;
  bookingId: string;
  reason: string;
  clubId: string;
}

/**
 * Admin notification event payload
 * 
 * Supports both training request notifications and booking/payment event notifications.
 * All admin-relevant events (Training, Booking, Payment) flow through this unified type.
 */
export interface AdminNotificationEvent {
  id: string;
  type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED" | "BOOKING_CREATED" | "BOOKING_UPDATED" | "BOOKING_CANCELLED" | "PAYMENT_CONFIRMED" | "PAYMENT_FAILED";
  playerId: string;
  playerName?: string;
  playerEmail?: string | null;
  coachId: string;
  coachName?: string;
  trainingRequestId: string | null;
  bookingId: string | null;
  sessionDate: string | null;
  sessionTime: string | null;
  courtInfo: string | null;
  summary?: string;
  read: boolean;
  createdAt: string;
  // Optional fields for payment notifications
  paymentId?: string | null;
  amount?: number | null;
  currency?: string | null;
  paymentReason?: string | null;
}

/**
 * Client to Server events
 * Reserved for future client-initiated events
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClientToServerEvents {}

/**
 * Server to Client events
 */
export interface ServerToClientEvents {
  booking_created: (data: BookingCreatedEvent) => void;
  booking_updated: (data: BookingUpdatedEvent) => void;
  booking_cancelled: (data: BookingDeletedEvent) => void;
  slot_locked: (data: SlotLockedEvent) => void;
  slot_unlocked: (data: SlotUnlockedEvent) => void;
  lock_expired: (data: LockExpiredEvent) => void;
  payment_confirmed: (data: PaymentConfirmedEvent) => void;
  payment_failed: (data: PaymentFailedEvent) => void;
  admin_notification: (data: AdminNotificationEvent) => void;
  // Legacy event names for backward compatibility
  bookingCreated: (data: BookingCreatedEvent) => void;
  bookingUpdated: (data: BookingUpdatedEvent) => void;
  bookingDeleted: (data: BookingDeletedEvent) => void;
}

/**
 * Socket data (attached to each socket connection)
 */
export interface SocketData {
  userId?: string;
  clubId?: string;
}

/**
 * Typed Socket.IO Server
 */
export type TypedServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  never,
  SocketData
>;

/**
 * Typed Socket.IO Socket
 */
export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  never,
  SocketData
>;

/**
 * Global declaration for io instance
 */
declare global {
  // eslint-disable-next-line no-var
  var io: TypedServer | undefined;
}

export {};
