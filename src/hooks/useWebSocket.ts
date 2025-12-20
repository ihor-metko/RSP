/**
 * useWebSocket Hook
 * 
 * Manages WebSocket connection lifecycle and club channel subscriptions.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { BookingEventPayload, CourtAvailabilityEventPayload } from "@/lib/websocket";

export interface WebSocketEventHandlers {
  onBookingCreated?: (data: BookingEventPayload) => void;
  onBookingUpdated?: (data: BookingEventPayload) => void;
  onBookingDeleted?: (data: { id: string; clubId: string }) => void;
  onCourtAvailability?: (data: CourtAvailabilityEventPayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  subscribedClubs: Set<string>;
}

export interface UseWebSocketReturn extends WebSocketState {
  subscribe: (clubId: string) => void;
  unsubscribe: (clubId: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

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

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const socket = io("/", {
        path,
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socket.on("connect", () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        handlersRef.current.onConnect?.();
      });

      socket.on("disconnect", () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));
        handlersRef.current.onDisconnect?.();
      });

      socket.on("connect_error", (error) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message,
        }));
        handlersRef.current.onError?.(error);
      });

      socket.on("booking:created", (data: BookingEventPayload) => {
        handlersRef.current.onBookingCreated?.(data);
      });

      socket.on("booking:updated", (data: BookingEventPayload) => {
        handlersRef.current.onBookingUpdated?.(data);
      });

      socket.on("booking:deleted", (data: { id: string; clubId: string }) => {
        handlersRef.current.onBookingDeleted?.(data);
      });

      socket.on("court:availability", (data: CourtAvailabilityEventPayload) => {
        handlersRef.current.onCourtAvailability?.(data);
      });

      socketRef.current = socket;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect";
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [path]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
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

  const subscribe = useCallback((clubId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("subscribe:club:bookings", clubId);
    setState((prev) => {
      const newSubscribedClubs = new Set(prev.subscribedClubs);
      newSubscribedClubs.add(clubId);
      return { ...prev, subscribedClubs: newSubscribedClubs };
    });
  }, []);

  const unsubscribe = useCallback((clubId: string) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit("unsubscribe:club:bookings", clubId);
    setState((prev) => {
      const newSubscribedClubs = new Set(prev.subscribedClubs);
      newSubscribedClubs.delete(clubId);
      return { ...prev, subscribedClubs: newSubscribedClubs };
    });
  }, []);

  const reconnect = useCallback((delayMs = 100) => {
    disconnect();
    setTimeout(connect, delayMs);
  }, [connect, disconnect]);

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
