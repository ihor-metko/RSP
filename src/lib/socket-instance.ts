/**
 * Socket.IO Server Instance Accessor
 * 
 * Provides access to the Socket.IO server instance initialized in server.js.
 * This module allows API routes to emit WebSocket events without direct access
 * to the HTTP server.
 * 
 * The Socket.IO server is initialized as a singleton in server.js and stored
 * in the global object for access across the application.
 */

import type { Server as SocketIOServer } from "socket.io";

/**
 * Type definition for Node.js global with Socket.IO
 */
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

/**
 * Get the Socket.IO server instance
 * 
 * Returns the singleton Socket.IO instance for emitting events from API routes.
 * The instance is initialized in server.js when the HTTP server starts.
 * 
 * @returns Socket.IO server instance or null if not initialized
 */
export function getIO(): SocketIOServer | null {
  if (typeof global.io !== "undefined") {
    return global.io;
  }
  
  // In development, log a warning if io is not available
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[Socket.IO] Server instance not available. Make sure you're running with 'npm run dev' or 'npm start'."
    );
  }
  
  return null;
}

/**
 * Check if Socket.IO server is initialized
 */
export function isIOInitialized(): boolean {
  return typeof global.io !== "undefined";
}
