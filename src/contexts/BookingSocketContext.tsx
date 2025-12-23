'use client';

/**
 * Centralized Booking Socket Context
 * 
 * Provides a club-specific booking socket connection that connects/disconnects
 * based on the currently active club and user's admin role.
 * 
 * Features:
 * - Club-specific socket connection (connects only when clubId is set AND user is admin)
 * - Automatic connection when entering club operations page (admin users only)
 * - Automatic disconnection when leaving club operations page or user loses admin role
 * - Authentication via JWT token
 * - Automatic reconnection handling
 * - Connection state tracking
 * - Role-based access control (admins only: ROOT_ADMIN, ORGANIZATION_ADMIN, CLUB_ADMIN)
 * 
 * Access Rules:
 * - Only admin users can connect to BookingSocket
 * - Regular players receive booking notifications via NotificationSocket instead
 * - Connection requires both activeClubId AND admin privileges
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
 * Requires authentication, admin role, and an active club - will only connect when all are available.
 * 
 * Booking Socket Behavior:
 * - Connects only when a club is selected (activeClubId is set) AND user is an admin
 * - Disconnects when club is deselected, user logs out, or user loses admin privileges
 * - Delivers club-scoped real-time booking events for operations/calendar management
 * - Automatically joins the club:{clubId} room for the active club
 * - Only available to admin roles (ROOT_ADMIN, ORGANIZATION_ADMIN, CLUB_ADMIN)
 * - Regular players receive booking notifications via NotificationSocket instead
 * 
 * Usage:
 * - Set activeClubId when entering club operations page (admin pages)
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
  const adminStatus = useUserStore(state => state.adminStatus);
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
      
      // Log why socket is not initializing
      if (!activeClubId && sessionStatus === 'authenticated') {
        console.log('[BookingSocket] Not initializing - no active club set (prevents unwanted connections from stale localStorage)');
      }
      return;
    }

    // Role-based access control: BookingSocket is only for admins
    // BookingSocket provides real-time calendar updates for club operations
    // and should only connect for users with admin privileges.
    // Regular players receive booking notifications via NotificationSocket instead.
    const isAdmin = adminStatus?.isAdmin ?? false;
    if (!isAdmin) {
      // If socket exists for a non-admin user, disconnect it
      if (socketRef.current) {
        console.log('[BookingSocket] Disconnecting (user is not an admin)');
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

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

      // Validate token before initializing socket
      if (!token) {
        console.error('[BookingSocket] Cannot initialize socket: no token available');
        return;
      }

      // Validate token is a non-empty string
      if (typeof token !== 'string') {
        console.error('[BookingSocket] Cannot initialize socket: token is not a string, got:', typeof token);
        return;
      }

      if (token.trim() === '') {
        console.error('[BookingSocket] Cannot initialize socket: token is empty');
        return;
      }

      console.log('[BookingSocket] Token validated, initializing socket connection for club:', activeClubId);

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
  }, [sessionStatus, user, activeClubId, adminStatus, getSocketToken, clearSocketToken]);

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
