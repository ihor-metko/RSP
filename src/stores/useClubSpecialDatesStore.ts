import { create } from "zustand";
import type { ClubSpecialHours } from "@/types/club";

/**
 * Special Dates store state
 * This store manages club special dates independently from club details
 * Following Zustand lazy-loading pattern as per copilot-settings.md
 */
interface ClubSpecialDatesState {
  // State
  specialDates: ClubSpecialHours[];
  loading: boolean;
  error: string | null;
  lastFetchedClubId: string | null;

  // Internal inflight Promise guard
  _inflightFetch: Promise<void> | null;

  // Actions
  fetchSpecialDates: (clubId: string, options?: { force?: boolean }) => Promise<void>;
  addSpecialDate: (clubId: string, specialDate: Omit<ClubSpecialHours, "id" | "clubId" | "createdAt" | "updatedAt">) => Promise<ClubSpecialHours>;
  updateSpecialDate: (clubId: string, dateId: string, updates: Partial<Omit<ClubSpecialHours, "id" | "clubId" | "createdAt" | "updatedAt">>) => Promise<ClubSpecialHours>;
  removeSpecialDate: (clubId: string, dateId: string) => Promise<void>;
  
  // Utility actions
  setSpecialDates: (specialDates: ClubSpecialHours[]) => void;
  clearSpecialDates: () => void;
}

/**
 * Zustand store for managing club special dates
 * Implements lazy-loading pattern and independent state management
 */
export const useClubSpecialDatesStore = create<ClubSpecialDatesState>((set, get) => ({
  // Initial state
  specialDates: [],
  loading: false,
  error: null,
  lastFetchedClubId: null,
  _inflightFetch: null,

  // Fetch special dates with inflight guard and lazy loading
  fetchSpecialDates: async (clubId: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // If clubId changed, invalidate cache
    if (clubId !== state.lastFetchedClubId) {
      set({ 
        specialDates: [], 
        lastFetchedClubId: clubId,
        error: null,
      });
    }

    // If not forcing and data already loaded for this club, return immediately
    if (!force && state.specialDates.length > 0 && clubId === state.lastFetchedClubId) {
      // Note: This assumes data is fresh. For longer sessions, consider adding timestamp-based invalidation
      return Promise.resolve();
    }

    // If there's already an inflight request, return it
    if (state._inflightFetch) {
      return state._inflightFetch;
    }

    // Create new inflight request
    const inflightPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const response = await fetch(`/api/admin/clubs/${clubId}/special-dates`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch special dates" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const specialDates = data.specialDates || [];
        
        set({ 
          specialDates, 
          loading: false,
          error: null,
          lastFetchedClubId: clubId,
          _inflightFetch: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch special dates";
        set({ 
          error: errorMessage, 
          loading: false,
          _inflightFetch: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetch: inflightPromise });
    return inflightPromise;
  },

  // Add a new special date
  addSpecialDate: async (clubId: string, specialDate) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/special-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(specialDate),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create special date" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newSpecialDate: ClubSpecialHours = await response.json();
      
      // Optimistically update the store with sorted insert
      set((state) => {
        const newDates = [...state.specialDates, newSpecialDate];
        // Sort by date - small array so performance impact is minimal
        newDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return {
          specialDates: newDates,
          loading: false,
        };
      });

      return newSpecialDate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create special date";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update an existing special date
  updateSpecialDate: async (clubId: string, dateId: string, updates) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/special-dates/${dateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update special date" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedSpecialDate: ClubSpecialHours = await response.json();
      
      // Update the store - sort only if date changed
      set((state) => {
        const updated = state.specialDates.map((sd) => 
          sd.id === dateId ? updatedSpecialDate : sd
        );
        
        // Only sort if the date was changed
        const original = state.specialDates.find((sd) => sd.id === dateId);
        if (original && original.date !== updatedSpecialDate.date) {
          updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }
        
        return {
          specialDates: updated,
          loading: false,
        };
      });

      return updatedSpecialDate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update special date";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Remove a special date
  removeSpecialDate: async (clubId: string, dateId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/special-dates/${dateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete special date" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from store
      set((state) => ({
        specialDates: state.specialDates.filter((sd) => sd.id !== dateId),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete special date";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Utility actions
  setSpecialDates: (specialDates) => set({ specialDates }),
  
  clearSpecialDates: () => set({ 
    specialDates: [], 
    error: null, 
    lastFetchedClubId: null 
  }),
}));
