import { create } from "zustand";
import type {
  PlayerClub,
  PlayerClubDetail,
} from "@/types/club";

/**
 * Cache configuration
 */
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Utility function to safely sync public fields from PlayerClubDetail to PlayerClub
 */
function syncPlayerClubFields(
  target: PlayerClub,
  source: PlayerClubDetail
): PlayerClub {
  return {
    ...target,
    // Only update public fields that are safe to sync
    name: source.name,
    shortDescription: source.shortDescription,
    location: source.location,
    city: source.city,
    contactInfo: source.contactInfo,
    openingHours: source.openingHours,
    logo: source.logo,
    heroImage: source.heroImage,
    tags: source.tags,
    // Preserve existing id and createdAt
    id: target.id,
    createdAt: target.createdAt,
  };
}

/**
 * SSR NOTE: This client-side store should not be relied upon for SSR logic.
 * Server-side pages must fetch data directly via getServerSideProps or route handlers.
 * After hydration, you can optionally call usePlayerClubStore.getState().setClubs(serverData)
 * to avoid refetching on the client.
 */

/**
 * Player Club store state
 * Stores player-specific club data with only public information
 */
interface PlayerClubState {
  // State
  clubs: PlayerClub[];
  clubsById: Record<string, PlayerClubDetail>;
  currentClub: PlayerClubDetail | null;
  loadingClubs: boolean;
  loading: boolean;
  clubsError: string | null;
  error: string | null;
  lastFetchedAt: number | null;
  
  // Search context for invalidation
  lastSearchParams: string | null;

  // Internal inflight Promise guards (not exposed)
  _inflightFetchClubs: Promise<void> | null;
  _inflightFetchClubById: Record<string, Promise<PlayerClubDetail>> | null;

  // Actions
  setClubs: (clubs: PlayerClub[]) => void;
  setCurrentClub: (club: PlayerClubDetail | null) => void;
  clearCurrentClub: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchClubs: (searchParams?: {
    q?: string;
    city?: string;
    indoor?: boolean;
    popular?: boolean;
    limit?: number;
  }) => Promise<void>;
  fetchClubById: (id: string) => Promise<void>;
  
  // New idempotent, concurrency-safe methods
  fetchClubsIfNeeded: (options?: {
    force?: boolean;
    searchParams?: {
      q?: string;
      city?: string;
      indoor?: boolean;
      popular?: boolean;
      limit?: number;
    };
  }) => Promise<void>;
  ensureClubById: (id: string, options?: { force?: boolean }) => Promise<PlayerClubDetail>;
  invalidateClubs: () => void;

