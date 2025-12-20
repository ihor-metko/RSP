/**
 * useOperationsWebSocket Hook
 * 
 * Operations page-specific WebSocket integration that connects
 * WebSocket events directly to Zustand stores for automatic
 * UI updates without polling.
 * 
 * Features:
 * - Automatic store updates on WebSocket events
 * - Access control validation (only subscribe to authorized clubs)
 * - Auto-subscribe on club change
 * - Auto-unsubscribe on unmount or club change
 * - Connection state exposed for UI indicators
 * 
 * Usage:
 * ```tsx
 * const { isConnected, error } = useOperationsWebSocket({
 *   clubId: 'club-123',
 *   enabled: true,
 * });
 * 
 * // Show connection indicator
 * {!isConnected && <ConnectionIndicator />}
 * ```
 */

import { useEffect, useCallback, useMemo } from "react";
import { useWebSocket } from "./useWebSocket";
import { useBookingStore } from "@/stores/useBookingStore";
import { useCourtStore } from "@/stores/useCourtStore";
import { useUserStore } from "@/stores/useUserStore";
import type { BookingEventPayload, CourtAvailabilityEventPayload } from "@/lib/websocket";
import type { OperationsBooking, BookingStatus, PaymentStatus } from "@/types/booking";

/**
 * Options for useOperationsWebSocket
 */
export interface UseOperationsWebSocketOptions {
  clubId: string | null;
  enabled?: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
}

/**
 * Return type for useOperationsWebSocket
 */
export interface UseOperationsWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  subscribedClubId: string | null;
}

/**
 * Convert BookingEventPayload to partial OperationsBooking for store update
 * Only includes fields present in the payload to allow proper merging with existing data
 */
function convertToOperationsBooking(
  payload: BookingEventPayload
): Partial<OperationsBooking> & { id: string } {
  const booking: Partial<OperationsBooking> & { id: string } = {
    id: payload.id,
    userId: payload.userId,
    courtId: payload.courtId,
    start: payload.start,
    end: payload.end,
    price: payload.price,
    // Use bookingStatus if available, otherwise fall back to status
    bookingStatus: (payload.bookingStatus || payload.status || "Active") as BookingStatus,
    paymentStatus: (payload.paymentStatus || "Unpaid") as PaymentStatus,
  };

  // Only include optional fields if they're present in the payload
  if (payload.coachId !== undefined) {
    booking.coachId = payload.coachId;
  }

  return booking;
}

/**
 * useOperationsWebSocket Hook
 * 
 * Connects WebSocket events to Zustand stores for real-time Operations page updates.
 * Validates access control before subscribing to club channels.
 * 
 * @param options - Configuration options
 * @returns WebSocket connection state
 */
