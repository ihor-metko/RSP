import { create } from "zustand";
import type {
  OperationsBooking,
  CreateBookingPayload,
  CreateBookingResponse,
} from "@/types/booking";
import type { SlotLockedEvent } from "@/types/socket";
import {
  updateBookingInList,
  removeBookingFromList,
} from "@/utils/socketUpdateManager";

/**
 * Slot lock expiration time in milliseconds (5 minutes)
 */
const LOCK_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Zustand store for managing bookings in club operations
 *
 * Features:
 * - Fetch bookings by club and date with inflight guards
 * - Create and cancel bookings
 * - Real-time updates via Socket.IO events
 * - Slot locking for temporary reservations
 * - Cache management and invalidation
 *
 * Note: Polling has been removed. The store relies entirely on Socket.IO events
 * for real-time updates (booking_created, booking_updated, booking_cancelled,
 * slot_locked, slot_unlocked).
 *
 * Usage:
 * ```tsx
 * const bookings = useBookingStore(state => state.bookings);
 * const lockedSlots = useBookingStore(state => state.lockedSlots);
 * const fetchBookingsForDay = useBookingStore(state => state.fetchBookingsForDay);
 *
 * useEffect(() => {
 *   fetchBookingsForDay(clubId, '2024-01-15');
 * }, [clubId, fetchBookingsForDay]);
 * ```
 */

interface LockedSlot {
  slotId: string;
  courtId: string;
  clubId: string;
  userId?: string;
  startTime: string;
  endTime: string;
  lockedAt: number;
}

