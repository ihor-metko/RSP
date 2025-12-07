import { create } from "zustand";
import type {
  Organization,
  CreateOrganizationPayload,
  UpdateOrganizationPayload,
} from "@/types/organization";

/**
 * Organization store state
 */
interface OrganizationState {
  // State
  organizations: Organization[];
  currentOrg: Organization | null;
  loading: boolean;
  error: string | null;

  // Actions
  setOrganizations: (orgs: Organization[]) => void;
  setCurrentOrg: (org: Organization | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchOrganizations: () => Promise<void>;
  fetchOrganizationById: (id: string) => Promise<void>;
  createOrganization: (payload: CreateOrganizationPayload) => Promise<Organization>;
  updateOrganization: (id: string, payload: UpdateOrganizationPayload) => Promise<Organization>;
  deleteOrganization: (id: string, confirmOrgSlug?: string) => Promise<void>;

  // Selectors
  getOrganizationById: (id: string) => Organization | undefined;
  isOrgSelected: (id: string) => boolean;
}

/**
 * Zustand store for managing organizations
 * SSR-friendly, lightweight, and integrates with existing API patterns
 */
export const useOrganizationStore = create<OrganizationState>((set, get) => ({
  // Initial state
  organizations: [],
  currentOrg: null,
  loading: false,
  error: null,

  // State setters
  setOrganizations: (orgs) => set({ organizations: orgs }),
  
  setCurrentOrg: (org) => set({ currentOrg: org }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch all organizations (for root admin)
  fetchOrganizations: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/admin/organizations");
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch organizations" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({ organizations: data, loading: false });
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
      const response = await fetch(`/api/orgs/${id}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to fetch organization" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      set({ currentOrg: data, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch organization";
      set({ error: errorMessage, loading: false, currentOrg: null });
      throw error;
    }
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
      // Determine which endpoint to use
      // Use PATCH for root admin endpoint, PUT for org admin endpoint
      const response = await fetch(`/api/orgs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update organization" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const updatedOrg = await response.json();

      // Update in organizations list - merge updated fields with existing org
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

      // Remove from organizations list and clear currentOrg if it was deleted
      set((state) => ({
        organizations: state.organizations.filter((org) => org.id !== id),
        currentOrg: state.currentOrg?.id === id ? null : state.currentOrg,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete organization";
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Selector: Get organization by ID from the store
  getOrganizationById: (id: string) => {
    return get().organizations.find((org) => org.id === id);
  },

  // Selector: Check if an organization is currently selected
  isOrgSelected: (id: string) => {
    return get().currentOrg?.id === id;
  },
}));
