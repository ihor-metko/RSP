'use client';

/**
 * Global Socket.IO Listener Component
 * 
 * Subscribes to all real-time Socket.IO events and displays toast notifications.
 * This component is initialized once at app startup and works across all pages.
 * 
 * Events monitored:
 * - booking_created, booking_updated, booking_cancelled
 * - slot_locked, slot_unlocked, lock_expired
 * - payment_confirmed, payment_failed
 * 
 * Features:
 * - Single global listener (no route-based conditions)
 * - Automatic duplicate prevention
 * - Multi-toast queue support
 * - Auto-dismiss after 5-7 seconds
 */

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  BookingCreatedEvent,
  BookingUpdatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
  LockExpiredEvent,
  PaymentConfirmedEvent,
  PaymentFailedEvent,
} from '@/types/socket';
import { handleSocketEvent, cleanupNotificationManager } from '@/utils/globalNotificationManager';

/**
 * Typed Socket.IO client
 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Global Socket Listener Component
 * 
 * Usage: Add this component to the root layout to enable global notifications
 */
export function GlobalSocketListener() {
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Initialize Socket.IO client
    const socket: TypedSocket = io({
      path: '/socket.io',
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[GlobalSocketListener] Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[GlobalSocketListener] Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[GlobalSocketListener] Connection error:', error.message);
    });

    // Booking events
    socket.on('booking_created', (data: BookingCreatedEvent) => {
      handleSocketEvent('booking_created', data);
    });

    socket.on('booking_updated', (data: BookingUpdatedEvent) => {
      handleSocketEvent('booking_updated', data);
    });

    socket.on('booking_cancelled', (data: BookingDeletedEvent) => {
      handleSocketEvent('booking_cancelled', data);
    });

    // Legacy event names for backward compatibility
    socket.on('bookingCreated', (data: BookingCreatedEvent) => {
      handleSocketEvent('booking_created', data);
    });

    socket.on('bookingUpdated', (data: BookingUpdatedEvent) => {
      handleSocketEvent('booking_updated', data);
    });

    socket.on('bookingDeleted', (data: BookingDeletedEvent) => {
      handleSocketEvent('booking_cancelled', data);
    });

    // Slot lock events
    socket.on('slot_locked', (data: SlotLockedEvent) => {
      handleSocketEvent('slot_locked', data);
    });

    socket.on('slot_unlocked', (data: SlotUnlockedEvent) => {
      handleSocketEvent('slot_unlocked', data);
    });

    socket.on('lock_expired', (data: LockExpiredEvent) => {
      handleSocketEvent('lock_expired', data);
    });

    // Payment events
    socket.on('payment_confirmed', (data: PaymentConfirmedEvent) => {
      handleSocketEvent('payment_confirmed', data);
    });

    socket.on('payment_failed', (data: PaymentFailedEvent) => {
      handleSocketEvent('payment_failed', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[GlobalSocketListener] Cleaning up socket listeners');
      
      // Remove all event listeners
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('booking_created');
      socket.off('booking_updated');
      socket.off('booking_cancelled');
      socket.off('bookingCreated');
      socket.off('bookingUpdated');
      socket.off('bookingDeleted');
      socket.off('slot_locked');
      socket.off('slot_unlocked');
      socket.off('lock_expired');
      socket.off('payment_confirmed');
      socket.off('payment_failed');
      
      // Disconnect socket
      socket.disconnect();
      
      // Clean up notification manager
      cleanupNotificationManager();
    };
  }, []); // Empty dependency array - initialize only once

  // This component doesn't render anything
  return null;
}
