import { create } from "zustand";
import type {
  Court,
  CourtDetail,
  CreateCourtPayload,
  UpdateCourtPayload,
} from "@/types/court";

/**
 * Zustand store for managing courts for clubs
 * 
 * This store provides a centralized, reusable state management solution for courts
 * that can be used across admin dashboards, booking pages, and club management pages.
 * 
 * Features:
 * - Fetch courts by club ID with inflight request guards (prevents duplicate concurrent requests)
 * - Fetch-if-missing pattern: returns cached data when available, fetches only when needed
 * - Fetch individual court details with caching
 * - Create, update, and delete courts with optimistic updates
 * - Helper methods for court selection and lookup
 * - Error and loading state management
 * - Cache invalidation support
 * 
 * Note: SSR pages should fetch data server-side and hydrate the store after mount.
 * Use useCourtStore.getState().setCourts(serverData) to populate the store with
 * server-fetched data after hydration.
 * 
 * @example
 * ```tsx
 * // Fetch courts if not already loaded
 * const courts = useCourtStore(state => state.courts);
 * const fetchCourtsIfNeeded = useCourtStore(state => state.fetchCourtsIfNeeded);
 * 
 * useEffect(() => {
 *   fetchCourtsIfNeeded().catch(console.error);
 * }, [fetchCourtsIfNeeded]);
 * ```
 * 
 * @example
 * ```tsx
 * // Ensure a specific court is loaded
 * const ensureCourtById = useCourtStore(state => state.ensureCourtById);
 * const court = useCourtStore(state => state.courtsById[courtId]);
 * 
 * useEffect(() => {
 *   ensureCourtById(courtId).catch(console.error);
 * }, [ensureCourtById, courtId]);
 * ```
 */

/**
 * Court store state
 */
interface CourtState {
  // State
  courts: Court[];
  courtsById: Record<string, CourtDetail>;
  currentCourt: CourtDetail | null;
  loading: boolean;
  loadingCourts: boolean;
  error: string | null;
  courtsError: string | null;
  lastFetchedAt: number | null;

  // Internal inflight guards (not intended for external use)
  _inflightFetchCourts: Promise<Court[]> | null;
  _inflightFetchCourtById: Record<string, Promise<CourtDetail>>;

  // Actions
  setCourts: (courts: Court[]) => void;
  setCurrentCourt: (court: CourtDetail | null) => void;
  clearCurrentCourt: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Fetch-if-missing methods with inflight guards
  fetchCourtsIfNeeded: (options?: { force?: boolean; clubId?: string }) => Promise<Court[]>;
  ensureCourtById: (courtId: string, options?: { force?: boolean; clubId?: string }) => Promise<CourtDetail>;
  invalidateCourts: () => void;

  // Legacy methods (kept for backward compatibility during migration)
  fetchCourtsByClubId: (clubId: string) => Promise<void>;
  fetchCourtById: (clubId: string, courtId: string) => Promise<void>;
  createCourt: (clubId: string, payload: CreateCourtPayload) => Promise<Court>;
  updateCourt: (clubId: string, courtId: string, payload: UpdateCourtPayload) => Promise<Court>;
  deleteCourt: (clubId: string, courtId: string) => Promise<void>;

