import { create } from "zustand";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUsersListResponse,
  UsersFilters,
  PaginationInfo,
  SimpleUser,
  UpdateUserPayload,
} from "@/types/adminUser";

/**
 * Fetch parameters for tracking cache validity
 */
interface FetchParams {
  page: number;
  pageSize: number;
  filters: UsersFilters;
}

/**
 * Admin users store state
 */
interface AdminUsersState {
  // State
  users: AdminUser[];
  usersById: Record<string, AdminUserDetail>;
  currentUser: AdminUserDetail | null;
  simpleUsers: SimpleUser[]; // For autocomplete/search
  loading: boolean;
  loadingDetail: boolean;
  error: string | null;
  detailError: string | null;
  hasFetched: boolean;
  pagination: PaginationInfo | null;
  filters: UsersFilters;
  lastFetchedAt: number | null;
  lastFetchParams: FetchParams | null; // Track last fetch parameters for cache validation

  // Internal inflight Promise guards (not exposed)
  _inflightFetchUsers: Promise<void> | null;
  _inflightFetchUserById: Record<string, Promise<AdminUserDetail>> | null;

  // Internal helper methods
  _areFiltersEqual: (filters1: UsersFilters, filters2: UsersFilters) => boolean;
  _areFetchParamsEqual: (params1: FetchParams | null, params2: FetchParams) => boolean;

  // Actions
  setUsers: (users: AdminUser[]) => void;
  setCurrentUser: (user: AdminUserDetail | null) => void;
  clearCurrentUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: UsersFilters) => void;
  
  // Fetch actions
  fetchUsers: (options?: { 
    page?: number; 
    pageSize?: number; 
    filters?: UsersFilters;
    force?: boolean;
  }) => Promise<void>;
  
  fetchUserById: (userId: string) => Promise<void>;
  
  ensureUserById: (userId: string, options?: { force?: boolean }) => Promise<AdminUserDetail>;
  
  fetchSimpleUsers: (query?: string) => Promise<void>;
  
  // CRUD actions
  updateUser: (userId: string, payload: UpdateUserPayload) => Promise<AdminUserDetail>;
  
  deleteUser: (userId: string) => Promise<void>;
  
  blockUser: (userId: string) => Promise<void>;
  
  unblockUser: (userId: string) => Promise<void>;
  
  // Utility actions
  refreshUser: (userId: string) => Promise<void>;
  
  refetch: () => Promise<void>;
  
  invalidateUsers: () => void;

  // Selectors
  getUserById: (userId: string) => AdminUser | undefined;
  isUserSelected: (userId: string) => boolean;
}

/**
 * Zustand store for managing admin users
 * 
 * Features:
 * - Lazy fetching: data is only fetched when needed
 * - Inflight guards: prevents duplicate requests
 * - Pagination support
 * - Filtering and sorting
 * - Optimistic updates for better UX
 * - Single source of truth for user data
 * 
 * Usage:
 * ```typescript
 * const { users, loading, fetchUsers } = useAdminUsersStore();
 * 
 * useEffect(() => {
 *   fetchUsers({ page: 1, pageSize: 10 });
 * }, []);
 * ```
 */
