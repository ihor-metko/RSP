import { create } from "zustand";

/**
 * Player booking type for profile display
 */
export interface ProfileBooking {
  id: string;
  courtId: string;
  start: string;
  end: string;
  price: number;
  status: string;
  bookingStatus: string;
  paymentStatus: string;
  cancelReason?: string | null;
  reservationExpiresAt: string | null;
  court?: {
    id: string;
    name: string;
    club?: {
      id: string;
      name: string;
    };
  };
}

/**
 * Activity history item (cancelled unpaid bookings)
 */
interface ActivityHistoryItem {
  id: string;
  courtId: string;
  start: string;
  end: string;
  price: number;
  bookingStatus: string;
  paymentStatus: string;
  cancelReason: string | null;
  createdAt: string;
  court: {
    id: string;
    name: string;
    club: {
      id: string;
      name: string;
    };
  };
}

/**
 * Profile data container
 */
interface ProfileData {
  upcomingBookings: ProfileBooking[];
  pastBookings: ProfileBooking[];
  activityHistory: ActivityHistoryItem[];
  hasMoreUpcoming: boolean;
  hasMorePast: boolean;
  hasMoreActivity: boolean;
}

/**
 * Profile store state
 */
interface ProfileState {
  // State
  upcomingBookings: ProfileBooking[];
  pastBookings: ProfileBooking[];
  activityHistory: ActivityHistoryItem[];
  loading: boolean;
  upcomingLoading: boolean;
  pastLoading: boolean;
  activityLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  hasMoreUpcoming: boolean;
  hasMorePast: boolean;
  hasMoreActivity: boolean;

  // Internal inflight guards
  _inflightFetch: Promise<ProfileData> | null;
  _inflightUpcoming: Promise<ProfileBooking[]> | null;
  _inflightPast: Promise<ProfileBooking[]> | null;
  _inflightActivity: Promise<ActivityHistoryItem[]> | null;

  // Actions
  fetchProfileData: () => Promise<ProfileData>;
  fetchProfileDataIfNeeded: (options?: { force?: boolean }) => Promise<ProfileData>;
  refreshProfileData: () => Promise<ProfileData>;
  invalidateProfile: () => void;

  // Pagination actions
  loadMoreUpcoming: () => Promise<void>;
  loadMorePast: () => Promise<void>;
  loadMoreActivity: () => Promise<void>;

  // Selectors
  isDataStale: () => boolean;
  hasData: () => boolean;
}

/**
 * Items per page for pagination
 */
const ITEMS_PER_PAGE = 5;

/**
 * Cache validity duration (5 minutes)
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Zustand store for managing player profile bookings
 *
 * This store is the single source of truth for profile-related data:
 * - Upcoming bookings (unpaid and paid)
 * - Past bookings (completed, no-show, etc.)
 * - Activity history (cancelled unpaid bookings)
 *
 * Features:
 * - Lazy loading with inflight guards
 * - Pagination support for all three data sources
 * - Cache management with invalidation
 * - Navigation-aware behavior (only refetch if stale/invalidated)
 *
 * Usage:
 * ```tsx
 * const upcomingBookings = useProfileStore(state => state.upcomingBookings);
 * const fetchProfileData = useProfileStore(state => state.fetchProfileData);
 * const invalidateProfile = useProfileStore(state => state.invalidateProfile);
 *
 * useEffect(() => {
 *   fetchProfileDataIfNeeded();
 * }, []);
 *
 * // After booking/payment:
 * invalidateProfile();
 * ```
 */
