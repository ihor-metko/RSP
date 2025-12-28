import { create } from "zustand";

/**
 * Unified admin data structure
 * Represents both organization and club admins with a role field to distinguish
 */
export interface Admin {
  id: string; // User ID
  name: string | null;
  email: string;
  role: "ORGANIZATION_OWNER" | "ORGANIZATION_ADMIN" | "CLUB_OWNER" | "CLUB_ADMIN";
  membershipId: string; // Membership or ClubMembership ID
  lastLoginAt: Date | string | null;
  createdAt?: Date | string;
}

/**
 * Context type for admin management
 */
export type AdminContext = "organization" | "club";

/**
 * Context key for storing admins
 * Format: "organization:uuid" or "club:uuid"
 */
type ContextKey = string;

/**
 * Cached admins by context
 */
interface AdminsCache {
  admins: Admin[];
  fetchedAt: number;
}

/**
 * Unified admins store state
 */
interface AdminsState {
  // State - keyed by context (e.g., "organization:uuid" or "club:uuid")
  adminsByContext: Record<ContextKey, AdminsCache>;
  loading: boolean;
  error: string | null;

  // Internal inflight guards - keyed by context
  _inflightFetchByContext: Record<ContextKey, Promise<Admin[]>>;

  // Actions
  fetchAdminsIfNeeded: (
    contextType: AdminContext,
    contextId: string,
    options?: { force?: boolean }
  ) => Promise<Admin[]>;

  addAdmin: (contextType: AdminContext, contextId: string, admin: Admin) => void;
  removeAdmin: (contextType: AdminContext, contextId: string, adminId: string) => void;
  updateAdminRole: (
    contextType: AdminContext,
    contextId: string,
    adminId: string,
    newRole: Admin["role"]
  ) => void;
  invalidateContext: (contextType: AdminContext, contextId: string) => void;
  invalidateAll: () => void;

  // Selectors
  getAdmins: (contextType: AdminContext, contextId: string) => Admin[] | null;
  isLoading: (contextType: AdminContext, contextId: string) => boolean;
}

/**
 * Cache validity duration (5 minutes)
 */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/**
 * Generate context key from type and ID
 */
const getContextKey = (contextType: AdminContext, contextId: string): ContextKey => {
  return `${contextType}:${contextId}`;
};

/**
 * Fetch admins for a given context from the appropriate API endpoint
 */
const fetchAdminsFromAPI = async (
  contextType: AdminContext,
  contextId: string
): Promise<Admin[]> => {
  const endpoint =
    contextType === "organization"
      ? `/api/admin/organizations/${contextId}/admins`
      : `/api/admin/clubs/${contextId}/admins`;

  const response = await fetch(endpoint);

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: "Failed to fetch admins" }));
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  // Transform response to unified Admin format
  if (contextType === "organization") {
    // New unified format
    return data.map((admin: {
      id: string;
      name: string | null;
      email: string;
      role: "owner" | "admin";
      membershipId: string;
    }) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role === "owner" ? ("ORGANIZATION_OWNER" as const) : ("ORGANIZATION_ADMIN" as const),
      membershipId: admin.membershipId,
      lastLoginAt: null,
    }));
  } else {
    // Club response is already in unified format
    return data.map((admin: {
      id: string;
      name: string | null;
      email: string;
      role: "owner" | "admin";
      membershipId: string;
    }) => ({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role === "owner" ? ("CLUB_OWNER" as const) : ("CLUB_ADMIN" as const),
      membershipId: admin.membershipId,
      lastLoginAt: null,
    }));
  }
};

/**
 * Zustand store for managing admins across organizations and clubs
 * This unified store replaces separate club-specific stores and provides
 * a consistent interface for managing admins in both contexts.
 */
