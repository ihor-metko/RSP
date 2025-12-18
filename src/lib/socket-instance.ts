/**
 * Socket.io Instance Helper
 * 
 * Provides access to the global Socket.io server instance
 * initialized in the custom server (server.js).
 * 
 * This module allows API routes to emit WebSocket events
 * without needing direct access to the HTTP server.
 */

import type { Server as SocketIOServer } from "socket.io";

/**
 * Type definition for Node.js global with Socket.io
 */
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

/**
 * Get the Socket.io server instance
 * 
 * Returns the global io instance if available, otherwise null.
 * The io instance is set by server.js when the custom server starts.
 * 
 * @returns Socket.io server instance or null
 */
export function getIO(): SocketIOServer | null {
  if (typeof global.io !== "undefined") {
    return global.io;
  }
  
  // In development, log a warning if io is not available
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[Socket.io] Server instance not available. Make sure you're running the custom server (npm run dev)."
    );
  }
  
  return null;
}

/**
 * Check if Socket.io server is initialized
 */
export function isIOInitialized(): boolean {
  return typeof global.io !== "undefined";
}
