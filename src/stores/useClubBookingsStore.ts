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
   * - Otherwise, performs a new network request
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
        // Constants for booking limits
        const MAX_SUMMARY_BOOKINGS = 100;
        const PREVIEW_BOOKINGS_LIMIT = 10;

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get week range
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        // Fetch bookings for the club
        const [todayResponse, weekResponse, upcomingResponse] = await Promise.all([
          fetch(
            `/api/admin/bookings?clubId=${clubId}&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}&perPage=${MAX_SUMMARY_BOOKINGS}`
          ),
          fetch(
            `/api/admin/bookings?clubId=${clubId}&dateFrom=${today.toISOString()}&dateTo=${weekFromNow.toISOString()}&perPage=${MAX_SUMMARY_BOOKINGS}`
          ),
          fetch(
            `/api/admin/bookings?clubId=${clubId}&dateFrom=${today.toISOString()}&perPage=${PREVIEW_BOOKINGS_LIMIT}`
          ),
        ]);

        if (!todayResponse.ok || !weekResponse.ok || !upcomingResponse.ok) {
          throw new Error("Failed to fetch bookings preview");
        }

        const [todayData, weekData, upcomingData] = await Promise.all([
          todayResponse.json(),
          weekResponse.json(),
          upcomingResponse.json(),
        ]);

        const previewData: BookingsPreviewData = {
          items: upcomingData.bookings.map((b: {
            id: string;
            courtName: string;
            clubName: string;
            userName: string | null;
            userEmail: string;
            start: string;
            end: string;
            bookingStatus: string;
            sportType: string;
          }) => ({
            id: b.id,
            courtName: b.courtName,
            clubName: b.clubName,
            userName: b.userName,
            userEmail: b.userEmail,
            start: b.start,
            end: b.end,
            status: b.bookingStatus,
            sportType: b.sportType,
          })),
          summary: {
            todayCount: todayData.total,
            weekCount: weekData.total,
            totalUpcoming: upcomingData.total,
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