export const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  upcomingBookings: [],
  pastBookings: [],
  activityHistory: [],
  loading: false,
  upcomingLoading: false,
  pastLoading: false,
  activityLoading: false,
  error: null,
  lastFetchedAt: null,
  hasMoreUpcoming: true,
  hasMorePast: true,
  hasMoreActivity: true,
  _inflightFetch: null,
  _inflightUpcoming: null,
  _inflightPast: null,
  _inflightActivity: null,

  /**
   * Fetch all profile data (upcoming, past, activity history)
   * This performs three API calls in parallel and caches the results
   */
  fetchProfileData: async () => {
    const state = get();

    // If already fetching, return the inflight promise
    if (state._inflightFetch) {
      return state._inflightFetch;
    }

    // Create new fetch promise
    const fetchPromise = (async (): Promise<ProfileData> => {
      set({ loading: true, error: null });

      try {
        // Fetch all three data sources in parallel
        const [upcomingResponse, pastResponse, activityResponse] = await Promise.all([
          fetch(`/api/bookings?upcoming=true&skip=0&take=${ITEMS_PER_PAGE}`),
          fetch(`/api/bookings?upcoming=false&skip=0&take=${ITEMS_PER_PAGE}`),
          fetch(`/api/activity-history?skip=0&take=${ITEMS_PER_PAGE}`),
        ]);

        // Check for auth errors
        if (upcomingResponse.status === 401 || pastResponse.status === 401 || activityResponse.status === 401) {
          throw new Error("Unauthorized");
        }

        // Check for errors
        if (!upcomingResponse.ok || !pastResponse.ok || !activityResponse.ok) {
          throw new Error("Failed to fetch profile data");
        }

        // Parse responses
        const upcoming: ProfileBooking[] = await upcomingResponse.json();
        const past: ProfileBooking[] = await pastResponse.json();
        const activity: ActivityHistoryItem[] = await activityResponse.json();

        // Helper to determine if there are more items to paginate
        const hasMoreItems = (items: unknown[]) => items.length === ITEMS_PER_PAGE;

        const profileData: ProfileData = {
          upcomingBookings: upcoming,
          pastBookings: past,
          activityHistory: activity,
          hasMoreUpcoming: hasMoreItems(upcoming),
          hasMorePast: hasMoreItems(past),
          hasMoreActivity: hasMoreItems(activity),
        };

        set({
          upcomingBookings: upcoming,
          pastBookings: past,
          activityHistory: activity,
          hasMoreUpcoming: hasMoreItems(upcoming),
          hasMorePast: hasMoreItems(past),
          hasMoreActivity: hasMoreItems(activity),
          loading: false,
          lastFetchedAt: Date.now(),
          _inflightFetch: null,
        });

        return profileData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch profile data";
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

  /**
   * Fetch profile data only if not already loaded or if stale
   */
  fetchProfileDataIfNeeded: async (options = { force: false }) => {
    const state = get();

    // Check if we have fresh cached data
    const isFresh = state.lastFetchedAt && Date.now() - state.lastFetchedAt < CACHE_DURATION_MS;

    if (!options.force && isFresh && state.hasData()) {
      return {
        upcomingBookings: state.upcomingBookings,
        pastBookings: state.pastBookings,
        activityHistory: state.activityHistory,
        hasMoreUpcoming: state.hasMoreUpcoming,
        hasMorePast: state.hasMorePast,
        hasMoreActivity: state.hasMoreActivity,
      };
    }

    return get().fetchProfileData();
  },

  /**
   * Force refresh all profile data
   */
  refreshProfileData: async () => {
    return get().fetchProfileData();
  },

  /**
   * Invalidate cached profile data (forces refetch on next access)
   */
  invalidateProfile: () => {
    set({ lastFetchedAt: null });
  },

  /**
   * Load more upcoming bookings
   */
  loadMoreUpcoming: async () => {
    const state = get();

    // If already loading, return early
    if (state._inflightUpcoming || state.upcomingLoading) {
      return;
    }

    const fetchPromise = (async () => {
      set({ upcomingLoading: true });

      try {
        const skip = state.upcomingBookings.length;
        const response = await fetch(`/api/bookings?upcoming=true&skip=${skip}&take=${ITEMS_PER_PAGE}`);

        if (response.status === 401) {
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          throw new Error("Failed to load more upcoming bookings");
        }

        const newBookings: ProfileBooking[] = await response.json();

        set((state) => ({
          upcomingBookings: [...state.upcomingBookings, ...newBookings],
          hasMoreUpcoming: newBookings.length === ITEMS_PER_PAGE,
          upcomingLoading: false,
          _inflightUpcoming: null,
        }));
      } catch (error) {
        console.error("Error loading more upcoming bookings:", error);
        set({
          upcomingLoading: false,
          _inflightUpcoming: null,
        });
        throw error;
      }
    })();

    set({ _inflightUpcoming: fetchPromise });
    return fetchPromise;
  },

  /**
   * Load more past bookings
   */
  loadMorePast: async () => {
    const state = get();

    // If already loading, return early
    if (state._inflightPast || state.pastLoading) {
      return;
    }

    const fetchPromise = (async () => {
      set({ pastLoading: true });

      try {
        const skip = state.pastBookings.length;
        const response = await fetch(`/api/bookings?upcoming=false&skip=${skip}&take=${ITEMS_PER_PAGE}`);

        if (response.status === 401) {
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          throw new Error("Failed to load more past bookings");
        }

        const newBookings: ProfileBooking[] = await response.json();

        set((state) => ({
          pastBookings: [...state.pastBookings, ...newBookings],
          hasMorePast: newBookings.length === ITEMS_PER_PAGE,
          pastLoading: false,
          _inflightPast: null,
        }));
      } catch (error) {
        console.error("Error loading more past bookings:", error);
        set({
          pastLoading: false,
          _inflightPast: null,
        });
        throw error;
      }
    })();

    set({ _inflightPast: fetchPromise });
    return fetchPromise;
  },

  /**
   * Load more activity history
   */
  loadMoreActivity: async () => {
    const state = get();

    // If already loading, return early
    if (state._inflightActivity || state.activityLoading) {
      return;
    }

    const fetchPromise = (async () => {
      set({ activityLoading: true });

      try {
        const skip = state.activityHistory.length;
        const response = await fetch(`/api/activity-history?skip=${skip}&take=${ITEMS_PER_PAGE}`);

        if (response.status === 401) {
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          throw new Error("Failed to load more activity history");
        }

        const newHistory: ActivityHistoryItem[] = await response.json();

        set((state) => ({
          activityHistory: [...state.activityHistory, ...newHistory],
          hasMoreActivity: newHistory.length === ITEMS_PER_PAGE,
          activityLoading: false,
          _inflightActivity: null,
        }));
      } catch (error) {
        console.error("Error loading more activity history:", error);
        set({
          activityLoading: false,
          _inflightActivity: null,
        });
        throw error;
      }
    })();

    set({ _inflightActivity: fetchPromise });
    return fetchPromise;
  },

  /**
   * Check if cached data is stale
   */
  isDataStale: () => {
    const state = get();
    if (!state.lastFetchedAt) return true;
    return Date.now() - state.lastFetchedAt >= CACHE_DURATION_MS;
  },

  /**
   * Check if store has any data
   */
  hasData: () => {
    const state = get();
    return state.upcomingBookings.length > 0 || state.pastBookings.length > 0 || state.activityHistory.length > 0;
  },
}));
