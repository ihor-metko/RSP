import { create } from "zustand";
import type {
  Club,
  ClubWithCounts,
  ClubDetail,
  CreateClubPayload,
  UpdateClubPayload,
} from "@/types/club";

/**
 * SSR NOTE: This client-side store should not be relied upon for SSR logic.
 * Server-side pages must fetch data directly via getServerSideProps or route handlers.
 * After hydration, you can optionally call useAdminClubStore.getState().setClubs(serverData)
 * to avoid refetching on the client.
 */

/**
 * Admin club store state
 * This store is for admin users and uses /api/admin/clubs endpoints
 */
interface AdminClubState {
  // State
  clubs: ClubWithCounts[];
  clubsById: Record<string, ClubDetail>;
  currentClub: ClubDetail | null;
  loadingClubs: boolean;
  loading: boolean;
  clubsError: string | null;
  error: string | null;
  lastFetchedAt: number | null;
  
  // Context tracking for invalidation
  lastOrganizationId: string | null;

  // Internal inflight Promise guards (not exposed)
  _inflightFetchClubs: Promise<void> | null;
  _inflightFetchClubById: Record<string, Promise<ClubDetail>> | null;

  // Actions
  setClubs: (clubs: ClubWithCounts[]) => void;
  setCurrentClub: (club: ClubDetail | null) => void;
  clearCurrentClub: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchClubs: () => Promise<void>;
  fetchClubById: (id: string) => Promise<void>;
  
  // New idempotent, concurrency-safe methods
  fetchClubsIfNeeded: (options?: { force?: boolean; organizationId?: string | null }) => Promise<void>;
  ensureClubById: (id: string, options?: { force?: boolean }) => Promise<ClubDetail>;
  invalidateClubs: () => void;
  
  createClub: (payload: CreateClubPayload) => Promise<Club>;
  updateClub: (id: string, payload: UpdateClubPayload) => Promise<Club>;
  deleteClub: (id: string) => Promise<void>;

  // Selectors
  getClubById: (id: string) => ClubWithCounts | undefined;
  isClubSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing clubs (Admin view)
 * SSR-friendly, lightweight, and integrates with existing API patterns
 * Uses /api/admin/clubs endpoints for admin-level data access
 */
export const useAdminClubStore = create<AdminClubState>((set, get) => ({
  // Initial state
  clubs: [],
  clubsById: {},
  currentClub: null,
  loadingClubs: false,
  loading: false,
  clubsError: null,
  error: null,
  lastFetchedAt: null,
  lastOrganizationId: null,
  _inflightFetchClubs: null,
  _inflightFetchClubById: null,

  // State setters
  setClubs: (clubs) => set({ clubs }),
  
  setCurrentClub: (club) => set({ currentClub: club }),
  
  clearCurrentClub: () => set({ currentClub: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch all clubs (role-based filtering happens server-side)
  fetchClubs: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/clubs");
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch clubs" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      // Handle both paginated and non-paginated responses
      const clubs = data.clubs || data;
      set({ clubs, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch clubs";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch a single club by ID and set it as current
  fetchClubById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${id}`);
      
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
   * - If !force and clubs.length > 0 and organizationId matches, returns immediately
   * - If organizationId changes, invalidates cache and refetches
   * - If an inflight request exists, returns that Promise
   * - Otherwise, performs a new network request
   */
  fetchClubsIfNeeded: async (options = {}) => {
    const { force = false, organizationId = null } = options;
    const state = get();

    // If organizationId changed (including null changes), invalidate cache
    if (organizationId !== state.lastOrganizationId) {
      set({ 
        clubs: [], 
        clubsById: {}, 
        lastFetchedAt: null,
        lastOrganizationId: organizationId,
      });
    }

    // If not forcing and clubs are already loaded for this context, return immediately
    if (!force && state.clubs.length > 0 && organizationId === state.lastOrganizationId) {
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
        if (organizationId) {
          params.append('organizationId', organizationId);
        }
        
        const url = `/api/admin/clubs${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch clubs" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const clubs = data.clubs || data;
        set({ 
          clubs, 
          loadingClubs: false,
          clubsError: null,
          lastFetchedAt: Date.now(),
          lastOrganizationId: organizationId,
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
    const inflightPromise = (async (): Promise<ClubDetail> => {
      set({ loadingClubs: true, clubsError: null });
      try {
        const response = await fetch(`/api/admin/clubs/${id}`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch club" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const club: ClubDetail = await response.json();
        
        // Update clubsById cache and set as currentClub
        set((state) => {
          const newInflight = { ...(state._inflightFetchClubById || {}) };
          delete newInflight[id];
          
          return {
            clubsById: { ...state.clubsById, [id]: club },
            currentClub: club,
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
          // Merge updated data while preserving the original id
          updatedClubs[clubIndex] = { 
            ...updatedClubs[clubIndex],
            ...club,
          };
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
   * Clears clubs, clubsById, and optionally lastFetchedAt
   */
  invalidateClubs: () => {
    set({
      clubs: [],
      clubsById: {},
      lastFetchedAt: null,
      lastOrganizationId: null,
      clubsError: null,
    });
  },

  // Create a new club (optimistic update)
  createClub: async (payload: CreateClubPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/clubs/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create club" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newClub = await response.json();
      
      // Optimistically add to clubs list
      // Convert to ClubWithCounts format for the list
      const clubWithCounts: ClubWithCounts = {
        id: newClub.id,
        name: newClub.name,
        organizationId: newClub.organizationId,
        location: newClub.location,
        contactInfo: newClub.contactInfo || null,
        openingHours: newClub.openingHours || null,
        logoData: newClub.logoData || null,
        status: newClub.status,
        createdAt: newClub.createdAt,
        shortDescription: newClub.shortDescription || null,
        city: newClub.city || null,
        bannerData: newClub.bannerData || null,
        tags: newClub.tags || null,
        isPublic: newClub.isPublic ?? true,
        indoorCount: 0,
        outdoorCount: 0,
        courtCount: 0,
        bookingCount: 0,
      };
      
      set((state) => ({
        clubs: [clubWithCounts, ...state.clubs],
        loading: false,
      }));

      return newClub;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create club";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update a club (optimistic update)
  updateClub: async (id: string, payload: UpdateClubPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update club" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedClub = await response.json();

      // Update in clubs list - merge updated fields with existing club
      set((state) => ({
        clubs: state.clubs.map((club) =>
          club.id === id 
            ? { 
                ...club, 
                ...updatedClub,
                // Preserve id to prevent any accidental overwrites
                id: club.id,
              } 
            : club
        ),
        // Update currentClub if it matches
        currentClub: state.currentClub?.id === id 
          ? { 
              ...state.currentClub, 
              ...updatedClub,
              // Preserve id to prevent any accidental overwrites
              id: state.currentClub.id,
            } 
          : state.currentClub,
        loading: false,
      }));

      return updatedClub;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update club";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete a club
  deleteClub: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete club" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from clubs list, clubsById, and clear currentClub if it was deleted
      set((state) => {
        const newClubsById = { ...state.clubsById };
        delete newClubsById[id];
        
        return {
          clubs: state.clubs.filter((club) => club.id !== id),
          clubsById: newClubsById,
          currentClub: state.currentClub?.id === id ? null : state.currentClub,
          loading: false,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete club";
      set({ error: errorMessage, loading: false });
      throw error;
    }
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
