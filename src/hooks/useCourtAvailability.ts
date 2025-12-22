import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { useBookingStore } from '@/stores/useBookingStore';
import type {
  BookingCreatedEvent,
  BookingDeletedEvent,
  SlotLockedEvent,
  SlotUnlockedEvent,
  LockExpiredEvent,
} from '@/types/socket';

/**
 * Event deduplication timeout in milliseconds (5 seconds)
 */
const EVENT_DEDUPLICATION_TIMEOUT_MS = 5000;

/**
 * Custom hook for managing court availability with real-time WebSocket updates
 * 
 * Features:
 * - Fetches initial court availability from API
 * - Listens to WebSocket events for real-time updates
 * - Handles booking_created, booking_cancelled, slot_locked, slot_unlocked events
 * - Automatic cleanup on component unmount
 * - Deduplication of events
 * 
 * @param clubId - The club ID to filter events
 * @param onAvailabilityChange - Optional callback when availability changes
 * @returns Socket connection status and refresh function
 */
export function useCourtAvailability(
  clubId: string | null,
  onAvailabilityChange?: () => void
) {
  const { socket, isConnected } = useSocket();
  const [refreshKey, setRefreshKey] = useState(0);
  const lockedSlots = useBookingStore((state) => state.lockedSlots);
  const eventHandledRef = useRef<Set<string>>(new Set());

  // Function to trigger availability refresh
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    onAvailabilityChange?.();
    console.log('[useCourtAvailability] Triggering availability refresh');
  }, [onAvailabilityChange]);

  // Check if event has been handled recently (deduplication)
  const isEventHandled = useCallback((eventId: string) => {
    if (eventHandledRef.current.has(eventId)) {
      return true;
    }
    eventHandledRef.current.add(eventId);
    
    // Clean up old event IDs after deduplication timeout
    setTimeout(() => {
      eventHandledRef.current.delete(eventId);
    }, EVENT_DEDUPLICATION_TIMEOUT_MS);
    
    return false;
  }, []);

  useEffect(() => {
    if (!socket || !clubId) return;

    console.log('[useCourtAvailability] Setting up event listeners for club:', clubId);

    // Handle booking created - refresh if it affects this club
    // NOTE: Client-side filtering by clubId is LEGACY and will be removed.
    // Server now guarantees correct targeting via club-based rooms.
    // This guard remains temporarily for safety during migration.
    const handleBookingCreated = (data: BookingCreatedEvent) => {
      const eventId = `booking_created_${data.booking.id}`;
      if (isEventHandled(eventId)) return;

      if (data.clubId === clubId) {
        console.log('[useCourtAvailability] Booking created for this club, refreshing');
        triggerRefresh();
      }
    };

    // Handle booking cancelled - refresh if it affects this club
    // NOTE: Client-side filtering by clubId is LEGACY and will be removed.
    // Server now guarantees correct targeting via club-based rooms.
    // This guard remains temporarily for safety during migration.
    const handleBookingCancelled = (data: BookingDeletedEvent) => {
      const eventId = `booking_cancelled_${data.bookingId}`;
      if (isEventHandled(eventId)) return;

      if (data.clubId === clubId) {
        console.log('[useCourtAvailability] Booking cancelled for this club, refreshing');
        triggerRefresh();
      }
    };

    // Handle slot locked - trigger refresh for visual update
    // NOTE: Client-side filtering by clubId is LEGACY and will be removed.
    // Server now guarantees correct targeting via club-based rooms.
    // This guard remains temporarily for safety during migration.
    const handleSlotLocked = (data: SlotLockedEvent) => {
      const eventId = `slot_locked_${data.slotId}`;
      if (isEventHandled(eventId)) return;

      if (data.clubId === clubId) {
        console.log('[useCourtAvailability] Slot locked for this club, refreshing');
        triggerRefresh();
      }
    };

    // Handle slot unlocked - trigger refresh
    // NOTE: Client-side filtering by clubId is LEGACY and will be removed.
    // Server now guarantees correct targeting via club-based rooms.
    // This guard remains temporarily for safety during migration.
    const handleSlotUnlocked = (data: SlotUnlockedEvent) => {
      const eventId = `slot_unlocked_${data.slotId}`;
      if (isEventHandled(eventId)) return;

      if (data.clubId === clubId) {
        console.log('[useCourtAvailability] Slot unlocked for this club, refreshing');
        triggerRefresh();
      }
    };

    // Handle lock expired - trigger refresh
    // NOTE: Client-side filtering by clubId is LEGACY and will be removed.
    // Server now guarantees correct targeting via club-based rooms.
    // This guard remains temporarily for safety during migration.
    const handleLockExpired = (data: LockExpiredEvent) => {
      const eventId = `lock_expired_${data.slotId}`;
      if (isEventHandled(eventId)) return;

      if (data.clubId === clubId) {
        console.log('[useCourtAvailability] Lock expired for this club, refreshing');
        triggerRefresh();
      }
    };

    // Register event listeners
    socket.on('booking_created', handleBookingCreated);
    socket.on('booking_cancelled', handleBookingCancelled);
    socket.on('slot_locked', handleSlotLocked);
    socket.on('slot_unlocked', handleSlotUnlocked);
    socket.on('lock_expired', handleLockExpired);

    // Cleanup on unmount or when clubId/socket changes
    return () => {
      console.log('[useCourtAvailability] Cleaning up event listeners');
      socket.off('booking_created', handleBookingCreated);
      socket.off('booking_cancelled', handleBookingCancelled);
      socket.off('slot_locked', handleSlotLocked);
      socket.off('slot_unlocked', handleSlotUnlocked);
      socket.off('lock_expired', handleLockExpired);
      eventHandledRef.current.clear();
    };
  }, [socket, clubId, triggerRefresh, isEventHandled]);

  return {
    isConnected,
    refreshKey,
    lockedSlots,
    triggerRefresh,
  };
}
