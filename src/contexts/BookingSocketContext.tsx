'use client';

/**
 * Centralized Booking Socket Context
 * 
 * Provides a club-specific booking socket connection that connects/disconnects
 * based on the currently active club and user's admin role.
 * 
 * This is now a thin wrapper around useSocketStore for backward compatibility.
 * The actual socket management is handled by the centralized Zustand store.
 * 
 * Features:
 * - Club-specific socket connection (connects only when clubId is set AND user is admin)
 * - Automatic connection when entering club operations page (admin users only)
 * - Automatic disconnection when leaving club operations page or user loses admin role
 * - Authentication via JWT token
 * - Automatic reconnection handling
 * - Connection state tracking
 * - Role-based access control (admins only: ROOT_ADMIN, ORGANIZATION_ADMIN, CLUB_ADMIN)
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useSocketStore } from '@/stores/useSocketStore';
import { useUserStore } from '@/stores/useUserStore';
import { useActiveClub } from '@/contexts/ClubContext';
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
 * This is now a thin wrapper around useSocketStore for backward compatibility.
 * 
 * The actual socket management happens in the centralized Zustand store,
 * which ensures:
 * - Single instance per club (no duplicates)
 * - React StrictMode safety (development mode)
 * - Proper cleanup when changing clubs
 * 
 * @example
 * ```tsx
 * <BookingSocketProvider>
 *   <App />
 * </BookingSocketProvider>
 * ```
 */
export function BookingSocketProvider({ children }: BookingSocketProviderProps) {
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const user = useUserStore(state => state.user);
  const adminStatus = useUserStore(state => state.adminStatus);
  const { activeClubId } = useActiveClub();
  
  // Get store actions and state
  const initializeBookingSocket = useSocketStore(state => state.initializeBookingSocket);
  const disconnectBookingSocket = useSocketStore(state => state.disconnectBookingSocket);
  const getSocketToken = useSocketStore(state => state.getSocketToken);
  const clearSocketToken = useSocketStore(state => state.clearSocketToken);
  const bookingSocket = useSocketStore(state => state.bookingSocket);
  const bookingConnected = useSocketStore(state => state.bookingConnected);

  useEffect(() => {
    // Only initialize socket if user is authenticated and a club is active
    if (sessionStatus !== 'authenticated' || !user || !activeClubId) {
      // Disconnect if conditions no longer met
      disconnectBookingSocket();
      
      // Clear token cache only on logout
      if (sessionStatus !== 'authenticated') {
        clearSocketToken();
      }
      
      return;
    }

    // Role-based access control: BookingSocket is only for admins
    const isAdmin = adminStatus?.isAdmin ?? false;
    if (!isAdmin) {
      disconnectBookingSocket();
      return;
    }

    // Initialize socket connection with authentication
    const initializeSocket = async () => {
      // Get token from store (cached and deduplicated)
      const token = await getSocketToken();

      // Validate token before initializing socket
      if (!token || typeof token !== 'string' || token.trim() === '') {
        console.error('[BookingSocket] Invalid token, cannot initialize socket');
        return;
      }

      console.log('[BookingSocket] Token validated, initializing socket for club:', activeClubId);
      
      // Initialize via store (store handles duplicate prevention)
      initializeBookingSocket(token, activeClubId);
    };

    initializeSocket();

    // Cleanup when club changes (disconnect handled by store)
    return () => {
      // Note: We don't disconnect here in development mode to handle React StrictMode
      // The store will handle disconnection when activeClubId actually changes
    };
  }, [sessionStatus, user, activeClubId, adminStatus, getSocketToken, clearSocketToken, initializeBookingSocket, disconnectBookingSocket]);

  const value: BookingSocketContextValue = useMemo(
    () => ({
      socket: bookingSocket,
      isConnected: bookingConnected,
      activeClubId,
    }),
    [bookingSocket, bookingConnected, activeClubId]
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
