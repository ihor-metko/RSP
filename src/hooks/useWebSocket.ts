/**
 * useWebSocket Hook
 * 
 * A reusable WebSocket client setup using socket.io-client.
 * Manages connection lifecycle, subscription to club channels,
 * and event handling for real-time updates.
 * 
 * Features:
 * - Auto-connect on mount
 * - Auto-disconnect on unmount
 * - Club channel subscription/unsubscription
 * - Connection state tracking
 * - Event handlers for booking and court events
 * - Automatic reconnection
 * 
 * Usage:
 * ```tsx
 * const { isConnected, subscribe, unsubscribe } = useWebSocket({
 *   onBookingCreated: (data) => console.log('New booking', data),
 *   onBookingUpdated: (data) => console.log('Updated booking', data),
 *   onBookingDeleted: (data) => console.log('Deleted booking', data),
 *   onCourtAvailability: (data) => console.log('Court availability changed', data),
 * });
 * 
 * // Subscribe to a club's channel
 * subscribe('club-id-123');
 * 
 * // Unsubscribe when done
 * unsubscribe('club-id-123');
 * ```
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { BookingEventPayload, CourtAvailabilityEventPayload } from "@/lib/websocket";

/**
 * WebSocket event handlers
 */
export interface WebSocketEventHandlers {
  onBookingCreated?: (data: BookingEventPayload) => void;
  onBookingUpdated?: (data: BookingEventPayload) => void;
  onBookingDeleted?: (data: { id: string; clubId: string }) => void;
  onCourtAvailability?: (data: CourtAvailabilityEventPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket connection state
 */
export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  subscribedClubs: Set<string>;
}

/**
 * WebSocket hook return type
 */
export interface UseWebSocketReturn extends WebSocketState {
  subscribe: (clubId: string) => void;
  unsubscribe: (clubId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * useWebSocket Hook
 * 
 * @param handlers - Event handlers for WebSocket events
 * @param options - Configuration options
 * @returns WebSocket state and control functions
 */
export function useWebSocket(
  handlers: WebSocketEventHandlers = {},
  options: {
    autoConnect?: boolean;
    path?: string;
  } = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    path = "/api/socket",
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    subscribedClubs: new Set<string>(),
  });

  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socket = io("/", {
        path,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      // Connection event handlers
      socket.on("connect", () => {
        console.log("[WebSocket] Connected:", socket.id);
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        handlersRef.current.onConnect?.();
      });

      socket.on("disconnect", (reason) => {
        console.log("[WebSocket] Disconnected:", reason);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        handlersRef.current.onDisconnect?.();
      });

      socket.on("connect_error", (error) => {
        console.error("[WebSocket] Connection error:", error);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message,
        }));
        handlersRef.current.onError?.(error);
      });

      // Booking events
      socket.on("booking:created", (data: BookingEventPayload) => {
        console.log("[WebSocket] Booking created:", data.id);
        handlersRef.current.onBookingCreated?.(data);
      });

      socket.on("booking:updated", (data: BookingEventPayload) => {
        console.log("[WebSocket] Booking updated:", data.id);
        handlersRef.current.onBookingUpdated?.(data);
      });

      socket.on("booking:deleted", (data: { id: string; clubId: string }) => {
        console.log("[WebSocket] Booking deleted:", data.id);
        handlersRef.current.onBookingDeleted?.(data);
      });

      // Court availability events
      socket.on("court:availability", (data: CourtAvailabilityEventPayload) => {
        console.log("[WebSocket] Court availability changed:", data.courtId);
        handlersRef.current.onCourtAvailability?.(data);
      });

      socketRef.current = socket;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect";
      console.error("[WebSocket] Connection failed:", errorMessage);
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [path]);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("[WebSocket] Disconnecting...");
      socketRef.current.disconnect();
      socketRef.current = null;
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        subscribedClubs: new Set<string>(),
      }));
    }
  }, []);

  /**
   * Subscribe to a club's booking channel
   */
  const subscribe = useCallback((clubId: string) => {
    if (!socketRef.current?.connected) {
      console.warn("[WebSocket] Cannot subscribe: not connected");
      return;
    }

    console.log("[WebSocket] Subscribing to club:", clubId);
    socketRef.current.emit("subscribe:club:bookings", clubId);

    setState((prev) => {
      const newSubscribedClubs = new Set(prev.subscribedClubs);
      newSubscribedClubs.add(clubId);
      return { ...prev, subscribedClubs: newSubscribedClubs };
    });
  }, []);

  /**
   * Unsubscribe from a club's booking channel
   */
  const unsubscribe = useCallback((clubId: string) => {
    if (!socketRef.current?.connected) {
      console.warn("[WebSocket] Cannot unsubscribe: not connected");
      return;
    }

    console.log("[WebSocket] Unsubscribing from club:", clubId);
    socketRef.current.emit("unsubscribe:club:bookings", clubId);

    setState((prev) => {
      const newSubscribedClubs = new Set(prev.subscribedClubs);
      newSubscribedClubs.delete(clubId);
      return { ...prev, subscribedClubs: newSubscribedClubs };
    });
  }, []);

  /**
   * Reconnect WebSocket with configurable delay
   */
  const reconnect = useCallback((delayMs = 100) => {
    disconnect();
    setTimeout(connect, delayMs);
  }, [connect, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
  };
}
