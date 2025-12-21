'use client';

/**
 * Centralized Socket.IO Context
 * 
 * Provides a single global socket connection to the entire application.
 * Ensures only one socket instance exists and is shared across all components.
 * 
 * Features:
 * - Singleton socket connection
 * - Automatic reconnection handling
 * - Connection state tracking
 * - Safe cleanup on unmount
 */

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/socket';

/**
 * Typed Socket.IO client
 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket Context interface
 */
interface SocketContextValue {
  /**
   * The global socket instance (null if not connected)
   */
  socket: TypedSocket | null;

  /**
   * Whether the socket is connected
   */
  isConnected: boolean;
}

/**
 * Socket Context
 */
const SocketContext = createContext<SocketContextValue | undefined>(undefined);

/**
 * Socket Provider Props
 */
interface SocketProviderProps {
  children: React.ReactNode;
}

/**
 * Global Socket Provider
 * 
 * Wraps the application and provides a single socket connection.
 * Should be placed high in the component tree (e.g., root layout).
 * 
 * @example
 * ```tsx
 * <SocketProvider>
 *   <App />
 * </SocketProvider>
 * ```
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Prevent multiple socket instances
    if (socketRef.current) {
      console.warn('[SocketProvider] Socket already initialized, skipping');
      return;
    }

    console.log('[SocketProvider] Initializing global socket connection');

    // Initialize Socket.IO client
    const socket: TypedSocket = io({
      path: '/socket.io',
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[SocketProvider] Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SocketProvider] Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[SocketProvider] Connection error:', error.message);
    });

    // Reconnection handler
    socket.io.on('reconnect', (attemptNumber) => {
      console.log('[SocketProvider] Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    // Cleanup on unmount
    return () => {
      console.log('[SocketProvider] Cleaning up socket connection');
      
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.io.off('reconnect');
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // Empty dependency array - initialize only once

  const value: SocketContextValue = useMemo(
    () => ({
      socket: socketRef.current,
      isConnected,
    }),
    [isConnected]
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the global socket instance
 * 
 * @throws Error if used outside of SocketProvider
 * 
 * @example
 * ```tsx
 * const { socket, isConnected } = useSocket();
 * 
 * useEffect(() => {
 *   if (!socket) return;
 *   
 *   socket.on('custom_event', handleEvent);
 *   return () => socket.off('custom_event', handleEvent);
 * }, [socket]);
 * ```
 */
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}
