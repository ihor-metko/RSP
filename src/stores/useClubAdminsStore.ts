import { create } from "zustand";

/**
 * Club admin data structure
 */
interface ClubAdmin {
  id: string;
  name: string | null;
  email: string;
  role: "CLUB_OWNER" | "CLUB_ADMIN";
}

/**
 * Cached club admins by club ID
 */
interface AdminsCache {
  admins: ClubAdmin[];
  fetchedAt: number;
}

/**
 * Club admins store state
 */
interface ClubAdminsState {
  // State - keyed by clubId
  adminsByClubId: Record<string, AdminsCache>;
  loading: boolean;
  error: string | null;

  // Internal inflight guards - keyed by clubId
  _inflightFetchByClubId: Record<string, Promise<ClubAdmin[]>>;

  // Actions
  fetchClubAdminsIfNeeded: (
    clubId: string,
    options?: { force?: boolean }
  ) => Promise<ClubAdmin[]>;

  addClubAdmin: (clubId: string, admin: ClubAdmin) => void;
  removeClubAdmin: (clubId: string, adminId: string) => void;
  invalidateClubAdmins: (clubId: string) => void;
  invalidateAll: () => void;

  // Selectors
  getClubAdmins: (clubId: string) => ClubAdmin[] | null;
  isLoading: (clubId: string) => boolean;
}

/**
 * Cache validity duration (5 minutes)
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Zustand store for managing club admins
 * Caches club admins data per club to avoid repeated fetches
 */
export const useClubAdminsStore = create<ClubAdminsState>((set, get) => ({
  // Initial state
  adminsByClubId: {},
  loading: false,
  error: null,
  _inflightFetchByClubId: {},

  /**
   * Fetch club admins if needed with inflight guard
   * - If !force and cache exists and is fresh, returns cached data
   * - If an inflight request exists for this clubId, returns that Promise
   * - Otherwise, performs a new network request
   */
  fetchClubAdminsIfNeeded: async (clubId: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // Check if we have fresh cached data
    const cached = state.adminsByClubId[clubId];
    const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS;

    if (!force && isFresh) {
      return Promise.resolve(cached.admins);
    }

    // If there's already an inflight request for this clubId, return it
    if (clubId in state._inflightFetchByClubId) {
      return state._inflightFetchByClubId[clubId];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<ClubAdmin[]> => {
      set({ loading: true, error: null });

      try {
        const response = await fetch(`/api/admin/clubs/${clubId}/admins`);

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => ({ error: "Failed to fetch club admins" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const admins: ClubAdmin[] = await response.json();

        // Update cache
        set((state) => {
          const newInflight = { ...state._inflightFetchByClubId };
          delete newInflight[clubId];

          return {
            adminsByClubId: {
              ...state.adminsByClubId,
              [clubId]: {
                admins,
                fetchedAt: Date.now(),
              },
            },
            loading: false,
            error: null,
            _inflightFetchByClubId: newInflight,
          };
        });

        return admins;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch club admins";

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
   * Optimistically add a club admin to the cache
   */
  addClubAdmin: (clubId: string, admin: ClubAdmin) => {
    set((state) => {
      const cached = state.adminsByClubId[clubId];
      if (!cached) return state;

      return {
        adminsByClubId: {
          ...state.adminsByClubId,
          [clubId]: {
            admins: [...cached.admins, admin],
            fetchedAt: cached.fetchedAt,
          },
        },
      };
    });
  },

  /**
   * Optimistically remove a club admin from the cache
   */
  removeClubAdmin: (clubId: string, adminId: string) => {
    set((state) => {
      const cached = state.adminsByClubId[clubId];
      if (!cached) return state;

      return {
        adminsByClubId: {
          ...state.adminsByClubId,
          [clubId]: {
            admins: cached.admins.filter((admin) => admin.id !== adminId),
            fetchedAt: cached.fetchedAt,
          },
        },
      };
    });
  },

  /**
   * Invalidate club admins cache for a specific club
   */
  invalidateClubAdmins: (clubId: string) => {
    set((state) => {
      const newCache = { ...state.adminsByClubId };
      delete newCache[clubId];
      return { adminsByClubId: newCache };
    });
  },

  /**
   * Invalidate all club admins caches
   */
  invalidateAll: () => {
    set({ adminsByClubId: {}, error: null });
  },

  /**
   * Get club admins for a specific club
   */
  getClubAdmins: (clubId: string) => {
    const cached = get().adminsByClubId[clubId];
    return cached ? cached.admins : null;
  },

  /**
   * Check if club admins are currently loading for a club
   */
  isLoading: (clubId: string) => {
    const state = get();
    return state.loading && clubId in state._inflightFetchByClubId;
  },
}));
