/**
 * Socket.IO Server Instance Accessor
 * 
 * Provides access to the Socket.IO singleton instance
 * initialized in server.js for emitting events from API routes.
 */

import type { Server as SocketIOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

/**
 * Get the Socket.IO server instance
 * @returns Socket.IO server instance or null if not initialized
 * @example
 * const io = getIO();
 * if (io) {
 *   emitBookingCreated(io, clubId, booking);
 * }
 */
export function getIO(): SocketIOServer | null {
  return global.io || null;
}
