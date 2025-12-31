import { useState, useCallback } from 'react';
import { useSocketStore } from '@/stores/useSocketStore';
import { useBookingStore } from '@/stores/useBookingStore';

/**
 * Custom hook for managing court availability with real-time WebSocket updates
 * 
 * This hook provides reactive state that automatically updates when:
 * - Socket connection status changes
 * - Bookings are created/updated/cancelled (via store)
 * - Slots are locked/unlocked (via store)
 * 
 * The hook doesn't listen to socket events directly. Instead, it subscribes
 * to the centralized stores (useSocketStore and useBookingStore) which are
 * updated by GlobalSocketListener. This prevents duplicate event subscriptions.
 * 
 * Features:
 * - Reactive to socket connection state
 * - Reactive to booking store changes
 * - No duplicate socket event listeners
 * - Automatic cleanup on component unmount
 * - Development mode (React StrictMode) safe
 * 
 * @param clubId - The club ID (for logging purposes)
 * @param onAvailabilityChange - Optional callback when availability changes
 * @returns Socket connection status, refresh key, and locked slots
 */
export function useCourtAvailability(
  clubId: string | null,
  onAvailabilityChange?: () => void
) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get socket connection state from store
  // We use OR because either socket (notification or booking) being connected
  // means we can receive real-time updates. NotificationSocket is always active
  // for general updates, while BookingSocket provides club-specific updates when
  // viewing the operations page.
  const isConnected = useSocketStore((state) => 
    state.notificationConnected || state.bookingConnected
  );
  
  // Get booking data from store (this will auto-update via GlobalSocketListener)
  const lockedSlots = useBookingStore((state) => state.lockedSlots);

  // Function to trigger availability refresh
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    onAvailabilityChange?.();
    console.log('[useCourtAvailability] Triggering availability refresh for club:', clubId);
  }, [onAvailabilityChange, clubId]);

  return {
    isConnected,
    refreshKey,
    lockedSlots,
    triggerRefresh,
  };
}
