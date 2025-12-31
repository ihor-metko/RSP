'use client';

/**
 * Centralized Socket.IO Context - Notification Socket
 * 
 * Provides a single persistent notification socket connection for the entire application.
 * This socket is always active during the user session and independent of the current page.
 * 
 * This is now a thin wrapper around useSocketStore for backward compatibility.
 * The actual socket management is handled by the centralized Zustand store.
 * 
 * Features:
 * - Singleton notification socket connection (always active)
 * - Authentication via JWT token
 * - Automatic reconnection handling
 * - Connection state tracking
 * - Role-based notification delivery (Root Admin, Org Admin, Club Admin, Player)
 * - Safe cleanup on logout
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useSocketStore } from '@/stores/useSocketStore';
import { useUserStore } from '@/stores/useUserStore';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/socket';
import { Socket } from 'socket.io-client';

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
 * This is now a thin wrapper around useSocketStore for backward compatibility.
 * 
 * The actual socket management happens in the centralized Zustand store,
 * which ensures:
 * - Single instance per session (no duplicates)
 * - React StrictMode safety (development mode)
 * - Proper cleanup on logout
 * 
 * @example
 * ```tsx
 * <SocketProvider>
 *   <App />
 * </SocketProvider>
 * ```
 */
export function SocketProvider({ children }: SocketProviderProps) {
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const user = useUserStore(state => state.user);
  
  // Get store actions and state
  const initializeNotificationSocket = useSocketStore(state => state.initializeNotificationSocket);
  const disconnectNotificationSocket = useSocketStore(state => state.disconnectNotificationSocket);
  const getSocketToken = useSocketStore(state => state.getSocketToken);
  const clearSocketToken = useSocketStore(state => state.clearSocketToken);
  const notificationSocket = useSocketStore(state => state.notificationSocket);
  const notificationConnected = useSocketStore(state => state.notificationConnected);

  useEffect(() => {
    // Only initialize socket if user is authenticated
    if (sessionStatus !== 'authenticated' || !user) {
      // Disconnect if user logged out
      disconnectNotificationSocket();
      clearSocketToken();
      return;
    }

    // Initialize socket connection with authentication
    const initializeSocket = async () => {
      // Get token from store (cached and deduplicated)
      const token = await getSocketToken();

      // Validate token before initializing socket
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error('[NotificationSocket] Invalid token, cannot initialize socket');
        return;
      }

      console.log('[NotificationSocket] Token validated, initializing socket connection');
      
      // Initialize via store (store handles duplicate prevention)
      initializeNotificationSocket(token);
    };

    initializeSocket();

    // Cleanup on unmount or when session changes
    return () => {
      // Note: We don't disconnect here because the socket should persist
      // across component re-mounts in development mode (React StrictMode)
      // The socket will be cleaned up when user logs out (handled above)
    };
  }, [sessionStatus, user, getSocketToken, clearSocketToken, initializeNotificationSocket, disconnectNotificationSocket]);

  const value: SocketContextValue = useMemo(
    () => ({
      socket: notificationSocket,
      isConnected: notificationConnected,
    }),
    [notificationSocket, notificationConnected]
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
