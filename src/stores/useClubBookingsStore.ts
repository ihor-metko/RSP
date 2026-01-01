import { create } from "zustand";

/**
 * Booking preview data for club details page
 */
interface BookingPreview {
  id: string;
  courtName: string;
  clubName: string;
  userName: string | null;
  userEmail: string;
  start: string;
  end: string;
  status: string;
  sportType: string;
}

interface BookingsPreviewData {
  items: BookingPreview[];
  summary: {
    todayCount: number;
    weekCount: number;
    totalUpcoming: number;
  };
}

/**
 * Cached bookings preview by club ID
 */
interface BookingsCache {
  data: BookingsPreviewData;
  fetchedAt: number;
}

/**
 * Club bookings store state
 */
interface ClubBookingsState {
  // State - keyed by clubId
  bookingsPreviewByClubId: Record<string, BookingsCache>;
  loading: boolean;
  error: string | null;

  // Internal inflight Promise guards (not exposed)
  _inflightFetchByClubId: Record<string, Promise<BookingsPreviewData>>;

  // Actions
  fetchBookingsPreviewIfNeeded: (
    clubId: string,
    options?: { force?: boolean }
  ) => Promise<BookingsPreviewData>;

  invalidateBookingsPreview: (clubId: string) => void;
  invalidateAll: () => void;

  // Selectors
  getBookingsPreview: (clubId: string) => BookingsPreviewData | null;
  isLoading: (clubId: string) => boolean;
}

/**
 * Cache validity duration (5 minutes)
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Zustand store for managing club bookings preview
 * Caches bookings preview data per club to avoid repeated fetches
 */
export const useClubBookingsStore = create<ClubBookingsState>((set, get) => ({
  // Initial state
  bookingsPreviewByClubId: {},
  loading: false,
  error: null,
  _inflightFetchByClubId: {},

  /**
   * Fetch bookings preview if needed with inflight guard
   * - If !force and cache exists and is fresh, returns cached data
   * - If an inflight request exists for this clubId, returns that Promise
   * - Otherwise, performs a new network request using the optimized overview endpoint
   */
  fetchBookingsPreviewIfNeeded: async (clubId: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // Check if we have fresh cached data
    const cached = state.bookingsPreviewByClubId[clubId];
    const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS;

    if (!force && isFresh) {
      return Promise.resolve(cached.data);
    }

    // If there's already an inflight request for this clubId, return it
    if (clubId in state._inflightFetchByClubId) {
      return state._inflightFetchByClubId[clubId];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<BookingsPreviewData> => {
      set({ loading: true, error: null });

      try {
        // Use the new optimized overview endpoint (single request instead of 3)
        const response = await fetch(`/api/admin/clubs/${clubId}/bookings/overview`);

        if (!response.ok) {
          throw new Error("Failed to fetch bookings preview");
        }

        const data = await response.json();

        // Transform API response to internal format
        const previewData: BookingsPreviewData = {
          items: data.upcomingBookings.map((b: {
            id: string;
            courtName: string;
            clubName: string;
            userName: string | null;
            userEmail: string;
            start: string;
            end: string;
            status: string;
            sportType: string;
          }) => ({
            id: b.id,
            courtName: b.courtName,
            clubName: b.clubName,
            userName: b.userName,
            userEmail: b.userEmail,
            start: b.start,
            end: b.end,
            status: b.status,
            sportType: b.sportType,
          })),
          summary: {
            todayCount: data.todayCount,
            weekCount: data.weekCount,
            totalUpcoming: data.upcomingCount,
          },
        };

        // Update cache
        set((state) => {
          const newInflight = { ...state._inflightFetchByClubId };
          delete newInflight[clubId];

          return {
            bookingsPreviewByClubId: {
              ...state.bookingsPreviewByClubId,
              [clubId]: {
                data: previewData,
                fetchedAt: Date.now(),
              },
            },
            loading: false,
            error: null,
            _inflightFetchByClubId: newInflight,
          };
        });

        return previewData;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch bookings preview";

        // Clear inflight for this clubId
        set((state) => {
          const newInflight = { ...state._inflightFetchByClubId };
          delete newInflight[clubId];

          return {
            error: errorMessage,
            loading: false,
            _inflightFetchByClubId: newInflight,
          };
        });

        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchByClubId: {
        ...state._inflightFetchByClubId,
        [clubId]: inflightPromise,
      },
    }));

    return inflightPromise;
  },

  /**
   * Invalidate bookings preview cache for a specific club
   */
  invalidateBookingsPreview: (clubId: string) => {
    set((state) => {
      const newCache = { ...state.bookingsPreviewByClubId };
      delete newCache[clubId];
      return { bookingsPreviewByClubId: newCache };
    });
  },

  /**
   * Invalidate all bookings preview caches
   */
  invalidateAll: () => {
    set({ bookingsPreviewByClubId: {}, error: null });
  },

  /**
   * Get bookings preview for a specific club
   */
  getBookingsPreview: (clubId: string) => {
    const cached = get().bookingsPreviewByClubId[clubId];
    return cached ? cached.data : null;
  },

  /**
   * Check if bookings are currently loading for a club
   */
  isLoading: (clubId: string) => {
    const state = get();
    return state.loading && clubId in state._inflightFetchByClubId;
  },
}));
