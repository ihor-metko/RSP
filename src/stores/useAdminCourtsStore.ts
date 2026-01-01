import { create } from "zustand";
import type {
  Court,
  CourtDetail,
  CreateCourtPayload,
  UpdateCourtPayload,
} from "@/types/court";

/**
 * Admin courts store for managing courts via admin endpoints.
 * 
 * This store provides admin-level court management with full CRUD operations.
 * It uses /api/admin/clubs/[clubId]/courts endpoints which require admin authorization.
 * 
 * DO NOT use this store for player-facing court data.
 * For player views, use usePlayerClubStore which has courtsByClubId.
 * 
 * Features:
 * - Fetch courts by club ID with admin-level details (isActive, booking counts, etc.)
 * - Fetch-if-missing pattern with inflight request guards
 * - Create, update, and delete courts
 * - Optimistic updates for better UX
 * - Error and loading state management
 * - Cache invalidation support
 * 
 * @example
 * ```tsx
 * // Fetch courts for a club if not already loaded
 * const courts = useAdminCourtsStore(state => state.courtsByClubId[clubId] || []);
 * const fetchCourtsIfNeeded = useAdminCourtsStore(state => state.fetchCourtsIfNeeded);
 * 
 * useEffect(() => {
 *   fetchCourtsIfNeeded(clubId).catch(console.error);
 * }, [fetchCourtsIfNeeded, clubId]);
 * ```
 */

/**
 * Admin court store state
 */
interface AdminCourtsState {
  // State - organized by club ID for efficient access
  courtsByClubId: Record<string, Court[]>;
  courtsById: Record<string, CourtDetail>;
  currentCourt: CourtDetail | null;
  loading: boolean;
  loadingCourts: boolean;
  error: string | null;
  courtsError: string | null;
  lastFetchedByClubId: Record<string, number>;

  // Internal inflight guards (not intended for external use)
  _inflightFetchCourts: Record<string, Promise<Court[]>>;
  _inflightFetchCourtById: Record<string, Promise<CourtDetail>>;

  // Actions
  setCourtsForClub: (clubId: string, courts: Court[]) => void;
  setCurrentCourt: (court: CourtDetail | null) => void;
  clearCurrentCourt: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Fetch-if-missing methods with inflight guards
  fetchCourtsIfNeeded: (clubId: string, options?: { force?: boolean }) => Promise<Court[]>;
  ensureCourtById: (clubId: string, courtId: string, options?: { force?: boolean }) => Promise<CourtDetail>;
  invalidateCourtsForClub: (clubId: string) => void;
  invalidateAllCourts: () => void;

  // CRUD methods
  createCourt: (clubId: string, payload: CreateCourtPayload) => Promise<Court>;
  updateCourt: (clubId: string, courtId: string, payload: UpdateCourtPayload) => Promise<Court>;
  deleteCourt: (clubId: string, courtId: string) => Promise<void>;

