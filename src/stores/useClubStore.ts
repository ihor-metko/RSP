import { create } from "zustand";
import type {
  Club,
  ClubWithCounts,
  ClubDetail,
  CreateClubPayload,
  UpdateClubPayload,
} from "@/types/club";

/**
 * Club store state
 */
interface ClubState {
  // State
  clubs: ClubWithCounts[];
  currentClub: ClubDetail | null;
  loading: boolean;
  error: string | null;

  // Actions
  setClubs: (clubs: ClubWithCounts[]) => void;
  setCurrentClub: (club: ClubDetail | null) => void;
  clearCurrentClub: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchClubs: () => Promise<void>;
  fetchClubById: (id: string) => Promise<void>;
  createClub: (payload: CreateClubPayload) => Promise<Club>;
  updateClub: (id: string, payload: UpdateClubPayload) => Promise<Club>;
  deleteClub: (id: string) => Promise<void>;

  // Selectors
  getClubById: (id: string) => ClubWithCounts | undefined;
  isClubSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing clubs
 * SSR-friendly, lightweight, and integrates with existing API patterns
 */
export const useClubStore = create<ClubState>((set, get) => ({
  // Initial state
  clubs: [],
  currentClub: null,
  loading: false,
  error: null,

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
        location: newClub.location,
        contactInfo: newClub.contactInfo || null,
        openingHours: newClub.openingHours || null,
        logo: newClub.logo || null,
        status: newClub.status,
        createdAt: newClub.createdAt,
        shortDescription: newClub.shortDescription || null,
        city: newClub.city || null,
        heroImage: newClub.heroImage || null,
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

      // Remove from clubs list and clear currentClub if it was deleted
      set((state) => ({
        clubs: state.clubs.filter((club) => club.id !== id),
        currentClub: state.currentClub?.id === id ? null : state.currentClub,
        loading: false,
      }));
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
