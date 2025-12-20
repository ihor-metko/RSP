import { create } from "zustand";
import type {
  OperationsBooking,
  CreateBookingPayload,
  CreateBookingResponse,
} from "@/types/booking";
import {
  updateBookingInList,
  removeBookingFromList,
} from "@/utils/socketUpdateManager";

/**
 * Zustand store for managing bookings in club operations
 * 
 * Features:
 * - Fetch bookings by club and date with inflight guards
 * - Create and cancel bookings
 * - Short-polling mechanism for auto-refresh
 * - Cache management and invalidation
 * 
 * Usage:
 * ```tsx
 * const bookings = useBookingStore(state => state.bookings);
 * const fetchBookingsForDay = useBookingStore(state => state.fetchBookingsForDay);
 * 
 * useEffect(() => {
 *   fetchBookingsForDay(clubId, '2024-01-15');
 * }, [clubId, fetchBookingsForDay]);
 * ```
 */

interface BookingState {
  // State
  bookings: OperationsBooking[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  lastFetchParams: { clubId: string; date: string } | null;

  // Polling state
  pollingInterval: number | null;
  pollingTimeoutId: NodeJS.Timeout | null;

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

  // Polling controls
  startPolling: (clubId: string, date: string, intervalMs?: number) => void;
  stopPolling: () => void;

  // Selectors
  getBookingById: (id: string) => OperationsBooking | undefined;
  getBookingsByCourtId: (courtId: string) => OperationsBooking[];

  // Real-time update methods with timestamp checking
  updateBookingFromSocket: (booking: OperationsBooking) => void;
  removeBookingFromSocket: (bookingId: string) => void;
}

/**
 * Zustand store for managing bookings
 */
export const useBookingStore = create<BookingState>((set, get) => ({
  // Initial state
  bookings: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  lastFetchParams: null,
  pollingInterval: null,
  pollingTimeoutId: null,
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
          `/api/clubs/${clubId}/operations/bookings?date=${date}`
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

  // Start polling for bookings
  startPolling: (clubId: string, date: string, intervalMs = 15000) => {
    // Stop any existing polling
    get().stopPolling();

    // Initial fetch
    get().fetchBookingsForDay(clubId, date).catch(console.error);

    // Set up polling
    const timeoutId = setInterval(() => {
      get().fetchBookingsForDay(clubId, date).catch(console.error);
    }, intervalMs);

    set({
      pollingInterval: intervalMs,
      pollingTimeoutId: timeoutId,
    });
  },

  // Stop polling
  stopPolling: () => {
    const state = get();
    if (state.pollingTimeoutId) {
      clearInterval(state.pollingTimeoutId);
      set({ pollingInterval: null, pollingTimeoutId: null });
    }
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
}));