  // Selectors
  getClubById: (id: string) => PlayerClub | undefined;
  isClubSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing player club data
 * Uses /api/player/clubs endpoints
 */
export const usePlayerClubStore = create<PlayerClubState>((set, get) => ({
  // Initial state
  clubs: [],
  clubsById: {},
  currentClub: null,
  loadingClubs: false,
  loading: false,
  clubsError: null,
  error: null,
  lastFetchedAt: null,
  lastSearchParams: null,
  _inflightFetchClubs: null,
  _inflightFetchClubById: null,

  // State setters
  setClubs: (clubs) => set({ clubs }),
  
  setCurrentClub: (club) => set({ currentClub: club }),
  
  clearCurrentClub: () => set({ currentClub: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch all public clubs (no auth required)
  fetchClubs: async (searchParams = {}) => {
    set({ loading: true, error: null });
    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchParams.q) params.append('q', searchParams.q);
      if (searchParams.city) params.append('city', searchParams.city);
      if (searchParams.indoor !== undefined) params.append('indoor', searchParams.indoor.toString());
      if (searchParams.popular !== undefined) params.append('popular', searchParams.popular.toString());
      if (searchParams.limit !== undefined) params.append('limit', searchParams.limit.toString());
      
      const url = `/api/player/clubs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch clubs" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const clubs = await response.json();
      set({ clubs, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch clubs";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch a single public club by ID
  fetchClubById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/player/clubs/${id}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch club" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({ currentClub: data, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch club";
      set({ error: errorMessage, loading: false, currentClub: null });
      throw error;
    }
  },

  /**
   * Fetch clubs if needed with inflight guard
   * - If !force and clubs.length > 0 and searchParams match, returns immediately
   * - If searchParams change, invalidates cache and refetches
   * - If an inflight request exists, returns that Promise
   * - Otherwise, performs a new network request
   */
  fetchClubsIfNeeded: async (options = {}) => {
    const { force = false, searchParams = {} } = options;
    const state = get();

    // Serialize search params for comparison
    const searchParamsStr = JSON.stringify(searchParams);

    // If search params changed, invalidate cache
    if (searchParamsStr !== state.lastSearchParams) {
      set({ 
        clubs: [], 
        clubsById: {}, 
        lastFetchedAt: null,
        lastSearchParams: searchParamsStr,
      });
    }

    // If not forcing and clubs are already loaded for this context, return immediately
    // Check timestamp to prevent serving stale data
    const isCacheExpired = state.lastFetchedAt && (Date.now() - state.lastFetchedAt > CACHE_EXPIRY_MS);
    
    if (!force && state.clubs.length > 0 && searchParamsStr === state.lastSearchParams && !isCacheExpired) {
      return Promise.resolve();
    }

    // If there's already an inflight request, return it
    if (state._inflightFetchClubs) {
      return state._inflightFetchClubs;
    }

    // Create new inflight request
    const inflightPromise = (async () => {
      set({ loadingClubs: true, clubsError: null });
      try {
        // Build query params
        const params = new URLSearchParams();
        if (searchParams.q) params.append('q', searchParams.q);
        if (searchParams.city) params.append('city', searchParams.city);
        if (searchParams.indoor !== undefined) params.append('indoor', searchParams.indoor.toString());
        if (searchParams.popular !== undefined) params.append('popular', searchParams.popular.toString());
        if (searchParams.limit !== undefined) params.append('limit', searchParams.limit.toString());
        
        const url = `/api/player/clubs${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch clubs" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const clubs = await response.json();
        set({ 
          clubs, 
          loadingClubs: false,
          clubsError: null,
          lastFetchedAt: Date.now(),
          lastSearchParams: searchParamsStr,
          _inflightFetchClubs: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch clubs";
        set({ 
          clubsError: errorMessage, 
          loadingClubs: false,
          _inflightFetchClubs: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetchClubs: inflightPromise });
    return inflightPromise;
  },

  /**
   * Ensure a club is loaded by ID with inflight guard
   * - If !force and clubsById[id] exists, returns cached club
   * - If an inflight request for this ID exists, returns that Promise
   * - Otherwise, performs a new network request
   */
  ensureClubById: async (id: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // If not forcing and club is already cached, return it
    if (!force && state.clubsById[id]) {
      return Promise.resolve(state.clubsById[id]);
    }

    // If there's already an inflight request for this ID, return it
    if (state._inflightFetchClubById && id in state._inflightFetchClubById) {
      return state._inflightFetchClubById[id];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<PlayerClubDetail> => {
      set({ loadingClubs: true, clubsError: null });
      try {
        const response = await fetch(`/api/player/clubs/${id}`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch club" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const club: PlayerClubDetail = await response.json();
        
        // Update clubsById cache
        set((state) => {
          const newInflight = { ...(state._inflightFetchClubById || {}) };
          delete newInflight[id];
          
          return {
            clubsById: { ...state.clubsById, [id]: club },
            loadingClubs: false,
            clubsError: null,
            _inflightFetchClubById: Object.keys(newInflight).length > 0 ? newInflight : null,
          };
        });

        // Also update clubs array if club exists there
        const currentClubs = get().clubs;
        const clubIndex = currentClubs.findIndex(c => c.id === id);
        if (clubIndex >= 0) {
          const updatedClubs = [...currentClubs];
          // Use utility function to safely sync fields
          updatedClubs[clubIndex] = syncPlayerClubFields(updatedClubs[clubIndex], club);
          set({ clubs: updatedClubs });
        }

        return club;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch club";
        
        // Clear inflight for this ID
        set((state) => {
          const newInflight = { ...(state._inflightFetchClubById || {}) };
          delete newInflight[id];
          
          return {
            clubsError: errorMessage,
            loadingClubs: false,
            _inflightFetchClubById: Object.keys(newInflight).length > 0 ? newInflight : null,
          };
        });
        
        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchClubById: {
        ...(state._inflightFetchClubById || {}),
        [id]: inflightPromise,
      },
    }));

    return inflightPromise;
  },

  /**
   * Invalidate clubs cache
   * Clears clubs, clubsById, and search params
   */
  invalidateClubs: () => {
    set({
      clubs: [],
      clubsById: {},
      lastFetchedAt: null,
      lastSearchParams: null,
      clubsError: null,
    });
  },

  // Selector: Get club by ID from the store
  getClubById: (id: string) => {
    return get().clubs.find((club) => club.id === id);
  },

  // Selector: Check if a club is currently selected
  isClubSelected: (id: string) => {
    return get().currentClub?.id === id;
  },
}));
