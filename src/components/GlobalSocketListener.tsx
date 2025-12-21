'use client';

/**
 * Global Socket.IO Event Dispatcher
 * 
 * Subscribes to all real-time Socket.IO events and:
 * 1. Displays toast notifications via globalNotificationManager
 * 2. Updates Zustand stores (booking store, notification store) with real-time data
 * 
 * This component is initialized once at app startup and works across all pages.
 * 
 * Events monitored:
 * - booking_created, booking_updated, booking_cancelled
 * - slot_locked, slot_unlocked, lock_expired
 * - payment_confirmed, payment_failed
 * - admin_notification
 * 
 * Features:
 * - Uses global socket from SocketProvider (no duplicate connections)
 * - Centralized event dispatching
 * - Automatic duplicate prevention via notification manager
 * - Updates booking store for real-time UI sync
 * - Updates notification store for admin notifications
 */

import { useEffect } from 'react';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
  LockExpiredEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
  AdminNotificationEvent,
} from '@/types/socket';
import { handleSocketEvent, cleanupNotificationManager } from '@/utils/globalNotificationManager';
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';
import { useNotificationStore } from '@/stores/useNotificationStore';

/**
 * Global Socket Event Dispatcher
 * 
 * Usage: Add this component to the root layout to enable:
 * - Global socket event listening
 * - Toast notifications
 * - Automatic store updates
 */
export function GlobalSocketListener() {
  const { socket, isConnected } = useSocket();
  const updateBookingFromSocket = useBookingStore(state => state.updateBookingFromSocket);
  const removeBookingFromSocket = useBookingStore(state => state.removeBookingFromSocket);
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (!socket) return;

    console.log('[GlobalSocketListener] Registering event listeners');

    // Booking events - handle both notifications and store updates
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      handleSocketEvent('booking_created', data);
      updateBookingFromSocket(data.booking);
    };

    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      handleSocketEvent('booking_updated', data);
      updateBookingFromSocket(data.booking);
    };

    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      handleSocketEvent('booking_cancelled', data);
      removeBookingFromSocket(data.bookingId);
    };

    // Admin notification event - update notification store
    const handleAdminNotification = (data: AdminNotificationEvent) => {
      console.log('[GlobalSocketListener] Admin notification received:', data);
      addNotification(data);
    };

    // Register new event names
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_updated', handleBookingUpdated);
    socket.on('booking_cancelled', handleBookingCancelled);
    socket.on('admin_notification', handleAdminNotification);

    // Legacy event names for backward compatibility
    socket.on('bookingCreated', handleBookingCreated);
    socket.on('bookingUpdated', handleBookingUpdated);
    socket.on('bookingDeleted', handleBookingCancelled);

    // Slot lock events (notifications only for now)
    socket.on('slot_locked', (data: SlotLockedEvent) => {
      handleSocketEvent('slot_locked', data);
    });

    socket.on('slot_unlocked', (data: SlotUnlockedEvent) => {
      handleSocketEvent('slot_unlocked', data);
    });

    socket.on('lock_expired', (data: LockExpiredEvent) => {
      handleSocketEvent('lock_expired', data);
    });

    // Payment events (notifications only for now)
    socket.on('payment_confirmed', (data: PaymentConfirmedEvent) => {
      handleSocketEvent('payment_confirmed', data);
    });

    socket.on('payment_failed', (data: PaymentFailedEvent) => {
      handleSocketEvent('payment_failed', data);
    });

    // Cleanup on unmount or socket change
    return () => {
      console.log('[GlobalSocketListener] Cleaning up event listeners');
      
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_updated', handleBookingUpdated);
      socket.off('booking_cancelled', handleBookingCancelled);
      socket.off('admin_notification', handleAdminNotification);
      socket.off('bookingCreated', handleBookingCreated);
      socket.off('bookingUpdated', handleBookingUpdated);
      socket.off('bookingDeleted', handleBookingCancelled);
      socket.off('slot_locked');
      socket.off('slot_unlocked');
      socket.off('lock_expired');
      socket.off('payment_confirmed');
      socket.off('payment_failed');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]); // Zustand store functions are stable and excluded from dependencies

  // Cleanup notification manager on unmount
  useEffect(() => {
    return () => {
      cleanupNotificationManager();
    };
  }, []);

  // Log connection status changes
  useEffect(() => {
    if (isConnected) {
      console.log('[GlobalSocketListener] Socket connected and ready');
    } else {
      console.log('[GlobalSocketListener] Socket disconnected');
    }
  }, [isConnected]);

  // This component doesn't render anything
  return null;
}
