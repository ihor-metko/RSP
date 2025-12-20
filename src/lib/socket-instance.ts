/**
 * Socket.IO Server Singleton
 * 
 * Provides centralized Socket.IO server initialization and access.
 * Implements singleton pattern to prevent multiple instances.
 * 
 * This module ensures only one Socket.IO instance exists across
 * the application lifecycle, even during hot module reloads in development.
 */

import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

// Singleton instance
let io: SocketIOServer | null = null;
let attachedServer: HTTPServer | null = null;

/**
 * Type definition for Node.js global with Socket.io
 */
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

/**
 * Initialize Socket.IO server (singleton pattern)
 * 
 * This function is called once by server.js when the HTTP server starts.
 * It ensures only one Socket.IO instance exists, preventing duplicate
 * connections and event handlers.
 * 
 * @param httpServer - The HTTP server instance from Next.js
 * @returns Socket.IO server instance
 */
export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  // If already initialized with the same server, return existing instance
  if (io && attachedServer === httpServer) {
    if (process.env.NODE_ENV === "development") {
      console.log("[WebSocket] Socket.IO already initialized (singleton)");
    }
    return io;
  }

  // If server changed, close old instance
  if (io && attachedServer !== httpServer) {
    if (process.env.NODE_ENV === "development") {
      console.log("[WebSocket] HTTP server changed, reinitializing Socket.IO");
    }
    io.close();
    io = null;
  }

  // Create new Socket.IO server with websocket-only transport
  io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    transports: ["websocket"], // Websocket only - no polling fallback
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    addTrailingSlash: false,
  });

  // Store reference to the HTTP server
  attachedServer = httpServer;

  // Setup connection handlers
  setupSocketHandlers(io);

  // Store in global for backward compatibility with existing code
  // Note: This allows API routes to access io via getIO() function
  (global as { io?: SocketIOServer }).io = io;

  if (process.env.NODE_ENV === "development") {
    console.log("[WebSocket] Socket.IO server initialized");
    console.log("[WebSocket] Path: /api/socket");
    console.log("[WebSocket] Transport: websocket only");
  }

  return io;
}

/**
 * Setup Socket.IO event handlers
 * 
 * Handles connection events, room subscriptions, and disconnections.
 * Uses room-based architecture for club-specific channels.
 */
function setupSocketHandlers(io: SocketIOServer): void {
  io.on("connection", (socket) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
    }

    // Handle club room subscription
    socket.on("subscribe:club:bookings", (clubId: string) => {
      const room = `club:${clubId}:bookings`;
      socket.join(room);
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[WebSocket] Client ${socket.id} joined room: ${room}`);
      }
      
      socket.emit("subscribed", { room, clubId });
    });

    // Handle club room unsubscription
    socket.on("unsubscribe:club:bookings", (clubId: string) => {
      const room = `club:${clubId}:bookings`;
      socket.leave(room);
      
      if (process.env.NODE_ENV === "development") {
        console.log(`[WebSocket] Client ${socket.id} left room: ${room}`);
      }
      
      socket.emit("unsubscribed", { room, clubId });
    });

    socket.on("disconnect", () => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      }
    });
  });
}

/**
 * Get the Socket.IO server instance
 * 
 * Returns the singleton Socket.IO instance for emitting events from API routes.
 * 
 * @returns Socket.IO server instance or null if not initialized
 */
export function getIO(): SocketIOServer | null {
  // Return module-level singleton
  if (io) {
    return io;
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
  return io !== null;
}
