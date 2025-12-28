import { create } from "zustand";
import type {
  UnifiedAdmin,
  AddAdminPayload,
  RemoveAdminPayload,
  ChangeAdminRolePayload,
  ContainerType,
} from "@/types/unifiedAdmin";

/**
 * Cached admins by container
 */
interface AdminsCache {
  admins: UnifiedAdmin[];
  fetchedAt: number;
}

/**
 * Admins store state
 */
interface AdminsState {
  // State - keyed by "containerType:containerId"
  adminsByContainer: Record<string, AdminsCache>;
  loading: boolean;
  error: string | null;

  // Internal inflight guards - keyed by "containerType:containerId"
  _inflightFetchByContainer: Record<string, Promise<UnifiedAdmin[]>>;

  // Actions
  fetchAdminsIfNeeded: (
    containerType: ContainerType,
    containerId: string,
    options?: { force?: boolean }
  ) => Promise<UnifiedAdmin[]>;

  addAdmin: (payload: AddAdminPayload) => Promise<void>;
  removeAdmin: (payload: RemoveAdminPayload) => Promise<void>;
  changeAdminRole: (payload: ChangeAdminRolePayload) => Promise<void>;
  
  invalidateAdmins: (containerType: ContainerType, containerId: string) => void;
  invalidateAll: () => void;

  // Selectors
  getAdmins: (containerType: ContainerType, containerId: string) => UnifiedAdmin[] | null;
  isLoading: (containerType: ContainerType, containerId: string) => boolean;
}

/**
 * Cache validity duration (5 minutes)
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Create cache key from container type and ID
 */
function getCacheKey(containerType: ContainerType, containerId: string): string {
  return `${containerType}:${containerId}`;
}

/**
 * Zustand store for managing admins across organizations and clubs
 * Provides a single, unified interface for admin/owner management
 */
export const useAdminsStore = create<AdminsState>((set, get) => ({
  // Initial state
  adminsByContainer: {},
  loading: false,
  error: null,
  _inflightFetchByContainer: {},

  /**
   * Fetch admins if needed with inflight guard
   * - If !force and cache exists and is fresh, returns cached data
   * - If an inflight request exists for this container, returns that Promise
   * - Otherwise, performs a new network request
   */
  fetchAdminsIfNeeded: async (containerType, containerId, options = {}) => {
    const { force = false } = options;
    const state = get();
    const cacheKey = getCacheKey(containerType, containerId);

    // Check if we have fresh cached data
    const cached = state.adminsByContainer[cacheKey];
    const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS;

    if (!force && isFresh) {
      return Promise.resolve(cached.admins);
    }

    // If there's already an inflight request for this container, return it
    if (cacheKey in state._inflightFetchByContainer) {
      return state._inflightFetchByContainer[cacheKey];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<UnifiedAdmin[]> => {
      set({ loading: true, error: null });

      try {
        const url = `/api/admin/admins?containerType=${containerType}&containerId=${containerId}`;
        const response = await fetch(url);

        if (!response.ok) {
          const data = await response
            .json()
            .catch(() => ({ error: "Failed to fetch admins" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const admins: UnifiedAdmin[] = await response.json();

        // Update cache
        set((state) => {
          const newInflight = { ...state._inflightFetchByContainer };
          delete newInflight[cacheKey];

          return {
            adminsByContainer: {
              ...state.adminsByContainer,
              [cacheKey]: {
                admins,
                fetchedAt: Date.now(),
              },
            },
            loading: false,
            error: null,
            _inflightFetchByContainer: newInflight,
          };
        });

        return admins;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch admins";

        // Clear inflight for this container
        set((state) => {
          const newInflight = { ...state._inflightFetchByContainer };
          delete newInflight[cacheKey];

          return {
            error: errorMessage,
            loading: false,
            _inflightFetchByContainer: newInflight,
          };
        });

        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchByContainer: {
        ...state._inflightFetchByContainer,
        [cacheKey]: inflightPromise,
      },
    }));

    return inflightPromise;
  },

  /**
   * Add an admin to a container
   */
  addAdmin: async (payload: AddAdminPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Failed to add admin" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Invalidate cache for this container to trigger refetch
      const cacheKey = getCacheKey(payload.containerType, payload.containerId);
      set((state) => {
        const newCache = { ...state.adminsByContainer };
        delete newCache[cacheKey];
        return {
          adminsByContainer: newCache,
          loading: false,
          error: null,
        };
      });

      // Optionally add to cache optimistically if we have the admin data
      if (result.admin) {
        const cached = get().adminsByContainer[cacheKey];
        if (cached) {
          set((state) => ({
            adminsByContainer: {
              ...state.adminsByContainer,
              [cacheKey]: {
                admins: [...cached.admins, result.admin],
                fetchedAt: cached.fetchedAt,
              },
            },
          }));
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add admin";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Remove an admin from a container
   */
  removeAdmin: async (payload: RemoveAdminPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Failed to remove admin" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Optimistically remove from cache
      const cacheKey = getCacheKey(payload.containerType, payload.containerId);
      set((state) => {
        const cached = state.adminsByContainer[cacheKey];
        if (!cached) {
          return { loading: false, error: null };
        }

        return {
          adminsByContainer: {
            ...state.adminsByContainer,
            [cacheKey]: {
              admins: cached.admins.filter((admin) => admin.id !== payload.userId),
              fetchedAt: cached.fetchedAt,
            },
          },
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove admin";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Change an admin's role in a container
   */
  changeAdminRole: async (payload: ChangeAdminRolePayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/admins/role", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({ error: "Failed to change admin role" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Optimistically update role in cache
      const cacheKey = getCacheKey(payload.containerType, payload.containerId);
      set((state) => {
        const cached = state.adminsByContainer[cacheKey];
        if (!cached) {
          return { loading: false, error: null };
        }

        return {
          adminsByContainer: {
            ...state.adminsByContainer,
            [cacheKey]: {
              admins: cached.admins.map((admin) =>
                admin.id === payload.userId
                  ? { ...admin, role: payload.newRole }
                  : admin
              ),
              fetchedAt: cached.fetchedAt,
            },
          },
          loading: false,
          error: null,
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change admin role";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Invalidate admins cache for a specific container
   */
  invalidateAdmins: (containerType, containerId) => {
    const cacheKey = getCacheKey(containerType, containerId);
    set((state) => {
      const newCache = { ...state.adminsByContainer };
      delete newCache[cacheKey];
      return { adminsByContainer: newCache };
    });
  },

  /**
   * Invalidate all admins caches
   */
  invalidateAll: () => {
    set({ adminsByContainer: {}, error: null });
  },

  /**
   * Get admins for a specific container
   */
  getAdmins: (containerType, containerId) => {
    const cacheKey = getCacheKey(containerType, containerId);
    const cached = get().adminsByContainer[cacheKey];
    return cached ? cached.admins : null;
  },

  /**
   * Check if admins are currently loading for a container
   */
  isLoading: (containerType, containerId) => {
    const state = get();
    const cacheKey = getCacheKey(containerType, containerId);
    return state.loading && cacheKey in state._inflightFetchByContainer;
  },
}));