export function useOperationsWebSocket(
  options: UseOperationsWebSocketOptions
): UseOperationsWebSocketReturn {
  const { clubId, enabled = true, onConnectionChange } = options;

  // Get stores
  const { updateBookingFromEvent, addBookingFromEvent, removeBookingFromEvent } = useBookingStore();
  const { invalidateCourts } = useCourtStore();
  const adminStatus = useUserStore((state) => state.adminStatus);
  const user = useUserStore((state) => state.user);

  /**
   * Validate if user has access to the specified club
   */
  const hasClubAccess = useCallback((targetClubId: string): boolean => {
    if (!adminStatus?.isAdmin) {
      return false;
    }

    // Root admin has access to all clubs
    if (user?.isRoot) {
      return true;
    }

    // Club admin: check if clubId is in their managed IDs
    if (adminStatus.adminType === "club_admin") {
      return adminStatus.managedIds.includes(targetClubId);
    }

    // Organization admin: We need to verify the club belongs to their org
    // This is validated server-side, but we can do a basic check here
    // The server will reject unauthorized subscriptions anyway
    if (adminStatus.adminType === "organization_admin") {
      // Allow subscription attempt; server will validate
      return true;
    }

    return false;
  }, [adminStatus, user]);

  /**
   * Handle booking created event
   */
  const handleBookingCreated = useCallback((data: BookingEventPayload) => {
    // Validate payload - check presence and type
    if (!data || typeof data.id !== 'string' || !data.id || typeof data.clubId !== 'string' || !data.clubId) {
      console.warn("[Operations WebSocket] Invalid booking created payload:", data);
      return;
    }
    
    // Filter by active club - ignore events from other clubs
    if (clubId && data.clubId !== clubId) {
      console.log("[Operations WebSocket] Ignoring booking created event from different club:", data.clubId);
      return;
    }
    
    console.log("[Operations WebSocket] Booking created:", data.id);
    
    // Convert to OperationsBooking and add to store
    const booking = convertToOperationsBooking(data);
    addBookingFromEvent(booking);
  }, [addBookingFromEvent, clubId]);

  /**
   * Handle booking updated event
   */
  const handleBookingUpdated = useCallback((data: BookingEventPayload) => {
    // Validate payload - check presence and type
    if (!data || typeof data.id !== 'string' || !data.id || typeof data.clubId !== 'string' || !data.clubId) {
      console.warn("[Operations WebSocket] Invalid booking updated payload:", data);
      return;
    }
    
    // Filter by active club - ignore events from other clubs
    if (clubId && data.clubId !== clubId) {
      console.log("[Operations WebSocket] Ignoring booking updated event from different club:", data.clubId);
      return;
    }
    
    console.log("[Operations WebSocket] Booking updated:", data.id);
    
    // Convert to OperationsBooking and update in store
    const booking = convertToOperationsBooking(data);
    updateBookingFromEvent(booking);
  }, [updateBookingFromEvent, clubId]);

  /**
   * Handle booking deleted event
   */
  const handleBookingDeleted = useCallback((data: { id: string; clubId: string }) => {
    // Validate payload - check presence and type
    if (!data || typeof data.id !== 'string' || !data.id || typeof data.clubId !== 'string' || !data.clubId) {
      console.warn("[Operations WebSocket] Invalid booking deleted payload:", data);
      return;
    }
    
    // Filter by active club - ignore events from other clubs
    if (clubId && data.clubId !== clubId) {
      console.log("[Operations WebSocket] Ignoring booking deleted event from different club:", data.clubId);
      return;
    }
    
    console.log("[Operations WebSocket] Booking deleted:", data.id);
    
    // Use store's remove method
    removeBookingFromEvent(data.id);
  }, [removeBookingFromEvent, clubId]);

  /**
   * Handle court availability event
   */
  const handleCourtAvailability = useCallback((data: CourtAvailabilityEventPayload) => {
    // Validate payload - check presence and type
    if (!data || typeof data.clubId !== 'string' || !data.clubId || typeof data.courtId !== 'string' || !data.courtId) {
      console.warn("[Operations WebSocket] Invalid court availability payload:", data);
      return;
    }
    
    // Filter by active club - ignore events from other clubs
    if (clubId && data.clubId !== clubId) {
      console.log("[Operations WebSocket] Ignoring court availability event from different club:", data.clubId);
      return;
    }
    
    console.log("[Operations WebSocket] Court availability changed:", data.courtId);
    
    // Invalidate court cache to trigger refetch
    // This ensures availability is updated
    invalidateCourts();
    
    // Also invalidate bookings to refresh the calendar
    useBookingStore.getState().invalidateBookings();
  }, [invalidateCourts, clubId]);

  /**
   * WebSocket event handlers
   */
  const handlers = useMemo(() => ({
    onBookingCreated: handleBookingCreated,
    onBookingUpdated: handleBookingUpdated,
    onBookingDeleted: handleBookingDeleted,
    onCourtAvailability: handleCourtAvailability,
    onConnect: () => {
      console.log("[Operations WebSocket] Connected");
      onConnectionChange?.(true);
    },
    onDisconnect: () => {
      console.log("[Operations WebSocket] Disconnected");
      onConnectionChange?.(false);
    },
    onError: (error: Error) => {
      console.error("[Operations WebSocket] Error:", error);
    },
  }), [
    handleBookingCreated,
    handleBookingUpdated,
    handleBookingDeleted,
    handleCourtAvailability,
    onConnectionChange,
  ]);

  /**
   * Initialize WebSocket connection
   */
  const {
    isConnected,
    isConnecting,
    error,
    subscribe,
    unsubscribe,
    subscribedClubs,
  } = useWebSocket(handlers, {
    autoConnect: enabled,
  });

  /**
   * Subscribe to club channel when clubId changes and user has access
   */
  useEffect(() => {
    if (!enabled || !clubId || !isConnected) {
      return;
    }

    // Validate access before subscribing
    if (!hasClubAccess(clubId)) {
      console.warn("[Operations WebSocket] Access denied to club:", clubId);
      return;
    }

    // Subscribe to new club
    console.log("[Operations WebSocket] Subscribing to club:", clubId);
    subscribe(clubId);

    // Cleanup: unsubscribe on unmount or club change
    return () => {
      if (clubId) {
        console.log("[Operations WebSocket] Unsubscribing from club:", clubId);
        unsubscribe(clubId);
      }
    };
  }, [
    enabled,
    clubId,
    isConnected,
    hasClubAccess,
    subscribe,
    unsubscribe,
  ]);

  return {
    isConnected,
    isConnecting,
    error,
    subscribedClubId: clubId && subscribedClubs.has(clubId) ? clubId : null,
  };
}
