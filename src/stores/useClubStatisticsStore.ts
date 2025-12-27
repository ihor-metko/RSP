import { create } from "zustand";
import type {
  ClubDailyStatistics,
  ClubMonthlyStatistics,
  CreateDailyStatisticsPayload,
  CreateMonthlyStatisticsPayload,
  UpdateDailyStatisticsPayload,
  UpdateMonthlyStatisticsPayload,
} from "@/types/clubStatistics";

/**
 * Club statistics store state
 */
interface ClubStatisticsState {
  // State
  dailyStatistics: ClubDailyStatistics[];
  monthlyStatistics: ClubMonthlyStatistics[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  
  // Context tracking for invalidation
  lastClubId: string | null;

  // Internal inflight Promise guards (not exposed)
  _inflightFetchDaily: Promise<void> | null;
  _inflightFetchMonthly: Promise<void> | null;

  // Actions
  setDailyStatistics: (stats: ClubDailyStatistics[]) => void;
  setMonthlyStatistics: (stats: ClubMonthlyStatistics[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Fetch methods with inflight guards
  fetchDailyStatisticsIfNeeded: (options?: { force?: boolean; clubId?: string }) => Promise<void>;
  fetchMonthlyStatisticsIfNeeded: (options?: { force?: boolean; clubId?: string }) => Promise<void>;
  
  // CRUD operations
  createDailyStatistics: (payload: CreateDailyStatisticsPayload) => Promise<ClubDailyStatistics>;
  createMonthlyStatistics: (payload: CreateMonthlyStatisticsPayload) => Promise<ClubMonthlyStatistics>;
  updateDailyStatistics: (id: string, payload: UpdateDailyStatisticsPayload) => Promise<ClubDailyStatistics>;
  updateMonthlyStatistics: (id: string, payload: UpdateMonthlyStatisticsPayload) => Promise<ClubMonthlyStatistics>;
  deleteDailyStatistics: (id: string) => Promise<void>;
  deleteMonthlyStatistics: (id: string) => Promise<void>;
  
  // Invalidation
  invalidateStatistics: () => void;
}

/**
 * Zustand store for managing club statistics
 * Follows the project's lazy-loading pattern with inflight guards
 */
export const useClubStatisticsStore = create<ClubStatisticsState>((set, get) => ({
  // Initial state
  dailyStatistics: [],
  monthlyStatistics: [],
  loading: false,
  error: null,
  lastFetchedAt: null,
  lastClubId: null,
  _inflightFetchDaily: null,
  _inflightFetchMonthly: null,

  // State setters
  setDailyStatistics: (stats) => set({ dailyStatistics: stats }),
  setMonthlyStatistics: (stats) => set({ monthlyStatistics: stats }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  /**
   * Fetch daily statistics if needed with inflight guard
   * - If !force and stats exist and clubId matches, returns immediately
   * - If clubId changes, invalidates cache and refetches
   * - If an inflight request exists, returns that Promise
   */
  fetchDailyStatisticsIfNeeded: async (options = {}) => {
    const { force = false, clubId } = options;
    
    // Atomically check and update clubId context
    set((state) => {
      if (clubId && clubId !== state.lastClubId) {
        return {
          dailyStatistics: [],
          monthlyStatistics: [],
          lastFetchedAt: null,
          lastClubId: clubId,
        };
      }
      return state;
    });
    
    const state = get();

    // If not forcing and stats are already loaded for this club, return immediately
    if (!force && state.dailyStatistics.length > 0 && (!clubId || clubId === state.lastClubId)) {
      return Promise.resolve();
    }

    // If there's already an inflight request, return it
    if (state._inflightFetchDaily) {
      return state._inflightFetchDaily;
    }

    // Create new inflight request
    const inflightPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const params = new URLSearchParams();
        if (clubId) {
          params.append('clubId', clubId);
        }
        
        const url = `/api/admin/statistics/daily${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch daily statistics" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const stats: ClubDailyStatistics[] = await response.json();
        set({ 
          dailyStatistics: stats, 
          loading: false,
          error: null,
          lastFetchedAt: Date.now(),
          lastClubId: clubId || null,
          _inflightFetchDaily: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch daily statistics";
        set({ 
          error: errorMessage, 
          loading: false,
          _inflightFetchDaily: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetchDaily: inflightPromise });
    return inflightPromise;
  },

  /**
   * Fetch monthly statistics if needed with inflight guard
   * - If !force and stats exist and clubId matches, returns immediately
   * - If clubId changes, invalidates cache and refetches
   * - If an inflight request exists, returns that Promise
   */
  fetchMonthlyStatisticsIfNeeded: async (options = {}) => {
    const { force = false, clubId } = options;
    
    // Atomically check and update clubId context
    set((state) => {
      if (clubId && clubId !== state.lastClubId) {
        return {
          dailyStatistics: [],
          monthlyStatistics: [],
          lastFetchedAt: null,
          lastClubId: clubId,
        };
      }
      return state;
    });
    
    const state = get();

    // If not forcing and stats are already loaded for this club, return immediately
    if (!force && state.monthlyStatistics.length > 0 && (!clubId || clubId === state.lastClubId)) {
      return Promise.resolve();
    }

    // If there's already an inflight request, return it
    if (state._inflightFetchMonthly) {
      return state._inflightFetchMonthly;
    }

    // Create new inflight request
    const inflightPromise = (async () => {
      set({ loading: true, error: null });
      try {
        const params = new URLSearchParams();
        if (clubId) {
          params.append('clubId', clubId);
        }
        
        const url = `/api/admin/statistics/monthly${params.toString() ? `?${params.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch monthly statistics" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const stats: ClubMonthlyStatistics[] = await response.json();
        set({ 
          monthlyStatistics: stats, 
          loading: false,
          error: null,
          lastFetchedAt: Date.now(),
          lastClubId: clubId || null,
          _inflightFetchMonthly: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch monthly statistics";
        set({ 
          error: errorMessage, 
          loading: false,
          _inflightFetchMonthly: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetchMonthly: inflightPromise });
    return inflightPromise;
  },

  // Create daily statistics
  createDailyStatistics: async (payload: CreateDailyStatisticsPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/statistics/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create daily statistics" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newStats: ClubDailyStatistics = await response.json();
      
      // Optimistically add to stats list
      set((state) => ({
        dailyStatistics: [newStats, ...state.dailyStatistics],
        loading: false,
      }));

      return newStats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create daily statistics";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Create monthly statistics
  createMonthlyStatistics: async (payload: CreateMonthlyStatisticsPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/statistics/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create monthly statistics" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newStats: ClubMonthlyStatistics = await response.json();
      
      // Optimistically add to stats list
      set((state) => ({
        monthlyStatistics: [newStats, ...state.monthlyStatistics],
        loading: false,
      }));

      return newStats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create monthly statistics";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update daily statistics
  updateDailyStatistics: async (id: string, payload: UpdateDailyStatisticsPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/statistics/daily/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update daily statistics" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedStats: ClubDailyStatistics = await response.json();

      // Update in stats list
      set((state) => ({
        dailyStatistics: state.dailyStatistics.map((stat) =>
          stat.id === id ? updatedStats : stat
        ),
        loading: false,
      }));

      return updatedStats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update daily statistics";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update monthly statistics
  updateMonthlyStatistics: async (id: string, payload: UpdateMonthlyStatisticsPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/statistics/monthly/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update monthly statistics" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedStats: ClubMonthlyStatistics = await response.json();

      // Update in stats list
      set((state) => ({
        monthlyStatistics: state.monthlyStatistics.map((stat) =>
          stat.id === id ? updatedStats : stat
        ),
        loading: false,
      }));

      return updatedStats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update monthly statistics";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete daily statistics
  deleteDailyStatistics: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/statistics/daily/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete daily statistics" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from stats list
      set((state) => ({
        dailyStatistics: state.dailyStatistics.filter((stat) => stat.id !== id),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete daily statistics";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete monthly statistics
  deleteMonthlyStatistics: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/statistics/monthly/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete monthly statistics" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from stats list
      set((state) => ({
        monthlyStatistics: state.monthlyStatistics.filter((stat) => stat.id !== id),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete monthly statistics";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Invalidate statistics cache
   * Clears all statistics and resets state
   */
  invalidateStatistics: () => {
    set({
      dailyStatistics: [],
      monthlyStatistics: [],
      lastFetchedAt: null,
      lastClubId: null,
      error: null,
    });
  },
}));
