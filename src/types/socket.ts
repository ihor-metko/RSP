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
 * Client to Server events
 * Reserved for future client-initiated events
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClientToServerEvents {}

/**
 * Server to Client events
 */
export interface ServerToClientEvents {
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
