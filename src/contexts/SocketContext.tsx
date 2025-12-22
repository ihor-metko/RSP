'use client';

/**
 * Centralized Socket.IO Context - Notification Socket
 * 
 * Provides a single persistent notification socket connection for the entire application.
 * This socket is always active during the user session and independent of the current page.
 * 
 * Features:
 * - Singleton notification socket connection (always active)
 * - Authentication via JWT token
 * - Automatic reconnection handling
 * - Connection state tracking
 * - Role-based notification delivery (Root Admin, Org Admin, Club Admin, Player)
 * - Safe cleanup on logout
 * 
 * Note: This is the Notification Socket. Booking Socket (club-specific) is not implemented yet.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
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
   * The notification socket instance (null if not connected)
   */
  socket: TypedSocket | null;

  /**
   * Whether the notification socket is connected
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
 * Notification Socket Provider
 * 
 * Wraps the application and provides a single notification socket connection.
 * Should be placed high in the component tree (e.g., root layout).
 * Requires authentication - will only connect when user is authenticated.
 * 
 * Notification Socket Behavior:
 * - Connects once per user session
 * - Remains active regardless of page navigation or club changes
 * - Delivers role-scoped notifications (Root Admin, Org Admin, Club Admin, Player)
 * - Automatically joins appropriate rooms based on user role and memberships
 * - Disconnects only on logout
 * 
 * Note: Booking Socket (club-specific, connects/disconnects on club changes) 
 * will be implemented in a future task.
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
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const user = useUserStore(state => state.user);
  const getSocketToken = useAuthStore(state => state.getSocketToken);
  const clearSocketToken = useAuthStore(state => state.clearSocketToken);

  useEffect(() => {
    // Only initialize socket if user is authenticated
    if (sessionStatus !== 'authenticated' || !user) {
      // If socket exists and user is no longer authenticated, disconnect
      if (socketRef.current) {
        console.log('[NotificationSocket] User logged out, disconnecting socket');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      // Clear cached socket token on logout
      clearSocketToken();
      return;
    }

    // Prevent multiple socket instances
    if (socketRef.current) {
      console.log('[NotificationSocket] Socket already initialized, skipping');
      return;
    }

    console.log('[NotificationSocket] Initializing notification socket connection');

    // Initialize socket connection with authentication
    const initializeSocket = async () => {
      // Get token from auth store (cached and deduplicated)
      const token = await getSocketToken();

      if (!token) {
        console.error('[NotificationSocket] Cannot initialize socket: no token available');
        return;
      }

      // Initialize Socket.IO client with authentication
      // Note: No clubId is passed - this is a notification-only socket
      const socket: TypedSocket = io({
        path: '/socket.io',
        auth: {
          token,
          // No clubId - notification socket is independent of active club
        },
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[NotificationSocket] Notification socket connected:', socket.id);
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('[NotificationSocket] Notification socket disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[NotificationSocket] Connection error:', error.message);
        // If authentication fails, don't retry
        if (error.message.includes('Authentication')) {
          console.error('[NotificationSocket] Authentication failed, disconnecting');
          socket.disconnect();
        }
      });

      // Reconnection handler
      socket.io.on('reconnect', (attemptNumber) => {
        console.log('[NotificationSocket] Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });
    };

    initializeSocket();

    // Cleanup on unmount or when session changes
    return () => {
      if (!socketRef.current) return;
      
      console.log('[NotificationSocket] Cleaning up notification socket connection');
      
      const socket = socketRef.current;
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.io.off('reconnect');
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionStatus, user, getSocketToken, clearSocketToken]); // Only re-initialize when session changes

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
 * Hook to access the notification socket instance
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
 *   socket.on('admin_notification', handleNotification);
 *   return () => socket.off('admin_notification', handleNotification);
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