interface BookingState {
  // State
  bookings: OperationsBooking[];
  lockedSlots: LockedSlot[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  lastFetchParams: { clubId: string; date: string } | null;

  // Internal inflight guards
  _inflightFetch: Promise<OperationsBooking[]> | null;

  // Actions
  setBookings: (bookings: OperationsBooking[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Fetch bookings for a specific club and date
  fetchBookingsForDay: (clubId: string, date: string) => Promise<OperationsBooking[]>;

  // Fetch bookings only if needed (not already loaded for this club/date)
  fetchBookingsIfNeeded: (
    clubId: string,
    date: string,
    options?: { force?: boolean }
  ) => Promise<OperationsBooking[]>;

  // Create a new booking
  createBooking: (payload: CreateBookingPayload) => Promise<CreateBookingResponse>;

  // Cancel a booking
  cancelBooking: (bookingId: string) => Promise<void>;

  // Invalidate cache (force refetch)
  invalidateBookings: () => void;

  // Selectors
  getBookingById: (id: string) => OperationsBooking | undefined;
  getBookingsByCourtId: (courtId: string) => OperationsBooking[];
  isSlotLocked: (courtId: string, startTime: string, endTime: string) => boolean;
  getLockedSlotsForCourt: (courtId: string) => LockedSlot[];

  // Real-time update methods with timestamp checking
  updateBookingFromSocket: (booking: OperationsBooking) => void;
  removeBookingFromSocket: (bookingId: string) => void;

  // Slot lock management
  addLockedSlot: (event: SlotLockedEvent) => void;
  removeLockedSlot: (slotId: string) => void;
  cleanupExpiredLocks: () => void;
}

/**
 * Zustand store for managing bookings
 */
export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  bookings: [],
  lockedSlots: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  lastFetchParams: null,
  _inflightFetch: null,

  // State setters
  setBookings: (bookings) => set({ bookings }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Fetch bookings for a specific day
  fetchBookingsForDay: async (clubId: string, date: string) => {
    const state = get();

    // If already fetching for the same params, return the inflight promise
    if (
      state._inflightFetch &&
      state.lastFetchParams?.clubId === clubId &&
      state.lastFetchParams?.date === date
    ) {
      return state._inflightFetch;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      set({ loading: true, error: null });

      try {
        const response = await fetch(
          `/api/admin/clubs/${clubId}/operations/bookings?date=${date}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to fetch bookings" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data: OperationsBooking[] = await response.json();

        set({
          bookings: data,
          loading: false,
          lastFetchedAt: Date.now(),
          lastFetchParams: { clubId, date },
          _inflightFetch: null,
        });

        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch bookings";
        set({
          error: errorMessage,
          loading: false,
          _inflightFetch: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetch: fetchPromise });
    return fetchPromise;
  },

  // Fetch bookings only if not already loaded or if forced
  fetchBookingsIfNeeded: async (
    clubId: string,
    date: string,
    options = { force: false }
  ) => {
    const state = get();

    // Check if we already have data for this club/date and it's recent
    const isSameParams =
      state.lastFetchParams?.clubId === clubId &&
      state.lastFetchParams?.date === date;

    const isRecentFetch =
      state.lastFetchedAt &&
      Date.now() - state.lastFetchedAt < 5000; // 5 seconds cache

    if (!options.force && isSameParams && isRecentFetch && state.bookings.length >= 0) {
      return state.bookings;
    }

    return get().fetchBookingsForDay(clubId, date);
  },

  // Create a new booking
  createBooking: async (payload: CreateBookingPayload) => {
    set({ error: null });

    try {
      const response = await fetch("/api/admin/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create booking" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: CreateBookingResponse = await response.json();

      // Invalidate cache to trigger refetch
      get().invalidateBookings();

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create booking";
      set({ error: errorMessage });
      throw error;
    }
  },

  // Cancel a booking
  cancelBooking: async (bookingId: string) => {
    set({ error: null });

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to cancel booking" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Invalidate cache to trigger refetch
      get().invalidateBookings();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel booking";
      set({ error: errorMessage });
      throw error;
    }
  },

  // Invalidate cached bookings
  invalidateBookings: () => {
    set({ lastFetchedAt: null, lastFetchParams: null });
  },

  // Selectors
  getBookingById: (id: string) => {
    const state = get();
    return state.bookings.find((booking) => booking.id === id);
  },

  getBookingsByCourtId: (courtId: string) => {
    const state = get();
    return state.bookings.filter((booking) => booking.courtId === courtId);
  },

  isSlotLocked: (courtId: string, startTime: string, endTime: string) => {
    const state = get();
    return state.lockedSlots.some(
      (lock) =>
        lock.courtId === courtId &&
        lock.startTime === startTime &&
        lock.endTime === endTime
    );
  },

  getLockedSlotsForCourt: (courtId: string) => {
    const state = get();
    return state.lockedSlots.filter((lock) => lock.courtId === courtId);
  },

  // Real-time update methods with timestamp checking
  updateBookingFromSocket: (booking: OperationsBooking) => {
    const currentBookings = get().bookings;
    const updatedBookings = updateBookingInList(currentBookings, booking);

    // Only update state if the booking list was modified (prevents unnecessary re-renders)
    if (updatedBookings !== currentBookings) {
      set({ bookings: updatedBookings });
    }
  },

  removeBookingFromSocket: (bookingId: string) => {
    const currentBookings = get().bookings;
    const updatedBookings = removeBookingFromList(currentBookings, bookingId);
    set({ bookings: updatedBookings });
  },

  // Slot lock management
  addLockedSlot: (event: SlotLockedEvent) => {
    const currentLocks = get().lockedSlots;

    // Check if slot is already locked (deduplication)
    const exists = currentLocks.some((lock) => lock.slotId === event.slotId);
    if (exists) {
      console.log('[BookingStore] Slot already locked, ignoring duplicate:', event.slotId);
      return;
    }

    const newLock: LockedSlot = {
      slotId: event.slotId,
      courtId: event.courtId,
      clubId: event.clubId,
      userId: event.userId,
      startTime: event.startTime,
      endTime: event.endTime,
      lockedAt: Date.now(),
    };

    set({ lockedSlots: [...currentLocks, newLock] });
    console.log('[BookingStore] Slot locked:', event.slotId);
  },

  removeLockedSlot: (slotId: string) => {
    const currentLocks = get().lockedSlots;
    const updatedLocks = currentLocks.filter((lock) => lock.slotId !== slotId);

    if (updatedLocks.length !== currentLocks.length) {
      set({ lockedSlots: updatedLocks });
      console.log('[BookingStore] Slot unlocked:', slotId);
    }
  },

  cleanupExpiredLocks: () => {
    const currentLocks = get().lockedSlots;
    const now = Date.now();

    const validLocks = currentLocks.filter(
      (lock) => now - lock.lockedAt < LOCK_EXPIRATION_MS
    );

    if (validLocks.length !== currentLocks.length) {
      set({ lockedSlots: validLocks });
      console.log(
        '[BookingStore] Cleaned up expired locks:',
        currentLocks.length - validLocks.length
      );
    }
  },
}));