export const useAdminsStore = create<AdminsState>((set, get) => ({
  // Initial state
  adminsByContext: {},
  loading: false,
  error: null,
  _inflightFetchByContext: {},

  /**
   * Fetch admins if needed with inflight guard
   * - If !force and cache exists and is fresh, returns cached data
   * - If an inflight request exists for this context, returns that Promise
   * - Otherwise, performs a new network request
   */
  fetchAdminsIfNeeded: async (
    contextType: AdminContext,
    contextId: string,
    options = {}
  ) => {
    const { force = false } = options;
    const state = get();
    const contextKey = getContextKey(contextType, contextId);

    // Check if we have fresh cached data
    const cached = state.adminsByContext[contextKey];
    const isFresh = cached && Date.now() - cached.fetchedAt < CACHE_DURATION_MS;

    if (!force && isFresh) {
      return Promise.resolve(cached.admins);
    }

    // If there's already an inflight request for this context, return it
    if (contextKey in state._inflightFetchByContext) {
      return state._inflightFetchByContext[contextKey];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<Admin[]> => {
      set({ loading: true, error: null });

      try {
        const admins = await fetchAdminsFromAPI(contextType, contextId);

        // Update cache
        set((state) => {
          const newInflight = { ...state._inflightFetchByContext };
          delete newInflight[contextKey];

          return {
            adminsByContext: {
              ...state.adminsByContext,
              [contextKey]: {
                admins,
                fetchedAt: Date.now(),
              },
            },
            loading: false,
            error: null,
            _inflightFetchByContext: newInflight,
          };
        });

        return admins;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch admins";

        // Clear inflight for this context
        set((state) => {
          const newInflight = { ...state._inflightFetchByContext };
          delete newInflight[contextKey];

          return {
            error: errorMessage,
            loading: false,
            _inflightFetchByContext: newInflight,
          };
        });

        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchByContext: {
        ...state._inflightFetchByContext,
        [contextKey]: inflightPromise,
      },
    }));

    return inflightPromise;
  },

  /**
   * Optimistically add an admin to the cache
   */
  addAdmin: (contextType: AdminContext, contextId: string, admin: Admin) => {
    const contextKey = getContextKey(contextType, contextId);
    set((state) => {
      const cached = state.adminsByContext[contextKey];
      if (!cached) return state;

      return {
        adminsByContext: {
          ...state.adminsByContext,
          [contextKey]: {
            admins: [...cached.admins, admin],
            fetchedAt: cached.fetchedAt,
          },
        },
      };
    });
  },

  /**
   * Optimistically remove an admin from the cache
   */
  removeAdmin: (contextType: AdminContext, contextId: string, adminId: string) => {
    const contextKey = getContextKey(contextType, contextId);
    set((state) => {
      const cached = state.adminsByContext[contextKey];
      if (!cached) return state;

      return {
        adminsByContext: {
          ...state.adminsByContext,
          [contextKey]: {
            admins: cached.admins.filter((admin) => admin.id !== adminId),
            fetchedAt: cached.fetchedAt,
          },
        },
      };
    });
  },

  /**
   * Optimistically update an admin's role in the cache
   */
  updateAdminRole: (
    contextType: AdminContext,
    contextId: string,
    adminId: string,
    newRole: Admin["role"]
  ) => {
    const contextKey = getContextKey(contextType, contextId);
    set((state) => {
      const cached = state.adminsByContext[contextKey];
      if (!cached) return state;

      return {
        adminsByContext: {
          ...state.adminsByContext,
          [contextKey]: {
            admins: cached.admins.map((admin) =>
              admin.id === adminId ? { ...admin, role: newRole } : admin
            ),
            fetchedAt: cached.fetchedAt,
          },
        },
      };
    });
  },

  /**
   * Invalidate admins cache for a specific context
   */
  invalidateContext: (contextType: AdminContext, contextId: string) => {
    const contextKey = getContextKey(contextType, contextId);
    set((state) => {
      const newCache = { ...state.adminsByContext };
      delete newCache[contextKey];
      return { adminsByContext: newCache };
    });
  },

  /**
   * Invalidate all admins caches
   */
  invalidateAll: () => {
    set({ adminsByContext: {}, error: null });
  },

  /**
   * Get admins for a specific context
   */
  getAdmins: (contextType: AdminContext, contextId: string) => {
    const contextKey = getContextKey(contextType, contextId);
    const cached = get().adminsByContext[contextKey];
    return cached ? cached.admins : null;
  },

  /**
   * Check if admins are currently loading for a context
   */
  isLoading: (contextType: AdminContext, contextId: string) => {
    const contextKey = getContextKey(contextType, contextId);
    const state = get();
    return state.loading && contextKey in state._inflightFetchByContext;
  },
}));
