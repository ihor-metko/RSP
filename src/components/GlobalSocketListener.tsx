'use client';

/**
 * Global Socket.IO Event Dispatcher
 * 
 * Handles two types of WebSocket connections:
 * 1. NotificationSocket - Persistent connection for platform-wide notifications
 * 2. BookingSocket - Club-specific connection for real-time booking updates
 * 
 * NotificationSocket:
 * - Always active during user session
 * - Handles: admin_notification, payment events, booking events (for notifications only)
 * - Updates notification store with role-scoped notifications
 * - Server-side room filtering based on user role (Root Admin, Org Admin, Club Admin, Player)
 * 
 * BookingSocket:
 * - Active only when a club is selected (club operations page)
 * - Handles: booking_created, booking_updated, booking_cancelled, slot_locked, slot_unlocked, lock_expired
 * - Updates booking store for real-time calendar synchronization
 * - Automatically disconnects when leaving club pages
 * 
 * Role-Based Event Filtering:
 * - Root Admin: Receives all events (platform-wide)
 * - Organization Admin: Receives events for their organizations
 * - Club Admin/Player: Receives events for their clubs
 * - Server-side room filtering ensures no client-side filtering needed
 * 
 * Features:
 * - Singleton integration with existing socket instances
 * - Proper event cleanup on unmount
 * - Duplicate prevention via notification manager
 * - Separate store updates for notifications vs booking calendar
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
import { useBookingSocket } from '@/contexts/BookingSocketContext';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useBookingStore } from '@/stores/useBookingStore';

/**
 * Cleanup interval for expired locks in milliseconds (60 seconds)
 */
const CLEANUP_INTERVAL_MS = 60000;

/**
 * Global Socket Event Dispatcher
 * 
 * Usage: Add this component to the root layout to enable:
 * - Global notification socket listening (always active)
 * - Club-specific booking socket listening (active when club is selected)
 * - Toast notifications
 * - Automatic store updates (notification store and booking store)
 */
