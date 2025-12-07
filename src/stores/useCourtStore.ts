import { create } from "zustand";
import type {
  Court,
  CourtDetail,
  CreateCourtPayload,
  UpdateCourtPayload,
} from "@/types/court";

/**
 * Court store state
 */
interface CourtState {
  // State
  courts: Court[];
  currentCourt: CourtDetail | null;
  loading: boolean;
  error: string | null;

  // Actions
  setCourts: (courts: Court[]) => void;
  setCurrentCourt: (court: CourtDetail | null) => void;
  clearCurrentCourt: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
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
  currentCourt: null,
  loading: false,
  error: null,

  // State setters
  setCourts: (courts) => set({ courts }),
  
  setCurrentCourt: (court) => set({ currentCourt: court }),
  
  clearCurrentCourt: () => set({ currentCourt: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

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
      
      // Optimistically add to courts list
      set((state) => ({
        courts: [...state.courts, newCourt],
        loading: false,
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

      // Update in courts list - merge updated fields with existing court
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

      // Remove from courts list and clear currentCourt if it was deleted
      set((state) => ({
        courts: state.courts.filter((court) => court.id !== courtId),
        currentCourt: state.currentCourt?.id === courtId ? null : state.currentCourt,
        loading: false,
      }));
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
