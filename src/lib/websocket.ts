/**
 * WebSocket Server Singleton
 * 
 * Manages Socket.io server instance for real-time updates.
 * Implements room-based architecture for club-specific channels.
 * 
 * Room naming convention: club:{clubId}:bookings
 * 
 * Events:
 * - booking:created - New booking created
 * - booking:updated - Booking updated
 * - booking:deleted - Booking deleted/cancelled
 * - court:availability - Court availability changed
 */

import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Server as NetServer, Socket } from "net";

// Type for custom Next.js HTTP server with Socket.io attached
export type NextServerWithIO = HTTPServer & {
  io?: SocketIOServer;
};

// Type for Next.js socket with io attached
export type SocketWithIO = Socket & {
  server: NetServer & {
    io?: SocketIOServer;
  };
};

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
 * Initialize Socket.io server
 * This should be called once when the WebSocket route is first accessed
 */
export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    addTrailingSlash: false,
  });

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

  if (process.env.NODE_ENV === "development") {
    console.log("[WebSocket] Socket.io server initialized");
  }

  return io;
}

/**
 * Get the global Socket.io server instance
 * Returns null if not yet initialized
 */
let globalIoInstance: SocketIOServer | null = null;

export function getSocketServer(): SocketIOServer | null {
  return globalIoInstance;
}

export function setSocketServer(io: SocketIOServer): void {
  globalIoInstance = io;
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
