'use client';

/**
 * Global Socket.IO Event Dispatcher
 * 
 * Subscribes to all real-time Socket.IO events from the Notification Socket and:
 * 1. Displays toast notifications via globalNotificationManager
 * 2. Updates Zustand stores (notification store) with real-time data
 * 3. Transforms Booking/Payment events into AdminNotification format for unified notification system
 * 
 * This component is initialized once at app startup and works across all pages.
 * It uses the Notification Socket which remains active regardless of page navigation.
 * 
 * Notification Socket Features:
 * - Always active during user session
 * - Independent of page navigation or active club changes
 * - Receives role-scoped notifications (Root Admin, Org Admin, Club Admin, Player)
 * - Server-side room filtering ensures users only receive relevant notifications
 * 
 * Features:
 * - Uses notification socket from SocketProvider (single persistent connection)
 * - Centralized event dispatching for admin notifications and payment events
 * - Automatic duplicate prevention via notification manager
 * - Updates notification store for admin notifications (unified system)
 * - All admin-relevant events (Training, Booking, Payment) persist in notification store
 * 
 * Note: Booking events (booking_created, booking_updated, booking_cancelled) and slot events
 * are now handled by BookingSocketListener on club operations pages for real-time calendar updates.
 */

import { useEffect } from 'react';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
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
import { useNotificationStore } from '@/stores/useNotificationStore';

/**
 * Global Socket Event Dispatcher
 * 
 * Usage: Add this component to the root layout to enable:
 * - Global socket event listening for notifications and payments
 * - Toast notifications
 * - Automatic notification store updates
 */
export function GlobalSocketListener() {
  const { socket, isConnected } = useSocket();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (!socket) return;

    console.log('[GlobalSocketListener] Registering event listeners');

    // Booking events - for notification purposes only (not for real-time calendar updates)
    // Real-time calendar updates are handled by BookingSocketListener on club operations pages
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_created', data);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingCreated(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking created - notification added');
    };

    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_updated', data);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingUpdated(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking updated - notification added');
    };

    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_cancelled', data);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingCancelled(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking cancelled - notification added');
    };

    // Payment events - integrated with unified notification system
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

    // Admin notification event - update notification store
    const handleAdminNotification = (data: AdminNotificationEvent) => {
      console.log('[GlobalSocketListener] Admin notification received:', data);
      addNotification(data);
    };

    // Register event handlers for notification events
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_updated', handleBookingUpdated);
    socket.on('booking_cancelled', handleBookingCancelled);
    socket.on('admin_notification', handleAdminNotification);
    socket.on('payment_confirmed', handlePaymentConfirmed);
    socket.on('payment_failed', handlePaymentFailed);

    // Cleanup on unmount or socket change
    return () => {
      console.log('[GlobalSocketListener] Cleaning up event listeners');
      
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_updated', handleBookingUpdated);
      socket.off('booking_cancelled', handleBookingCancelled);
      socket.off('admin_notification', handleAdminNotification);
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
