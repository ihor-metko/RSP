'use client';

/**
 * Centralized Booking Socket Context
 * 
 * Provides a club-specific booking socket connection that connects/disconnects
 * based on the currently active club.
 * 
 * Features:
 * - Club-specific socket connection (connects only when clubId is set)
 * - Automatic connection when entering club operations page
 * - Automatic disconnection when leaving club operations page
 * - Authentication via JWT token
 * - Automatic reconnection handling
 * - Connection state tracking
 * - Role-based access control (verifies user has access to the club)
 * 
 * Note: This is the Booking Socket. For global notifications, use NotificationSocket.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useActiveClub } from '@/contexts/ClubContext';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/socket';

/**
 * Typed Socket.IO client
 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Booking Socket Context interface
 */
interface BookingSocketContextValue {
  /**
   * The booking socket instance (null if not connected)
   */
  socket: TypedSocket | null;

  /**
   * Whether the booking socket is connected
   */
  isConnected: boolean;

  /**
   * The currently active club ID (null if none)
   */
  activeClubId: string | null;
}

/**
 * Booking Socket Context
 */
const BookingSocketContext = createContext<BookingSocketContextValue | undefined>(undefined);

/**
 * Booking Socket Provider Props
 */
interface BookingSocketProviderProps {
  children: React.ReactNode;
}

/**
 * Booking Socket Provider
 * 
 * Wraps the application and provides a club-specific booking socket connection.
 * Should be placed high in the component tree (e.g., root layout).
 * Requires authentication and an active club - will only connect when both are available.
 * 
 * Booking Socket Behavior:
 * - Connects only when a club is selected (activeClubId is set)
 * - Disconnects when club is deselected or changed
 * - Delivers club-scoped real-time booking events
 * - Automatically joins the club:{clubId} room for the active club
 * - Disconnects on logout
 * 
 * Usage:
 * - Set activeClubId when entering club operations page
 * - Clear activeClubId when leaving club operations page
 * 
 * @example
 * ```tsx
 * <BookingSocketProvider>
 *   <App />
 * </BookingSocketProvider>
 * ```
 */
export function BookingSocketProvider({ children }: BookingSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const user = useUserStore(state => state.user);
  const getSocketToken = useAuthStore(state => state.getSocketToken);
  const clearSocketToken = useAuthStore(state => state.clearSocketToken);
  const { activeClubId } = useActiveClub();

  useEffect(() => {
    // Only initialize socket if user is authenticated and a club is active
    if (sessionStatus !== 'authenticated' || !user || !activeClubId) {
      // If socket exists and conditions are no longer met, disconnect
      if (socketRef.current) {
        console.log('[BookingSocket] Disconnecting (user logged out or club deselected)');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      // Clear cached socket token on logout
      if (sessionStatus !== 'authenticated') {
        clearSocketToken();
      }
      return;
    }

    // Access control is primarily enforced server-side in socketAuth.ts
    // which verifies the user has the club in their clubIds array.
    // We allow connection attempt here and let server validate actual membership.
    // This ensures players can connect to clubs they belong to.

    // If socket already exists for this club, don't reinitialize
    if (socketRef.current) {
      console.log('[BookingSocket] Socket already initialized for this club, skipping');
      return;
    }

    console.log('[BookingSocket] Initializing booking socket connection for club:', activeClubId);

    // Initialize socket connection with authentication
    const initializeSocket = async () => {
      // Get token from auth store (cached and deduplicated)
      const token = await getSocketToken();

      if (!token) {
        console.error('[BookingSocket] Cannot initialize socket: no token available');
        return;
      }

      // Initialize Socket.IO client with authentication and clubId
      const socket: TypedSocket = io({
        path: '/socket.io',
        auth: {
          token,
          clubId: activeClubId, // Pass clubId to join club-specific room
        },
      });

      socketRef.current = socket;

      // Connection event handlers
      socket.on('connect', () => {
        console.log('[BookingSocket] Booking socket connected:', socket.id, 'for club:', activeClubId);
        setIsConnected(true);
      });

      socket.on('disconnect', (reason) => {
        console.log('[BookingSocket] Booking socket disconnected:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('[BookingSocket] Connection error:', error.message);
        // If authentication fails, don't retry
        if (error.message.includes('Authentication')) {
          console.error('[BookingSocket] Authentication failed, disconnecting');
          socket.disconnect();
        }
      });

      // Reconnection handler
      socket.io.on('reconnect', (attemptNumber) => {
        console.log('[BookingSocket] Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });
    };

    initializeSocket();

    // Cleanup on unmount or when activeClubId changes
    return () => {
      if (!socketRef.current) return;
      
      console.log('[BookingSocket] Cleaning up booking socket connection');
      
      const socket = socketRef.current;
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.io.off('reconnect');
      
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionStatus, user, activeClubId, getSocketToken, clearSocketToken]);

  const value: BookingSocketContextValue = useMemo(
    () => ({
      socket: socketRef.current,
      isConnected,
      activeClubId,
    }),
    [isConnected, activeClubId]
  );

  return (
    <BookingSocketContext.Provider value={value}>
      {children}
    </BookingSocketContext.Provider>
  );
}

/**
 * Hook to access the booking socket instance
 * 
 * @throws Error if used outside of BookingSocketProvider
 * 
 * @example
 * ```tsx
 * const { socket, isConnected, activeClubId } = useBookingSocket();
 * 
 * useEffect(() => {
 *   if (!socket) return;
 *   
 *   socket.on('booking_created', handleBookingCreated);
 *   return () => socket.off('booking_created', handleBookingCreated);
 * }, [socket]);
 * ```
 */
export function useBookingSocket(): BookingSocketContextValue {
  const context = useContext(BookingSocketContext);
  
  if (context === undefined) {
    throw new Error('useBookingSocket must be used within a BookingSocketProvider');
  }
  
  return context;
}
