'use client';

/**
 * Booking Socket Event Dispatcher
 * 
 * Subscribes to real-time Socket.IO events from the Booking Socket (club-specific) and:
 * 1. Displays toast notifications via globalNotificationManager
 * 2. Updates Zustand stores (booking store) with real-time data
 * 
 * This component should be used on club operations pages where real-time booking
 * updates are needed for the currently active club.
 * 
 * Booking Socket Features:
 * - Active only when a club is selected (via ClubContext)
 * - Connects/disconnects when entering/leaving club operations pages
 * - Receives club-scoped booking events via club:{clubId} room
 * - Server-side room filtering ensures users only receive events for clubs they have access to
 * 
 * Features:
 * - Uses booking socket from BookingSocketProvider (club-specific connection)
 * - Centralized event dispatching for booking events
 * - Automatic duplicate prevention via notification manager
 * - Updates booking store for real-time UI sync
 * - Periodic cleanup of expired slot locks
 */

import { useEffect } from 'react';
import type {
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
  LockExpiredEvent,
} from '@/types/socket';
import { 
  handleSocketEvent,
} from '@/utils/globalNotificationManager';
import { useBookingSocket } from '@/contexts/BookingSocketContext';
import { useBookingStore } from '@/stores/useBookingStore';

/**
 * Cleanup interval for expired locks in milliseconds (60 seconds)
 */
const CLEANUP_INTERVAL_MS = 60000;

/**
 * Booking Socket Event Dispatcher
 * 
 * Usage: Add this component to club operations pages to enable:
 * - Real-time booking event listening
 * - Toast notifications for booking changes
 * - Automatic booking store updates
 * 
 * @example
 * ```tsx
 * <BookingSocketListener />
 * ```
 */
export function BookingSocketListener() {
  const { socket, isConnected, activeClubId } = useBookingSocket();
  const updateBookingFromSocket = useBookingStore(state => state.updateBookingFromSocket);
  const removeBookingFromSocket = useBookingStore(state => state.removeBookingFromSocket);
  const addLockedSlot = useBookingStore(state => state.addLockedSlot);
  const removeLockedSlot = useBookingStore(state => state.removeLockedSlot);
  const cleanupExpiredLocks = useBookingStore(state => state.cleanupExpiredLocks);

  useEffect(() => {
    if (!socket || !activeClubId) return;

    console.log('[BookingSocketListener] Registering event listeners for club:', activeClubId);

    // Booking events - handle both notifications and store updates
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[BookingSocketListener] Ignoring booking_created for different club');
        return;
      }

      // Show toast notification
      handleSocketEvent('booking_created', data);
      
      // Update booking store for real-time calendar sync
      updateBookingFromSocket(data.booking);
      
      console.log('[BookingSocketListener] Booking created - toast shown, store updated');
    };

    const handleBookingUpdated = (data: BookingUpdatedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[BookingSocketListener] Ignoring booking_updated for different club');
        return;
      }

      // Show toast notification
      handleSocketEvent('booking_updated', data);
      
      // Update booking store for real-time calendar sync
      updateBookingFromSocket(data.booking);
      
      console.log('[BookingSocketListener] Booking updated - toast shown, store updated');
    };

    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[BookingSocketListener] Ignoring booking_cancelled for different club');
        return;
      }

      // Show toast notification
      handleSocketEvent('booking_cancelled', data);
      
      // Remove from booking store for real-time calendar sync
      removeBookingFromSocket(data.bookingId);
      
      console.log('[BookingSocketListener] Booking cancelled - toast shown, store updated');
    };

    // Slot lock events - update booking store for real-time UI sync
    const handleSlotLocked = (data: SlotLockedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[BookingSocketListener] Ignoring slot_locked for different club');
        return;
      }

      handleSocketEvent('slot_locked', data);
      addLockedSlot(data);
      console.log('[BookingSocketListener] Slot locked - toast shown, store updated');
    };

    const handleSlotUnlocked = (data: SlotUnlockedEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[BookingSocketListener] Ignoring slot_unlocked for different club');
        return;
      }

      handleSocketEvent('slot_unlocked', data);
      removeLockedSlot(data.slotId);
      console.log('[BookingSocketListener] Slot unlocked - toast shown, store updated');
    };

    const handleLockExpired = (data: LockExpiredEvent) => {
      // Only process events for the current club
      if (data.clubId !== activeClubId) {
        console.log('[BookingSocketListener] Ignoring lock_expired for different club');
        return;
      }

      handleSocketEvent('lock_expired', data);
      removeLockedSlot(data.slotId);
      console.log('[BookingSocketListener] Lock expired - toast shown, store updated');
    };

    // Register event handlers
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_updated', handleBookingUpdated);
    socket.on('booking_cancelled', handleBookingCancelled);
    socket.on('slot_locked', handleSlotLocked);
    socket.on('slot_unlocked', handleSlotUnlocked);
    socket.on('lock_expired', handleLockExpired);

    // Cleanup on unmount or socket change
    return () => {
      console.log('[BookingSocketListener] Cleaning up event listeners');
      
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_updated', handleBookingUpdated);
      socket.off('booking_cancelled', handleBookingCancelled);
      socket.off('slot_locked', handleSlotLocked);
      socket.off('slot_unlocked', handleSlotUnlocked);
      socket.off('lock_expired', handleLockExpired);
    };
  }, [socket, activeClubId, updateBookingFromSocket, removeBookingFromSocket, addLockedSlot, removeLockedSlot]);

  // Periodic cleanup of expired slot locks
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupExpiredLocks();
    }, CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cleanupExpiredLocks]);

  // Log connection status changes
  useEffect(() => {
    if (isConnected && activeClubId) {
      console.log('[BookingSocketListener] Booking socket connected and ready for club:', activeClubId);
    } else if (!isConnected) {
      console.log('[BookingSocketListener] Booking socket disconnected');
    }
  }, [isConnected, activeClubId]);

  // This component doesn't render anything
  return null;
}
