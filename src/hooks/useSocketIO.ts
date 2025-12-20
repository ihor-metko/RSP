'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
} from '@/types/socket';
import { debounceSocketEvent } from '@/utils/socketUpdateManager';

/**
 * Typed Socket.IO client
 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Hook options
 */
interface UseSocketIOOptions {
  /**
   * Whether to automatically connect on mount
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Callback when a booking is created
   */
  onBookingCreated?: (data: BookingCreatedEvent) => void;

  /**
   * Callback when a booking is updated
   */
  onBookingUpdated?: (data: BookingUpdatedEvent) => void;

  /**
   * Callback when a booking is deleted
   */
  onBookingDeleted?: (data: BookingDeletedEvent) => void;

  /**
   * Callback when socket reconnects (for syncing missed updates)
   */
  onReconnect?: () => void;

  /**
   * Debounce delay in milliseconds for booking events
   * @default 300
   */
  debounceMs?: number;
}

/**
 * Hook return type
 */
interface UseSocketIOReturn {
  /**
   * Socket.IO client instance
   */
  socket: TypedSocket | null;

  /**
   * Whether the socket is connected
   */
  isConnected: boolean;

  /**
   * Manually connect the socket
   */
  connect: () => void;

  /**
   * Manually disconnect the socket
   */
  disconnect: () => void;
}

/**
 * Custom hook for Socket.IO client connection
 * 
 * Features:
 * - Automatic reconnection handling
 * - Debounced event handlers to prevent UI flickering
 * - Callback to sync missed updates after reconnection
 * 
 * @example
 * ```tsx
 * const { socket, isConnected } = useSocketIO({
 *   onBookingCreated: (data) => {
 *     console.log('New booking created:', data);
 *     // Refresh bookings list
 *   },
 *   onBookingUpdated: (data) => {
 *     console.log('Booking updated:', data);
 *   },
 *   onReconnect: () => {
 *     // Fetch missed updates from server
 *     refetchBookings();
 *   },
 * });
 * ```
 */
export function useSocketIO(options: UseSocketIOOptions = {}): UseSocketIOReturn {
  const {
    autoConnect = true,
    onBookingCreated,
    onBookingUpdated,
    onBookingDeleted,
    onReconnect,
    debounceMs = 300,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);
  
  // Use refs to store callbacks to avoid reconnection on callback change
  const onBookingCreatedRef = useRef(onBookingCreated);
  const onBookingUpdatedRef = useRef(onBookingUpdated);
  const onBookingDeletedRef = useRef(onBookingDeleted);
  const onReconnectRef = useRef(onReconnect);
  
  // Update refs when callbacks change
  useEffect(() => {
    onBookingCreatedRef.current = onBookingCreated;
    onBookingUpdatedRef.current = onBookingUpdated;
    onBookingDeletedRef.current = onBookingDeleted;
    onReconnectRef.current = onReconnect;
  }, [onBookingCreated, onBookingUpdated, onBookingDeleted, onReconnect]);

  useEffect(() => {
    if (!autoConnect) return;

    // Initialize Socket.IO client
    const socket: TypedSocket = io({
      path: '/socket.io',
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket.IO connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
    });

    // Reconnection handler
    socket.io.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      // Trigger callback to sync missed updates
      onReconnectRef.current?.();
    });

    // Debounced booking event handlers
    const debouncedBookingCreated = debounceSocketEvent(
      (data: BookingCreatedEvent) => {
        onBookingCreatedRef.current?.(data);
      },
      debounceMs
    );

    const debouncedBookingUpdated = debounceSocketEvent(
      (data: BookingUpdatedEvent) => {
        onBookingUpdatedRef.current?.(data);
      },
      debounceMs
    );

    const debouncedBookingDeleted = debounceSocketEvent(
      (data: BookingDeletedEvent) => {
        onBookingDeletedRef.current?.(data);
      },
      debounceMs
    );

    socket.on('bookingCreated', debouncedBookingCreated);
    socket.on('bookingUpdated', debouncedBookingUpdated);
    socket.on('bookingDeleted', debouncedBookingDeleted);

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.io.off('reconnect');
      socket.off('bookingCreated');
      socket.off('bookingUpdated');
      socket.off('bookingDeleted');
      socket.disconnect();
    };
  }, [autoConnect]); // Only reconnect when autoConnect changes

  const connect = () => {
    if (!socketRef.current) {
      const socket: TypedSocket = io({
        path: '/socket.io',
      });
      socketRef.current = socket;
      
      // Set up event listeners for manually connected socket
      socket.on('connect', () => {
        console.log('Socket.IO connected:', socket.id);
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error.message);
      });

      // Reconnection handler
      socket.io.on('reconnect', (attemptNumber) => {
        console.log('Socket.IO reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
        onReconnectRef.current?.();
      });

      // Debounced booking event handlers
      const debouncedBookingCreated = debounceSocketEvent(
        (data: BookingCreatedEvent) => {
          onBookingCreatedRef.current?.(data);
        },
        debounceMs
      );

      const debouncedBookingUpdated = debounceSocketEvent(
        (data: BookingUpdatedEvent) => {
          onBookingUpdatedRef.current?.(data);
        },
        debounceMs
      );

      const debouncedBookingDeleted = debounceSocketEvent(
        (data: BookingDeletedEvent) => {
          onBookingDeletedRef.current?.(data);
        },
        debounceMs
      );

      socket.on('bookingCreated', debouncedBookingCreated);
      socket.on('bookingUpdated', debouncedBookingUpdated);
      socket.on('bookingDeleted', debouncedBookingDeleted);
    } else if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
  };
}
