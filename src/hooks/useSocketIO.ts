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
 * });
 * ```
 */
export function useSocketIO(options: UseSocketIOOptions = {}): UseSocketIOReturn {
  const {
    autoConnect = true,
    onBookingCreated,
    onBookingUpdated,
    onBookingDeleted,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);
  
  // Use refs to store callbacks to avoid reconnection on callback change
  const onBookingCreatedRef = useRef(onBookingCreated);
  const onBookingUpdatedRef = useRef(onBookingUpdated);
  const onBookingDeletedRef = useRef(onBookingDeleted);
  
  // Update refs when callbacks change
  useEffect(() => {
    onBookingCreatedRef.current = onBookingCreated;
    onBookingUpdatedRef.current = onBookingUpdated;
    onBookingDeletedRef.current = onBookingDeleted;
  }, [onBookingCreated, onBookingUpdated, onBookingDeleted]);

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

    // Booking event handlers using refs
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      onBookingCreatedRef.current?.(data);
    };
    
    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      onBookingUpdatedRef.current?.(data);
    };
    
    const handleBookingDeleted = (data: BookingDeletedEvent) => {
      onBookingDeletedRef.current?.(data);
    };

    socket.on('bookingCreated', handleBookingCreated);
    socket.on('bookingUpdated', handleBookingUpdated);
    socket.on('bookingDeleted', handleBookingDeleted);

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('bookingCreated', handleBookingCreated);
      socket.off('bookingUpdated', handleBookingUpdated);
      socket.off('bookingDeleted', handleBookingDeleted);
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

      const handleBookingCreated = (data: BookingCreatedEvent) => {
        onBookingCreatedRef.current?.(data);
      };
      
      const handleBookingUpdated = (data: BookingUpdatedEvent) => {
        onBookingUpdatedRef.current?.(data);
      };
      
      const handleBookingDeleted = (data: BookingDeletedEvent) => {
        onBookingDeletedRef.current?.(data);
      };

      socket.on('bookingCreated', handleBookingCreated);
      socket.on('bookingUpdated', handleBookingUpdated);
      socket.on('bookingDeleted', handleBookingDeleted);
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