export const useAdminUsersStore = create<AdminUsersState>((set, get) => ({
  // Initial state
  users: [],
  usersById: {},
  currentUser: null,
  simpleUsers: [],
  loading: false,
  loadingDetail: false,
  error: null,
  detailError: null,
  hasFetched: false,
  pagination: null,
  filters: {},
  lastFetchedAt: null,
  lastFetchParams: null,
  _inflightFetchUsers: null,
  _inflightFetchUserById: null,

  // State setters
  setUsers: (users) => set({ users }),
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  clearCurrentUser: () => set({ currentUser: null }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  setFilters: (filters) => set({ filters }),

  /**
   * Compare two filter objects for deep equality
   */
  _areFiltersEqual: (filters1: UsersFilters, filters2: UsersFilters): boolean => {
    const keys1 = Object.keys(filters1).sort();
    const keys2 = Object.keys(filters2).sort();
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every((key) => {
      const val1 = filters1[key as keyof UsersFilters];
      const val2 = filters2[key as keyof UsersFilters];
      
      // Handle array comparison (e.g., status filter)
      if (Array.isArray(val1) && Array.isArray(val2)) {
        return val1.length === val2.length && val1.every((v, i) => v === val2[i]);
      }
      
      // Handle primitive comparison
      return val1 === val2;
    });
  },

  /**
   * Compare two fetch parameter sets to determine if they're equivalent
   */
  _areFetchParamsEqual: (params1: FetchParams | null, params2: FetchParams): boolean => {
    if (!params1) return false;
    
    const state = get();
    return (
      params1.page === params2.page &&
      params1.pageSize === params2.pageSize &&
      state._areFiltersEqual(params1.filters, params2.filters)
    );
  },

  /**
   * Fetch users list with pagination and filtering
   * Uses inflight guard to prevent duplicate requests
   * Caches results based on fetch parameters
   */
  fetchUsers: async (options = {}) => {
    const { page = 1, pageSize = 10, filters = {}, force = false } = options;
    const state = get();

    // Create current fetch params object
    const currentParams: FetchParams = { page, pageSize, filters };

    // Skip fetch if already loaded with same parameters and not forcing refresh
    const isSameParams = state._areFetchParamsEqual(state.lastFetchParams, currentParams);
    if (state.hasFetched && isSameParams && !force && !state.error) {
      return;
    }

    // If there's already an inflight request, return it
    if (state._inflightFetchUsers) {
      return state._inflightFetchUsers;
    }

    // Create new inflight request
    const inflightPromise = (async () => {
      set({ loading: true, error: null, filters });
      
      try {
        // Build query params
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

        if (filters.search) params.append("search", filters.search);
        if (filters.role) params.append("role", filters.role);
        if (filters.organizationId) params.append("organizationId", filters.organizationId);
        if (filters.clubId) params.append("clubId", filters.clubId);
        if (filters.status) {
          if (Array.isArray(filters.status)) {
            filters.status.forEach(s => params.append("status", s));
          } else {
            params.append("status", filters.status);
          }
        }
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
        if (filters.dateRangeField) params.append("dateRangeField", filters.dateRangeField);
        if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.append("dateTo", filters.dateTo);
        if (filters.activeLast30d) params.append("activeLast30d", "true");
        if (filters.neverBooked) params.append("neverBooked", "true");
        if (filters.showOnlyAdmins) params.append("showOnlyAdmins", "true");
        if (filters.showOnlyUsers) params.append("showOnlyUsers", "true");

        const response = await fetch(`/api/admin/users/list?${params.toString()}`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch users" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data: AdminUsersListResponse = await response.json();
        
        set({ 
          users: data.users,
          pagination: data.pagination,
          loading: false,
          hasFetched: true,
          lastFetchedAt: Date.now(),
          lastFetchParams: currentParams,
          _inflightFetchUsers: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch users";
        set({ 
          error: errorMessage,
          loading: false,
          _inflightFetchUsers: null,
        });
        throw error;
      }
    })();

    set({ _inflightFetchUsers: inflightPromise });
    return inflightPromise;
  },

  /**
   * Fetch a single user by ID and set it as current
   */
  fetchUserById: async (userId: string) => {
    set({ loadingDetail: true, detailError: null });
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch user" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data: AdminUserDetail = await response.json();
      set({ currentUser: data, loadingDetail: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch user";
      set({ detailError: errorMessage, loadingDetail: false, currentUser: null });
      throw error;
    }
  },

  /**
   * Ensure a user is loaded by ID with inflight guard
   * - If !force and usersById[userId] exists, returns cached user
   * - If an inflight request for this ID exists, returns that Promise
   * - Otherwise, performs a new network request
   */
  ensureUserById: async (userId: string, options = {}) => {
    const { force = false } = options;
    const state = get();

    // If not forcing and user is already cached, return it
    if (!force && state.usersById[userId]) {
      return Promise.resolve(state.usersById[userId]);
    }

    // If there's already an inflight request for this ID, return it
    if (state._inflightFetchUserById && userId in state._inflightFetchUserById) {
      return state._inflightFetchUserById[userId];
    }

    // Create new inflight request
    const inflightPromise = (async (): Promise<AdminUserDetail> => {
      set({ loadingDetail: true, detailError: null });
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch user" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const user: AdminUserDetail = await response.json();
        
        // Update usersById cache
        set((state) => {
          const newInflight = { ...(state._inflightFetchUserById || {}) };
          delete newInflight[userId];
          
          return {
            usersById: { ...state.usersById, [userId]: user },
            loadingDetail: false,
            detailError: null,
            _inflightFetchUserById: Object.keys(newInflight).length > 0 ? newInflight : null,
          };
        });

        // Also update users array if user exists there
        const currentUsers = get().users;
        const userIndex = currentUsers.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          const updatedUsers = [...currentUsers];
          // Merge updated data while preserving the original id
          updatedUsers[userIndex] = { 
            ...updatedUsers[userIndex],
            name: user.name,
            email: user.email,
            blocked: user.blocked,
            role: user.role || updatedUsers[userIndex].role,
          };
          set({ users: updatedUsers });
        }

        return user;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch user";
        
        // Clear inflight for this ID
        set((state) => {
          const newInflight = { ...(state._inflightFetchUserById || {}) };
          delete newInflight[userId];
          
          return {
            detailError: errorMessage,
            loadingDetail: false,
            _inflightFetchUserById: Object.keys(newInflight).length > 0 ? newInflight : null,
          };
        });
        
        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchUserById: {
        ...(state._inflightFetchUserById || {}),
        [userId]: inflightPromise,
      },
    }));

    return inflightPromise;
  },

  /**
   * Fetch simple users for autocomplete/search (from /api/admin/users)
   */
  fetchSimpleUsers: async (query = "") => {
    set({ loading: true, error: null });
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const response = await fetch(`/api/admin/users${params}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch users" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data: SimpleUser[] = await response.json();
      set({ simpleUsers: data, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch users";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Update a user (optimistic update)
   */
  updateUser: async (userId: string, payload: UpdateUserPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update user" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedUser: AdminUserDetail = await response.json();

      // Update in users list
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId 
            ? { 
                ...user, 
                blocked: updatedUser.blocked,
                name: updatedUser.name ?? user.name,
                email: updatedUser.email ?? user.email,
              } 
            : user
        ),
        // Update usersById cache
        usersById: {
          ...state.usersById,
          [userId]: updatedUser,
        },
        // Update currentUser if it matches
        currentUser: state.currentUser?.id === userId ? updatedUser : state.currentUser,
        loading: false,
      }));

      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update user";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Delete a user
   */
  deleteUser: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete user" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from users list, usersById, and clear currentUser if it was deleted
      set((state) => {
        const newUsersById = { ...state.usersById };
        delete newUsersById[userId];
        
        return {
          users: state.users.filter((user) => user.id !== userId),
          usersById: newUsersById,
          currentUser: state.currentUser?.id === userId ? null : state.currentUser,
          loading: false,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Block a user
   */
  blockUser: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to block user" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Update user's blocked status optimistically
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId ? { ...user, blocked: true } : user
        ),
        usersById: state.usersById[userId]
          ? { ...state.usersById, [userId]: { ...state.usersById[userId], blocked: true } }
          : state.usersById,
        currentUser: state.currentUser?.id === userId 
          ? { ...state.currentUser, blocked: true } 
          : state.currentUser,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to block user";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Unblock a user
   */
  unblockUser: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to unblock user" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Update user's blocked status optimistically
      set((state) => ({
        users: state.users.map((user) =>
          user.id === userId ? { ...user, blocked: false } : user
        ),
        usersById: state.usersById[userId]
          ? { ...state.usersById, [userId]: { ...state.usersById[userId], blocked: false } }
          : state.usersById,
        currentUser: state.currentUser?.id === userId 
          ? { ...state.currentUser, blocked: false } 
          : state.currentUser,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unblock user";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * Refresh a single user (force refetch)
   */
  refreshUser: async (userId: string) => {
    const { ensureUserById } = get();
    await ensureUserById(userId, { force: true });
  },

  /**
   * Force refetch users (clears cache and fetches fresh data)
   */
  refetch: async () => {
    const { fetchUsers, filters, pagination } = get();
    await fetchUsers({ 
      page: pagination?.page || 1, 
      pageSize: pagination?.pageSize || 10,
      filters,
      force: true,
    });
  },

  /**
   * Invalidate users cache
   * Clears users, usersById, and optionally lastFetchedAt
   */
  invalidateUsers: () => {
    set({
      users: [],
      usersById: {},
      hasFetched: false,
      lastFetchedAt: null,
      lastFetchParams: null,
      error: null,
      pagination: null,
    });
  },

  // Selector: Get user by ID from the store
  getUserById: (userId: string) => {
    return get().users.find((user) => user.id === userId);
  },

  // Selector: Check if a user is currently selected
  isUserSelected: (userId: string) => {
    return get().currentUser?.id === userId;
  },
}));
