import { create } from "zustand";
import type { UnifiedDashboardResponse } from "@/app/api/admin/dashboard/route";

/**
 * Dashboard store state
 */
interface DashboardState {
  // State
  data: UnifiedDashboardResponse | null;
  loading: boolean;
  error: string | null;
  hasFetched: boolean;

  // Internal inflight guard (prevent duplicate concurrent requests)
  _inflightFetch: Promise<UnifiedDashboardResponse> | null;
  _abortController: AbortController | null;

  // Actions
  fetchDashboardOnce: () => Promise<UnifiedDashboardResponse | null>;
  refreshDashboard: () => Promise<UnifiedDashboardResponse | null>;
  resetDashboard: () => void;
}

/**
 * Zustand store for managing unified dashboard data
 * 
 * Features:
 * - Fetch-once pattern: prevents duplicate network requests
 * - Inflight guard: prevents concurrent requests
 * - AbortController: cleanup for unmounted components
 * - Refresh capability: manual data refresh
 * 
 * Usage:
 * ```tsx
 * const { data, loading, error, fetchDashboardOnce } = useDashboardStore();
 * 
 * useEffect(() => {
 *   fetchDashboardOnce();
 * }, []);
 * ```
 */
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial state
  data: null,
  loading: false,
  error: null,
  hasFetched: false,
  _inflightFetch: null,
  _abortController: null,

  /**
   * Fetch dashboard data only once per session
   * 
   * This method implements the fetch-once pattern:
   * - If data is already fetched, returns cached data
   * - If fetch is in progress, returns the pending promise
   * - Otherwise, initiates a new fetch
   * 
   * This prevents multiple network requests even when:
   * - Component mounts multiple times (React Strict Mode)
   * - Multiple components call this method
   * - Re-renders trigger useEffect
   */
  fetchDashboardOnce: async () => {
    const state = get();

    // Return cached data if already fetched
    if (state.hasFetched && state.data && !state.error) {
      return state.data;
    }

    // If there's already an inflight request, return it
    if (state._inflightFetch) {
      return state._inflightFetch;
    }

    // Create new AbortController for this fetch
    const abortController = new AbortController();

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        set({ 
          loading: true, 
          error: null,
          _abortController: abortController,
        });

        const response = await fetch("/api/admin/dashboard", {
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Unauthorized");
          }
          const data = await response.json().catch(() => ({ error: "Failed to fetch dashboard" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // Update state with fetched data
        set({
          data,
          loading: false,
          hasFetched: true,
          _inflightFetch: null,
          _abortController: null,
        });

        return data;
      } catch (error) {
        // Don't set error if request was aborted (component unmounted)
        if (error instanceof Error && error.name === "AbortError") {
          set({
            loading: false,
            _inflightFetch: null,
            _abortController: null,
          });
          return null;
        }

        const errorMessage = error instanceof Error ? error.message : "Failed to fetch dashboard";
        
        set({
          error: errorMessage,
          loading: false,
          _inflightFetch: null,
          _abortController: null,
        });

        throw error;
      }
    })();

    // Store inflight promise
    set({ _inflightFetch: fetchPromise });

    return fetchPromise;
  },

  /**
   * Refresh dashboard data (force refetch)
   * 
   * This method:
   * - Resets the hasFetched flag
   * - Aborts any in-flight requests
   * - Fetches fresh data
   * 
   * Use this for manual refresh or realtime updates
   */
  refreshDashboard: async () => {
    const state = get();

    // Abort any in-flight request
    if (state._abortController) {
      state._abortController.abort();
    }

    // Reset state and fetch fresh data
    set({
      hasFetched: false,
      _inflightFetch: null,
      _abortController: null,
    });

    return get().fetchDashboardOnce();
  },

  /**
   * Reset dashboard state
   * 
   * Clears all cached data and resets to initial state
   * Useful for logout or when switching users
   */
  resetDashboard: () => {
    const state = get();

    // Abort any in-flight request
    if (state._abortController) {
      state._abortController.abort();
    }

    set({
      data: null,
      loading: false,
      error: null,
      hasFetched: false,
      _inflightFetch: null,
      _abortController: null,
    });
  },
}));
