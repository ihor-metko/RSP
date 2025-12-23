'use client';

/**
 * Global Socket.IO Event Dispatcher
 * 
 * ARCHITECTURE OVERVIEW:
 * ======================
 * This component manages two separate WebSocket connections:
 * 
 * 1. NotificationSocket (SocketProvider)
 *    - Purpose: Platform-wide notifications
 *    - Lifecycle: Always active during user session (all roles)
 *    - Events: admin_notification, payment_confirmed, payment_failed, booking events (for notifications)
 *    - Store Updates: Notification store only
 *    - Room Filtering: Server-side based on user role (root_admin, organization:{orgId}, club:{clubId})
 *    - Available to: All users (ROOT_ADMIN, ORG_ADMIN, CLUB_ADMIN, PLAYER)
 * 
 * 2. BookingSocket (BookingSocketProvider)
 *    - Purpose: Real-time booking calendar updates for club operations
 *    - Lifecycle: Active only when a club is selected (club operations page) AND user is admin
 *    - Events: booking_created, booking_updated, booking_cancelled, slot_locked, slot_unlocked, lock_expired
 *    - Store Updates: Booking store only
 *    - Room Filtering: Server-side, club:{clubId} room only
 *    - Available to: Admin users only (ROOT_ADMIN, ORG_ADMIN, CLUB_ADMIN)
 * 
 * EVENT FLOW:
 * ===========
 * 
 * Booking Events:
 * - NotificationSocket receives booking events → Shows toast + Adds to notification store (all users)
 * - BookingSocket receives booking events → Updates booking store for calendar UI sync (admins only)
 * - Both can fire simultaneously without duplication due to separate responsibilities
 * 
 * Slot Lock Events:
 * - Only handled by BookingSocket (admins only)
 * - Updates booking store to show locked/unavailable slots in calendar
 * 
 * Payment Events:
 * - Only handled by NotificationSocket (all users)
 * - Shows toast + Adds to notification store
 * 
 * Admin Notification Events:
 * - Only handled by NotificationSocket (all users)
 * - Adds directly to notification store (no transformation needed)
 * 
 * ROLE-BASED ACCESS:
 * ==================
 * NotificationSocket (all roles):
 * - Root Admin: Receives all events from all clubs/organizations
 * - Organization Admin: Receives events for clubs within their organizations
 * - Club Admin: Receives events for clubs they manage
 * - Player: Receives events for clubs they belong to
 * - Server-side room filtering ensures users only receive relevant events
 * 
 * BookingSocket (admin roles only):
 * - Root Admin: Can connect to any club's BookingSocket (when activeClubId is set)
 * - Organization Admin: Can connect to clubs in their organizations (when activeClubId is set)
 * - Club Admin: Can connect to clubs they manage (when activeClubId is set)
 * - Player: Cannot connect to BookingSocket (receives booking updates via NotificationSocket)
 * 
 * INTEGRATION:
 * ============
 * - Place in root layout (app/layout.tsx) as a singleton
 * - Uses existing socket instances from SocketProvider and BookingSocketProvider
 * - Reacts to activeClubId changes from ClubContext
 * - BookingSocket automatically connects when activeClubId is set AND user is admin
 * - BookingSocket disconnects when activeClubId is cleared OR user loses admin privileges
 * 
 * USAGE:
 * ======
 * In root layout:
 * ```tsx
 * <SocketProvider>
 *   <BookingSocketProvider>
 *     <GlobalSocketListener />
 *     {children}
 *   </BookingSocketProvider>
 * </SocketProvider>
 * ```
 * 
 * In club operations page (admin only):
 * ```tsx
 * const { setActiveClubId } = useActiveClub();
 * 
 * useEffect(() => {
 *   setActiveClubId(clubId); // BookingSocket connects (if user is admin)
 *   return () => setActiveClubId(null); // BookingSocket disconnects
 * }, [clubId]);
 * ```
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
  
  // Store actions - using direct selector to get addNotification
  const addNotification = useNotificationStore(state => state.addNotification);

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

    // Helper to filter events by active club
    const isEventForActiveClub = (clubId: string): boolean => {
      if (clubId !== activeClubId) {
        console.log('[GlobalSocketListener] Ignoring event for different club');
        return false;
      }
      return true;
    };

    // Get store methods once to avoid repeated destructuring
    const getStoreMethods = () => useBookingStore.getState();

    // Booking events - update booking store for real-time calendar sync
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      if (!isEventForActiveClub(data.clubId)) return;

      // Update booking store for real-time calendar sync
      getStoreMethods().updateBookingFromSocket(data.booking);
      
      console.log('[GlobalSocketListener] Booking created - store updated');
    };

    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      if (!isEventForActiveClub(data.clubId)) return;

      // Update booking store for real-time calendar sync
      getStoreMethods().updateBookingFromSocket(data.booking);
      
      console.log('[GlobalSocketListener] Booking updated - store updated');
    };

    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      if (!isEventForActiveClub(data.clubId)) return;

      // Remove from booking store for real-time calendar sync
      getStoreMethods().removeBookingFromSocket(data.bookingId);
      
      console.log('[GlobalSocketListener] Booking cancelled - store updated');
    };

    // Slot lock events - update booking store for real-time UI sync
    const handleSlotLocked = (data: SlotLockedEvent) => {
      if (!isEventForActiveClub(data.clubId)) return;

      handleSocketEvent('slot_locked', data);
      getStoreMethods().addLockedSlot(data);
      console.log('[GlobalSocketListener] Slot locked - store updated');
    };

    const handleSlotUnlocked = (data: SlotUnlockedEvent) => {
      if (!isEventForActiveClub(data.clubId)) return;

      handleSocketEvent('slot_unlocked', data);
      getStoreMethods().removeLockedSlot(data.slotId);
      console.log('[GlobalSocketListener] Slot unlocked - store updated');
    };

    const handleLockExpired = (data: LockExpiredEvent) => {
      if (!isEventForActiveClub(data.clubId)) return;

      handleSocketEvent('lock_expired', data);
      getStoreMethods().removeLockedSlot(data.slotId);
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
  }, [bookingSocket, activeClubId]); // Only depend on socket and activeClubId, not store actions

  // Periodic cleanup of expired slot locks
  useEffect(() => {
    const interval = setInterval(() => {
      useBookingStore.getState().cleanupExpiredLocks();
    }, CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []); // Empty deps - cleanup function doesn't change

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
