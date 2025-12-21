'use client';

/**
 * Global Socket.IO Event Dispatcher
 * 
 * Subscribes to all real-time Socket.IO events and:
 * 1. Displays toast notifications via globalNotificationManager
 * 2. Updates Zustand stores (booking store, notification store) with real-time data
 * 3. Transforms Booking/Payment events into AdminNotification format for unified notification system
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
 * - Updates notification store for admin notifications (unified system)
 * - All admin-relevant events (Training, Booking, Payment) persist in notification store
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
import { 
  handleSocketEvent, 
  cleanupNotificationManager,
  transformBookingCreated,
  transformBookingUpdated,
  transformBookingCancelled,
  transformPaymentConfirmed,
  transformPaymentFailed,
} from '@/utils/globalNotificationManager';
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
    // Now includes unified notification system: toasts + notification store persistence
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_created', data);
      
      // Update booking store for real-time calendar sync
      updateBookingFromSocket(data.booking);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingCreated(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking created - toast shown, store updated, notification added');
    };

    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_updated', data);
      
      // Update booking store for real-time calendar sync
      updateBookingFromSocket(data.booking);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingUpdated(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking updated - toast shown, store updated, notification added');
    };

    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_cancelled', data);
      
      // Remove from booking store for real-time calendar sync
      removeBookingFromSocket(data.bookingId);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingCancelled(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking cancelled - toast shown, store updated, notification added');
    };

    // Payment events - now integrated with unified notification system
    const handlePaymentConfirmed = (data: PaymentConfirmedEvent) => {
      // Show toast notification
      handleSocketEvent('payment_confirmed', data);
      
      // Add to notification store for admin notification UI
      const notification = transformPaymentConfirmed(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Payment confirmed - toast shown, notification added');
    };

    const handlePaymentFailed = (data: PaymentFailedEvent) => {
      // Show toast notification
      handleSocketEvent('payment_failed', data);
      
      // Add to notification store for admin notification UI
      const notification = transformPaymentFailed(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Payment failed - toast shown, notification added');
    };

    // Admin notification event - update notification store (unchanged)
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

    // Payment events with unified notification system
    socket.on('payment_confirmed', handlePaymentConfirmed);
    socket.on('payment_failed', handlePaymentFailed);

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
      socket.off('payment_confirmed', handlePaymentConfirmed);
      socket.off('payment_failed', handlePaymentFailed);
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