export function GlobalSocketListener() {
  // NotificationSocket - always active
  const { socket: notificationSocket, isConnected: notificationConnected } = useSocket();
  
  // BookingSocket - active only when club is selected
  const { socket: bookingSocket, isConnected: bookingConnected, activeClubId } = useBookingSocket();
  
  // Store actions
  const addNotification = useNotificationStore(state => state.addNotification);
  const updateBookingFromSocket = useBookingStore(state => state.updateBookingFromSocket);
  const removeBookingFromSocket = useBookingStore(state => state.removeBookingFromSocket);
  const addLockedSlot = useBookingStore(state => state.addLockedSlot);
  const removeLockedSlot = useBookingStore(state => state.removeLockedSlot);
  const cleanupExpiredLocks = useBookingStore(state => state.cleanupExpiredLocks);

  // ===== NotificationSocket Event Handlers =====
  // These events are for notifications only, not real-time calendar updates
  useEffect(() => {
    if (!notificationSocket) return;

    console.log('[GlobalSocketListener] Registering NotificationSocket event listeners');

    // Booking events - for notification purposes only
    const handleBookingCreatedNotification = (data: BookingCreatedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_created', data);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingCreated(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking created notification added');
    };

    const handleBookingUpdatedNotification = (data: BookingUpdatedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_updated', data);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingUpdated(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking updated notification added');
    };

    const handleBookingCancelledNotification = (data: BookingDeletedEvent) => {
      // Show toast notification
      handleSocketEvent('booking_cancelled', data);
      
      // Add to notification store for admin notification UI
      const notification = transformBookingCancelled(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Booking cancelled notification added');
    };

    // Payment events - integrated with unified notification system
    const handlePaymentConfirmed = (data: PaymentConfirmedEvent) => {
      // Show toast notification
      handleSocketEvent('payment_confirmed', data);
      
      // Add to notification store for admin notification UI
      const notification = transformPaymentConfirmed(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Payment confirmed - notification added');
    };

    const handlePaymentFailed = (data: PaymentFailedEvent) => {
      // Show toast notification
      handleSocketEvent('payment_failed', data);
      
      // Add to notification store for admin notification UI
      const notification = transformPaymentFailed(data);
      addNotification(notification);
      
      console.log('[GlobalSocketListener] Payment failed - notification added');
    };

    // Admin notification event - update notification store
    const handleAdminNotification = (data: AdminNotificationEvent) => {
      console.log('[GlobalSocketListener] Admin notification received:', data);
      addNotification(data);
    };

    // Register NotificationSocket event handlers
    notificationSocket.on('booking_created', handleBookingCreatedNotification);
    notificationSocket.on('booking_updated', handleBookingUpdatedNotification);
    notificationSocket.on('booking_cancelled', handleBookingCancelledNotification);
    notificationSocket.on('admin_notification', handleAdminNotification);
    notificationSocket.on('payment_confirmed', handlePaymentConfirmed);
    notificationSocket.on('payment_failed', handlePaymentFailed);

    // Cleanup on unmount or socket change
    return () => {
      console.log('[GlobalSocketListener] Cleaning up NotificationSocket event listeners');
      
      notificationSocket.off('booking_created', handleBookingCreatedNotification);
      notificationSocket.off('booking_updated', handleBookingUpdatedNotification);
      notificationSocket.off('booking_cancelled', handleBookingCancelledNotification);
      notificationSocket.off('admin_notification', handleAdminNotification);
      notificationSocket.off('payment_confirmed', handlePaymentConfirmed);
      notificationSocket.off('payment_failed', handlePaymentFailed);
    };
  }, [notificationSocket, addNotification]);

  // ===== BookingSocket Event Handlers =====
  // These events are for real-time calendar updates (only active when club is selected)
  useEffect(() => {
    if (!bookingSocket || !activeClubId) return;

    console.log('[GlobalSocketListener] Registering BookingSocket event listeners for club:', activeClubId);

    // Booking events - update booking store for real-time calendar sync
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring booking_created for different club');
        return;
      }

      // Update booking store for real-time calendar sync
      updateBookingFromSocket(data.booking);
      
      console.log('[GlobalSocketListener] Booking created - store updated');
    };

    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring booking_updated for different club');
        return;
      }

      // Update booking store for real-time calendar sync
      updateBookingFromSocket(data.booking);
      
      console.log('[GlobalSocketListener] Booking updated - store updated');
    };

    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring booking_cancelled for different club');
        return;
      }

      // Remove from booking store for real-time calendar sync
      removeBookingFromSocket(data.bookingId);
      
      console.log('[GlobalSocketListener] Booking cancelled - store updated');
    };

    // Slot lock events - update booking store for real-time UI sync
    const handleSlotLocked = (data: SlotLockedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring slot_locked for different club');
        return;
      }

      handleSocketEvent('slot_locked', data);
      addLockedSlot(data);
      console.log('[GlobalSocketListener] Slot locked - store updated');
    };

    const handleSlotUnlocked = (data: SlotUnlockedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring slot_unlocked for different club');
        return;
      }

      handleSocketEvent('slot_unlocked', data);
      removeLockedSlot(data.slotId);
      console.log('[GlobalSocketListener] Slot unlocked - store updated');
    };

    const handleLockExpired = (data: LockExpiredEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring lock_expired for different club');
        return;
      }

      handleSocketEvent('lock_expired', data);
      removeLockedSlot(data.slotId);
      console.log('[GlobalSocketListener] Lock expired - store updated');
    };

    // Register BookingSocket event handlers
    bookingSocket.on('booking_created', handleBookingCreated);
    bookingSocket.on('booking_updated', handleBookingUpdated);
    bookingSocket.on('booking_cancelled', handleBookingCancelled);
    bookingSocket.on('slot_locked', handleSlotLocked);
    bookingSocket.on('slot_unlocked', handleSlotUnlocked);
    bookingSocket.on('lock_expired', handleLockExpired);

    // Cleanup on unmount or socket/club change
    return () => {
      console.log('[GlobalSocketListener] Cleaning up BookingSocket event listeners');
      
      bookingSocket.off('booking_created', handleBookingCreated);
      bookingSocket.off('booking_updated', handleBookingUpdated);
      bookingSocket.off('booking_cancelled', handleBookingCancelled);
      bookingSocket.off('slot_locked', handleSlotLocked);
      bookingSocket.off('slot_unlocked', handleSlotUnlocked);
      bookingSocket.off('lock_expired', handleLockExpired);
    };
  }, [bookingSocket, activeClubId, updateBookingFromSocket, removeBookingFromSocket, addLockedSlot, removeLockedSlot]);

  // Periodic cleanup of expired slot locks
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupExpiredLocks();
    }, CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cleanupExpiredLocks]);

  // Cleanup notification manager on unmount
  useEffect(() => {
    return () => {
      cleanupNotificationManager();
    };
  }, []);

  // Log connection status changes
  useEffect(() => {
    if (notificationConnected) {
      console.log('[GlobalSocketListener] NotificationSocket connected and ready');
    } else {
      console.log('[GlobalSocketListener] NotificationSocket disconnected');
    }
  }, [notificationConnected]);

  useEffect(() => {
    if (bookingConnected && activeClubId) {
      console.log('[GlobalSocketListener] BookingSocket connected and ready for club:', activeClubId);
    } else if (!bookingConnected && activeClubId) {
      console.log('[GlobalSocketListener] BookingSocket disconnected');
    }
  }, [bookingConnected, activeClubId]);

  // This component doesn't render anything
  return null;
}
