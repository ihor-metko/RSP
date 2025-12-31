import { create } from "zustand";
import type {
  Organization,
  OrganizationSummary,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from "@/types/organization";

/**
 * Organization club with statistics from the clubs endpoint
 */
export interface OrganizationClub {
  id: string;
  name: string;
  slug: string | null;
  location: string;
  city: string | null;
  country: string | null;
  isPublic: boolean;
  createdAt: string;
  statistics: {
    courtCount: number;
    activeUpcomingBookings: number;
    pastBookings: number;
  };
}

/**
 * Organization clubs response with pagination
 */
export interface OrganizationClubsResponse {
  clubs: OrganizationClub[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Admin management payloads
 */
export interface AddAdminPayload {
  organizationId: string;
  createNew: boolean;
  userId?: string;
  name?: string;
  email?: string;
  password?: string;
  setAsPrimaryOwner?: boolean;
}

export interface RemoveAdminPayload {
  organizationId: string;
  userId: string;
}

export interface ChangeOwnerPayload {
  organizationId: string;
  userId: string;
}

/**
 * Organization detail with extended data for detail pages
 */
export interface OrganizationDetail extends Organization {
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  metrics?: {
    totalClubs: number;
    totalCourts: number;
    activeBookings: number;
  };
}

/**
 * Organization store state
 */
interface OrganizationState {
  // State
  organizations: Organization[];
  organizationsById: Record<string, OrganizationDetail>;
  organizationSummariesById: Record<string, OrganizationSummary>;
  organizationClubsById: Record<string, OrganizationClubsResponse>;
  currentOrg: Organization | null;
  loading: boolean;
  error: string | null;
  hasFetched: boolean;

  // Internal inflight guards (prevent duplicate concurrent requests)
  _inflightFetchById: Record<string, Promise<OrganizationDetail>>;
  _inflightFetchSummaryById: Record<string, Promise<OrganizationSummary>>;
  _inflightFetchClubsById: Record<string, Promise<OrganizationClubsResponse>>;

  // Actions
  setOrganizations: (orgs: Organization[]) => void;
  setCurrentOrg: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchOrganizations: (force?: boolean) => Promise<void>;
  fetchOrganizationById: (id: string) => Promise<void>;
  ensureOrganizationById: (id: string, options?: { force?: boolean }) => Promise<OrganizationDetail>;
  fetchOrganizationSummary: (id: string) => Promise<OrganizationSummary>;
  ensureOrganizationSummary: (id: string, options?: { force?: boolean }) => Promise<OrganizationSummary>;
  fetchOrganizationClubs: (id: string, params?: { page?: number; limit?: number }) => Promise<OrganizationClubsResponse>;
  ensureOrganizationClubs: (id: string, options?: { force?: boolean; page?: number; limit?: number }) => Promise<OrganizationClubsResponse>;
  createOrganization: (payload: CreateOrganizationPayload) => Promise<Organization>;
  updateOrganization: (id: string, payload: UpdateOrganizationPayload) => Promise<Organization>;
  deleteOrganization: (id: string, confirmOrgSlug?: string) => Promise<void>;
  refetch: () => Promise<void>;

  // Admin management actions
  addAdmin: (payload: AddAdminPayload) => Promise<void>;
  removeAdmin: (payload: RemoveAdminPayload) => Promise<void>;
  changeOwner: (payload: ChangeOwnerPayload) => Promise<void>;

  // Selectors
  getOrganizationById: (id: string) => Organization | undefined;
  getOrganizationDetailById: (id: string) => OrganizationDetail | undefined;
  getOrganizationSummaryById: (id: string) => OrganizationSummary | undefined;
  getOrganizationClubsById: (id: string) => OrganizationClubsResponse | undefined;
  isOrgSelected: (id: string) => boolean;
  getOrganizationsWithAutoFetch: () => Organization[];
}

/**
 * Zustand store for managing organizations
 * SSR-friendly, lightweight, and integrates with existing API patterns
 * 
 * Features:
 * - Lazy fetching: data is only fetched when needed
 * - Auto-fetch selector: automatically fetches data if not loaded
 * - Single source of truth for organization data
 * - Fetch-if-missing pattern for individual organizations with inflight guards
 */
export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  // Initial state
  organizations: [],
  organizationsById: {},
  organizationSummariesById: {},
  organizationClubsById: {},
  currentOrg: null,
  loading: false,
  error: null,
  hasFetched: false,
  _inflightFetchById: {},
  _inflightFetchSummaryById: {},
  _inflightFetchClubsById: {},

  // State setters
  setOrganizations: (orgs) => set({ organizations: orgs }),
  
  setCurrentOrg: (org) => set({ currentOrg: org }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch all organizations (for root admin) with lazy loading support
  fetchOrganizations: async (force = false) => {
    const state = get();
    
    // Skip fetch if already loaded and not forcing refresh
    if (state.hasFetched && !force && !state.error) {
      return;
    }
    
    // Skip if already loading to prevent duplicate requests
    if (state.loading) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/organizations");
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch organizations" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({ organizations: data, loading: false, hasFetched: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch organizations";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch a single organization by ID and set it as current
  fetchOrganizationById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/organizations/${id}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch organization" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Update both organizationsById cache and currentOrg
      set((state) => ({
        organizationsById: {
          ...state.organizationsById,
          [id]: data,
        },
        currentOrg: data,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization";
      set({ error: errorMessage, loading: false, currentOrg: null });
      throw error;
    }
  },

  // Ensure organization is loaded by ID with fetch-if-missing pattern
  // This method prevents duplicate fetches and returns cached data when available
  ensureOrganizationById: async (id: string, options?: { force?: boolean }) => {
    const state = get();
    
    // Return cached data if available and not forcing refresh
    if (!options?.force && state.organizationsById[id]) {
      return state.organizationsById[id];
    }
    
    // If there's already an inflight request for this ID, return it
    const inflightRequest = state._inflightFetchById[id];
    if (inflightRequest) {
      return inflightRequest;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        set({ loading: true, error: null });
        
        const response = await fetch(`/api/admin/organizations/${id}`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch organization" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Update cache and clear inflight
        // Only set as currentOrg if no org is currently selected or if it's the same org
        set((state) => {
          const newInflight = { ...state._inflightFetchById };
          delete newInflight[id];
          return {
            organizationsById: {
              ...state.organizationsById,
              [id]: data,
            },
            currentOrg: (!state.currentOrg || state.currentOrg.id === id) ? data : state.currentOrg,
            loading: false,
            _inflightFetchById: newInflight,
          };
        });
        
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization";
        
        // Clear inflight and set error
        set((state) => {
          const newInflight = { ...state._inflightFetchById };
          delete newInflight[id];
          return {
            error: errorMessage,
            loading: false,
            _inflightFetchById: newInflight,
          };
        });
        
        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchById: {
        ...state._inflightFetchById,
        [id]: fetchPromise,
      },
    }));

    return fetchPromise;
  },

  // Create a new organization (optimistic update)
  createOrganization: async (payload: CreateOrganizationPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to create organization" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const newOrg = await response.json();
      
      // Optimistically add to organizations list
      set((state) => ({
        organizations: [newOrg, ...state.organizations],
        loading: false,
      }));

      return newOrg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create organization";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update an organization (optimistic update)
  updateOrganization: async (id: string, payload: UpdateOrganizationPayload) => {
    set({ loading: true, error: null });
    try {
      // Use PATCH for admin endpoint
      const response = await fetch(`/api/admin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update organization" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedOrg = await response.json();

      // Update in organizations list, organizationsById cache, and currentOrg
      set((state) => ({
        organizations: state.organizations.map((org) =>
          org.id === id 
            ? { 
                ...org, 
                ...updatedOrg,
                // Preserve id to prevent any accidental overwrites
                id: org.id,
              } 
            : org
        ),
        // Update organizationsById cache if the org is cached
        organizationsById: state.organizationsById[id]
          ? {
              ...state.organizationsById,
              [id]: {
                ...state.organizationsById[id],
                ...updatedOrg,
                // Preserve id to prevent any accidental overwrites
                id: state.organizationsById[id].id,
              },
            }
          : state.organizationsById,
        // Update currentOrg if it matches
        currentOrg: state.currentOrg?.id === id 
          ? { 
              ...state.currentOrg, 
              ...updatedOrg,
              // Preserve id to prevent any accidental overwrites
              id: state.currentOrg.id,
            } 
          : state.currentOrg,
        loading: false,
      }));

      return updatedOrg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update organization";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete an organization
  deleteOrganization: async (id: string, confirmOrgSlug?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/organizations/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: confirmOrgSlug ? JSON.stringify({ confirmOrgSlug }) : undefined,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to delete organization" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Remove from organizations list, organizationsById cache, and clear currentOrg if it was deleted
      set((state) => {
        // Remove the deleted organization from the cache using destructuring
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _, ...remainingById } = state.organizationsById;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: __, ...remainingClubsById } = state.organizationClubsById;
        return {
          organizations: state.organizations.filter((org) => org.id !== id),
          organizationsById: remainingById,
          organizationClubsById: remainingClubsById,
          currentOrg: state.currentOrg?.id === id ? null : state.currentOrg,
          loading: false,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete organization";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Fetch organization summary by ID (lightweight, for layout usage)
  fetchOrganizationSummary: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/organizations/${id}/summary`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch organization summary" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Update organizationSummariesById cache
      set((state) => ({
        organizationSummariesById: {
          ...state.organizationSummariesById,
          [id]: data,
        },
        loading: false,
      }));

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization summary";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Ensure organization summary is loaded by ID with fetch-if-missing pattern
  // This method prevents duplicate fetches and returns cached data when available
  ensureOrganizationSummary: async (id: string, options?: { force?: boolean }) => {
    const state = get();
    
    // Return cached data if available and not forcing refresh
    if (!options?.force && state.organizationSummariesById[id]) {
      return state.organizationSummariesById[id];
    }
    
    // If there's already an inflight request for this ID, return it
    const inflightRequest = state._inflightFetchSummaryById[id];
    if (inflightRequest) {
      return inflightRequest;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        set({ loading: true, error: null });
        
        const response = await fetch(`/api/admin/organizations/${id}/summary`);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch organization summary" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Update cache and clear inflight
        set((state) => {
          const newInflight = { ...state._inflightFetchSummaryById };
          delete newInflight[id];
          return {
            organizationSummariesById: {
              ...state.organizationSummariesById,
              [id]: data,
            },
            loading: false,
            _inflightFetchSummaryById: newInflight,
          };
        });
        
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization summary";
        
        // Clear inflight and set error
        set((state) => {
          const newInflight = { ...state._inflightFetchSummaryById };
          delete newInflight[id];
          return {
            error: errorMessage,
            loading: false,
            _inflightFetchSummaryById: newInflight,
          };
        });
        
        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchSummaryById: {
        ...state._inflightFetchSummaryById,
        [id]: fetchPromise,
      },
    }));

    return fetchPromise;
  },

  // Fetch organization clubs by ID (with pagination support)
  fetchOrganizationClubs: async (id: string, params?: { page?: number; limit?: number }) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      
      const url = `/api/admin/organizations/${id}/clubs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch organization clubs" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Update organizationClubsById cache
      set((state) => ({
        organizationClubsById: {
          ...state.organizationClubsById,
          [id]: data,
        },
        loading: false,
      }));

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization clubs";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Ensure organization clubs are loaded by ID with fetch-if-missing pattern
  // This method prevents duplicate fetches and returns cached data when available
  // Note: Cache is per organization ID. For different pagination params, use force: true to refresh
  ensureOrganizationClubs: async (id: string, options?: { force?: boolean; page?: number; limit?: number }) => {
    const state = get();
    
    // Return cached data if available and not forcing refresh
    // Note: We cache by organization ID only. If you need different pagination,
    // use force: true or call fetchOrganizationClubs directly
    if (!options?.force && state.organizationClubsById[id]) {
      return state.organizationClubsById[id];
    }
    
    // If there's already an inflight request for this ID, return it
    const inflightRequest = state._inflightFetchClubsById[id];
    if (inflightRequest) {
      return inflightRequest;
    }

    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        set({ loading: true, error: null });
        
        const queryParams = new URLSearchParams();
        if (options?.page) queryParams.set('page', options.page.toString());
        if (options?.limit) queryParams.set('limit', options.limit.toString());
        
        const url = `/api/admin/organizations/${id}/clubs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch organization clubs" }));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Update cache and clear inflight
        set((state) => {
          const newInflight = { ...state._inflightFetchClubsById };
          delete newInflight[id];
          return {
            organizationClubsById: {
              ...state.organizationClubsById,
              [id]: data,
            },
            loading: false,
            _inflightFetchClubsById: newInflight,
          };
        });
        
        return data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization clubs";
        
        // Clear inflight and set error
        set((state) => {
          const newInflight = { ...state._inflightFetchClubsById };
          delete newInflight[id];
          return {
            error: errorMessage,
            loading: false,
            _inflightFetchClubsById: newInflight,
          };
        });
        
        throw error;
      }
    })();

    // Store inflight promise
    set((state) => ({
      _inflightFetchClubsById: {
        ...state._inflightFetchClubsById,
        [id]: fetchPromise,
      },
    }));

    return fetchPromise;
  },

  // Force refetch organizations (clears cache and fetches fresh data)
  refetch: async () => {
    const { fetchOrganizations } = get();
    await fetchOrganizations(true);
  },

  // Add an admin to an organization
  addAdmin: async (payload: AddAdminPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/organizations/${payload.organizationId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to add admin" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add admin";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Remove an admin from an organization
  removeAdmin: async (payload: RemoveAdminPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/organizations/${payload.organizationId}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: payload.userId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to remove admin" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to remove admin";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Change the primary owner of an organization
  changeOwner: async (payload: ChangeOwnerPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/admin/organizations/${payload.organizationId}/admins/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: payload.userId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to change owner" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      set({ loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change owner";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Selector: Get organization by ID from the store
  getOrganizationById: (id: string) => {
    return get().organizations.find((org) => org.id === id);
  },

  // Selector: Get organization detail by ID from the organizationsById cache
  getOrganizationDetailById: (id: string) => {
    return get().organizationsById[id];
  },

  // Selector: Get organization summary by ID from the organizationSummariesById cache
  getOrganizationSummaryById: (id: string) => {
    return get().organizationSummariesById[id];
  },

  // Selector: Get organization clubs by ID from the organizationClubsById cache
  getOrganizationClubsById: (id: string) => {
    return get().organizationClubsById[id];
  },

  // Selector: Check if an organization is currently selected
  isOrgSelected: (id: string) => {
    return get().currentOrg?.id === id;
  },

  // Selector with auto-fetch: Returns organizations and automatically fetches if not loaded
  // Note: This is a synchronous selector. The actual fetch triggering should be done
  // in a useEffect hook in the consuming component to avoid state update during render issues.
  // This selector just returns the current state and provides a flag indicating if fetch is needed.
  getOrganizationsWithAutoFetch: () => {
    const state = get();
    
    // Trigger fetch if not loaded and not currently loading
    // This is safe because it's wrapped in a Promise microtask
    if (!state.hasFetched && !state.loading && !state.error) {
      // Schedule fetch in microtask to avoid state update during render
      Promise.resolve().then(() => {
        const currentState = get();
        // Double-check state hasn't changed
        if (!currentState.hasFetched && !currentState.loading) {
          currentState.fetchOrganizations();
        }
      });
    }
    
    return state.organizations;
  },
}));