  // Selectors
  getCourtsForClub: (clubId: string) => Court[];
  getCourtById: (courtId: string) => Court | undefined;
  isCourtSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing courts in admin context
 * Uses /api/admin/clubs/[clubId]/courts endpoints
 */
export const useAdminCourtsStore = create<AdminCourtsState>((set, get) => ({
  // Initial state
  courtsByClubId: {},
  courtsById: {},
  currentCourt: null,
  loading: false,
  loadingCourts: false,
  error: null,
  courtsError: null,
  lastFetchedByClubId: {},
  _inflightFetchCourts: {},
  _inflightFetchCourtById: {},

  // State setters
  setCourtsForClub: (clubId, courts) => 
    set((state) => ({ 
      courtsByClubId: { ...state.courtsByClubId, [clubId]: courts },
      lastFetchedByClubId: { ...state.lastFetchedByClubId, [clubId]: Date.now() }
    })),
  
  setCurrentCourt: (court) => set({ currentCourt: court }),
  
  clearCurrentCourt: () => set({ currentCourt: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch courts for a club if not already loaded (with inflight guard)
  fetchCourtsIfNeeded: async (clubId: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // If not forcing and courts already loaded, return cached data
    if (!force && state.courtsByClubId[clubId] && state.courtsByClubId[clubId].length > 0) {
      return Promise.resolve(state.courtsByClubId[clubId]);
    }

    // If already fetching, return the existing promise
    if (state._inflightFetchCourts[clubId]) {
      return state._inflightFetchCourts[clubId];
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      set({ loadingCourts: true, courtsError: null });
      try {
        const response = await fetch(`/api/admin/clubs/${clubId}/courts`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch courts" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const courts: Court[] = await response.json();
        
        set((state) => { 
          const newInflight = { ...state._inflightFetchCourts };
          delete newInflight[clubId];
          
          return {
            courtsByClubId: { ...state.courtsByClubId, [clubId]: courts },
            loadingCourts: false, 
            lastFetchedByClubId: { ...state.lastFetchedByClubId, [clubId]: Date.now() },
            _inflightFetchCourts: newInflight
          };
        });
        
        return courts;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch courts";
        set((state) => {
          const newInflight = { ...state._inflightFetchCourts };
          delete newInflight[clubId];
          
          return { 
            courtsError: errorMessage, 
            loadingCourts: false,
            _inflightFetchCourts: newInflight 
          };
        });
        throw error;
      }
    })();

    set((state) => ({ 
      _inflightFetchCourts: { ...state._inflightFetchCourts, [clubId]: fetchPromise }
    }));
    return fetchPromise;
  },

  // Ensure a specific court is loaded by ID (with inflight guard)
  ensureCourtById: async (clubId: string, courtId: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // If not forcing and court already cached, return it
    if (!force && state.courtsById[courtId]) {
      return Promise.resolve(state.courtsById[courtId]);
    }

    // If already fetching this court, return the existing promise
    if (courtId in state._inflightFetchCourtById) {
      return state._inflightFetchCourtById[courtId];
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      set({ loadingCourts: true, courtsError: null });
      try {
        const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch court" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const court: CourtDetail = await response.json();
        
        // Update both courtsById cache and courts array if not present
        set((state) => {
          const courtsById = { ...state.courtsById, [courtId]: court };
          
          // Update courts list for this club if it exists
          const clubCourts = state.courtsByClubId[clubId] || [];
          let courtExists = false;
          const updatedClubCourts = clubCourts.map(c => {
            if (c.id === courtId) {
              courtExists = true;
              return court;
            }
            return c;
          });
          
          // Append if not found
          if (!courtExists) {
            updatedClubCourts.push(court);
          }
          
          const inflightById = { ...state._inflightFetchCourtById };
          delete inflightById[courtId];
          
          return { 
            courtsById,
            courtsByClubId: { ...state.courtsByClubId, [clubId]: updatedClubCourts },
            loadingCourts: false,
            _inflightFetchCourtById: inflightById
          };
        });
        
        return court;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch court";
        set((state) => {
          const inflightById = { ...state._inflightFetchCourtById };
          delete inflightById[courtId];
          return {
            courtsError: errorMessage, 
            loadingCourts: false,
            _inflightFetchCourtById: inflightById
          };
        });
        throw error;
      }
    })();

    set((state) => ({ 
      _inflightFetchCourtById: { 
        ...state._inflightFetchCourtById, 
        [courtId]: fetchPromise 
      } 
    }));
    
    return fetchPromise;
  },

  // Invalidate courts cache for a specific club
  invalidateCourtsForClub: (clubId: string) => {
    set((state) => {
      const courtsByClubId = { ...state.courtsByClubId };
      delete courtsByClubId[clubId];
      
      const lastFetchedByClubId = { ...state.lastFetchedByClubId };
      delete lastFetchedByClubId[clubId];
      
      return { courtsByClubId, lastFetchedByClubId };
    });
  },

  // Invalidate all courts caches
  invalidateAllCourts: () => {
    set({ 
      courtsByClubId: {},
      courtsById: {},
      lastFetchedByClubId: {},
      _inflightFetchCourts: {},
      _inflightFetchCourtById: {}
    });
  },

  // Create a new court (optimistic update)
  createCourt: async (clubId: string, payload: CreateCourtPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create court" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newCourt: Court = await response.json();
      
      // Optimistically add to courts list for this club
      set((state) => {
        const clubCourts = state.courtsByClubId[clubId] || [];
        return {
          courtsByClubId: { ...state.courtsByClubId, [clubId]: [...clubCourts, newCourt] },
          courtsById: { ...state.courtsById, [newCourt.id]: newCourt },
          loading: false,
          lastFetchedByClubId: { ...state.lastFetchedByClubId, [clubId]: Date.now() }
        };
      });

      return newCourt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create court";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update a court (optimistic update)
  updateCourt: async (clubId: string, courtId: string, payload: UpdateCourtPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update court" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedCourt: Court = await response.json();

      // Update in courts list and cache
      set((state) => {
        const clubCourts = state.courtsByClubId[clubId] || [];
        const updatedClubCourts = clubCourts.map((court) =>
          court.id === courtId ? { ...court, ...updatedCourt } : court
        );
        
        return {
          courtsByClubId: { ...state.courtsByClubId, [clubId]: updatedClubCourts },
          courtsById: {
            ...state.courtsById,
            [courtId]: state.courtsById[courtId] 
              ? { ...state.courtsById[courtId], ...updatedCourt }
              : updatedCourt
          },
          currentCourt: state.currentCourt?.id === courtId 
            ? { ...state.currentCourt, ...updatedCourt } 
            : state.currentCourt,
          loading: false,
          lastFetchedByClubId: { ...state.lastFetchedByClubId, [clubId]: Date.now() }
        };
      });

      return updatedCourt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update court";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete a court
  deleteCourt: async (clubId: string, courtId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete court" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from courts list and cache
      set((state) => {
        const clubCourts = state.courtsByClubId[clubId] || [];
        const updatedClubCourts = clubCourts.filter((court) => court.id !== courtId);
        
        const courtsById = { ...state.courtsById };
        delete courtsById[courtId];
        
        return {
          courtsByClubId: { ...state.courtsByClubId, [clubId]: updatedClubCourts },
          courtsById,
          currentCourt: state.currentCourt?.id === courtId ? null : state.currentCourt,
          loading: false,
          lastFetchedByClubId: { ...state.lastFetchedByClubId, [clubId]: Date.now() }
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete court";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Selector: Get courts for a specific club
  getCourtsForClub: (clubId: string) => {
    return get().courtsByClubId[clubId] || [];
  },

  // Selector: Get court by ID from the store
  getCourtById: (courtId: string) => {
    const state = get();
    // First check courtsById cache
    if (state.courtsById[courtId]) {
      return state.courtsById[courtId];
    }
    // Fall back to searching in all club courts
    for (const clubCourts of Object.values(state.courtsByClubId)) {
      const court = clubCourts.find((c) => c.id === courtId);
      if (court) return court;
    }
    return undefined;
  },

  // Selector: Check if a court is currently selected
  isCourtSelected: (id: string) => {
    return get().currentCourt?.id === id;
  },
}));