  // Selectors
  getCourtById: (id: string) => Court | undefined;
  isCourtSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing courts
 * SSR-friendly, lightweight, and integrates with existing API patterns
 */
export const useCourtStore = create<CourtState>((set, get) => ({
  // Initial state
  courts: [],
  courtsById: {},
  currentCourt: null,
  loading: false,
  loadingCourts: false,
  error: null,
  courtsError: null,
  lastFetchedAt: null,
  _inflightFetchCourts: null,
  _inflightFetchCourtById: {},

  // State setters
  setCourts: (courts) => set({ courts, lastFetchedAt: Date.now() }),
  
  setCurrentCourt: (court) => set({ currentCourt: court }),
  
  clearCurrentCourt: () => set({ currentCourt: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch courts if not already loaded (with inflight guard)
  fetchCourtsIfNeeded: async (options = {}) => {
    const { force = false, clubId } = options;
    const state = get();

    // If not forcing and courts already loaded, return cached data
    if (!force && state.courts.length > 0) {
      return Promise.resolve(state.courts);
    }

    // If already fetching, return the existing promise
    if (state._inflightFetchCourts) {
      return state._inflightFetchCourts;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      set({ loadingCourts: true, courtsError: null });
      try {
        // Use clubId if provided, otherwise use a general endpoint
        const endpoint = clubId ? `/api/clubs/${clubId}/courts` : '/api/courts';
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch courts" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        // Handle both direct array and wrapped response
        const courts = data.courts || data;
        
        set({ 
          courts, 
          loadingCourts: false, 
          lastFetchedAt: Date.now(),
          _inflightFetchCourts: null 
        });
        
        return courts;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch courts";
        set({ 
          courtsError: errorMessage, 
          loadingCourts: false,
          _inflightFetchCourts: null 
        });
        throw error;
      }
    })();

    set({ _inflightFetchCourts: fetchPromise });
    return fetchPromise;
  },

  // Ensure a specific court is loaded by ID (with inflight guard)
  ensureCourtById: async (courtId: string, options = {}) => {
    const { force = false, clubId } = options;
    const state = get();

    // If not forcing and court already cached, return it
    if (!force && state.courtsById[courtId]) {
      return Promise.resolve(state.courtsById[courtId]);
    }

    // If already fetching this court, return the existing promise
    if (state._inflightFetchCourtById[courtId]) {
      return state._inflightFetchCourtById[courtId];
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      set({ loadingCourts: true, courtsError: null });
      try {
        // Try multiple endpoints based on what's available
        // Prefer the new admin endpoint, fallback to club-based or player endpoint
        let response;
        if (clubId) {
          response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`);
        } else {
          // Try the new admin endpoint first
          response = await fetch(`/api/admin/courts/${courtId}`);
          
          // If not found, try player endpoint as fallback
          if (!response.ok && response.status === 404) {
            response = await fetch(`/api/courts/${courtId}`);
          }
        }
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch court" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const court: CourtDetail = await response.json();
        
        // Update both courtsById cache and courts array if not present
        set((state) => {
          const courtsById = { ...state.courtsById, [courtId]: court };
          
          // Single pass: check if exists and update/append in one iteration
          let courtExists = false;
          const courts = state.courts.map(c => {
            if (c.id === courtId) {
              courtExists = true;
              return court;
            }
            return c;
          });
          
          // Append if not found
          if (!courtExists) {
            courts.push(court);
          }
          
          const inflightById = { ...state._inflightFetchCourtById };
          delete inflightById[courtId];
          
          return { 
            courtsById,
            courts,
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

  // Invalidate caches and clear stored data
  invalidateCourts: () => {
    set({ 
      courts: [], 
      courtsById: {},
      lastFetchedAt: null,
      _inflightFetchCourts: null,
      _inflightFetchCourtById: {}
    });
  },

  // Fetch courts by club ID
  fetchCourtsByClubId: async (clubId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/clubs/${clubId}/courts`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch courts" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      // Handle both direct array and wrapped response
      const courts = data.courts || data;
      set({ courts, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch courts";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch a single court by ID and set it as current
  fetchCourtById: async (clubId: string, courtId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/courts/${courtId}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch court" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({ currentCourt: data, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch court";
      set({ error: errorMessage, loading: false, currentCourt: null });
      throw error;
    }
  },

  // Create a new court (optimistic update)
  createCourt: async (clubId: string, payload: CreateCourtPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/clubs/${clubId}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create court" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newCourt = await response.json();
      
      // Optimistically add to courts list and update cache
      set((state) => ({
        courts: [...state.courts, newCourt],
        courtsById: { ...state.courtsById, [newCourt.id]: newCourt },
        loading: false,
        lastFetchedAt: Date.now(),
      }));

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

      const updatedCourt = await response.json();

      // Update in courts list and cache - merge updated fields with existing court
      set((state) => ({
        courts: state.courts.map((court) =>
          court.id === courtId 
            ? { 
                ...court, 
                ...updatedCourt,
                // Preserve id to prevent any accidental overwrites
                id: court.id,
              } 
            : court
        ),
        courtsById: {
          ...state.courtsById,
          [courtId]: state.courtsById[courtId] 
            ? { ...state.courtsById[courtId], ...updatedCourt, id: courtId }
            : updatedCourt
        },
        // Update currentCourt if it matches
        currentCourt: state.currentCourt?.id === courtId 
          ? { 
              ...state.currentCourt, 
              ...updatedCourt,
              // Preserve id to prevent any accidental overwrites
              id: state.currentCourt.id,
            } 
          : state.currentCourt,
        loading: false,
        lastFetchedAt: Date.now(),
      }));

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

      // Remove from courts list, cache, and clear currentCourt if it was deleted
      set((state) => {
        const courtsById = { ...state.courtsById };
        delete courtsById[courtId];
        
        return {
          courts: state.courts.filter((court) => court.id !== courtId),
          courtsById,
          currentCourt: state.currentCourt?.id === courtId ? null : state.currentCourt,
          loading: false,
          lastFetchedAt: Date.now(),
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete court";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Selector: Get court by ID from the store
  getCourtById: (id: string) => {
    return get().courts.find((court) => court.id === id);
  },

  // Selector: Check if a court is currently selected
  isCourtSelected: (id: string) => {
    return get().currentCourt?.id === id;
  },
}));
