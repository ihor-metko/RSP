/**
 * Tests for useOrganizationStore
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import type { Organization } from "@/types/organization";

// Mock fetch
global.fetch = jest.fn();

describe("useOrganizationStore", () => {
  beforeEach(() => {
    // Clear store state before each test
    const { result } = renderHook(() => useOrganizationStore());
    act(() => {
      result.current.setOrganizations([]);
      result.current.setCurrentOrg(null);
      result.current.setLoading(false);
      result.current.setError(null);
    });
    // Clear fetch mock
    jest.clearAllMocks();
  });

  describe("Initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useOrganizationStore());
      
      expect(result.current.organizations).toEqual([]);
      expect(result.current.currentOrg).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("State setters", () => {
    it("should set organizations", () => {
      const { result } = renderHook(() => useOrganizationStore());
      const mockOrgs: Organization[] = [
        { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
        { id: "2", name: "Org 2", slug: "org-2", createdAt: "2024-01-02" },
      ];

      act(() => {
        result.current.setOrganizations(mockOrgs);
      });

      expect(result.current.organizations).toEqual(mockOrgs);
    });

    it("should set current organization", () => {
      const { result } = renderHook(() => useOrganizationStore());
      const mockOrg: Organization = { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" };

      act(() => {
        result.current.setCurrentOrg(mockOrg);
      });

      expect(result.current.currentOrg).toEqual(mockOrg);
    });

    it("should set loading state", () => {
      const { result } = renderHook(() => useOrganizationStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("should set error state", () => {
      const { result } = renderHook(() => useOrganizationStore());

      act(() => {
        result.current.setError("Test error");
      });

      expect(result.current.error).toBe("Test error");
    });
  });

  describe("fetchOrganizations", () => {
    it("should fetch organizations successfully", async () => {
      const mockOrgs: Organization[] = [
        { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
        { id: "2", name: "Org 2", slug: "org-2", createdAt: "2024-01-02" },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrgs,
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        await result.current.fetchOrganizations();
      });

      expect(result.current.organizations).toEqual(mockOrgs);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/organizations");
    });

    it("should handle fetch error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        try {
          await result.current.fetchOrganizations();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Server error");
    });

    it("should set loading state during fetch", async () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => [],
        }), 100))
      );

      const { result } = renderHook(() => useOrganizationStore());

      act(() => {
        result.current.fetchOrganizations();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe("fetchOrganizationById", () => {
    it("should fetch organization by ID successfully", async () => {
      const mockOrg: Organization = { 
        id: "1", 
        name: "Org 1", 
        slug: "org-1", 
        createdAt: "2024-01-01" 
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrg,
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        await result.current.fetchOrganizationById("1");
      });

      expect(result.current.currentOrg).toEqual(mockOrg);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/orgs/1");
    });

    it("should handle fetch by ID error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        try {
          await result.current.fetchOrganizationById("999");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.currentOrg).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Not found");
    });
  });

  describe("createOrganization", () => {
    it("should create organization successfully", async () => {
      const payload = { name: "New Org", slug: "new-org" };
      const mockNewOrg: Organization = { 
        id: "3", 
        name: "New Org", 
        slug: "new-org", 
        createdAt: "2024-01-03",
        clubCount: 0,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewOrg,
      });

      const { result } = renderHook(() => useOrganizationStore());

      // Set initial organizations
      act(() => {
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
        ]);
      });

      let createdOrg: Organization | undefined;
      await act(async () => {
        createdOrg = await result.current.createOrganization(payload);
      });

      expect(createdOrg).toEqual(mockNewOrg);
      expect(result.current.organizations).toHaveLength(2);
      expect(result.current.organizations[0]).toEqual(mockNewOrg);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/organizations",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("should handle create error", async () => {
      const payload = { name: "New Org" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Slug already exists" }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        try {
          await result.current.createOrganization(payload);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Slug already exists");
    });
  });

  describe("updateOrganization", () => {
    it("should update organization successfully", async () => {
      const payload = { name: "Updated Org" };
      const mockUpdatedOrg: Organization = { 
        id: "1", 
        name: "Updated Org", 
        slug: "org-1", 
        createdAt: "2024-01-01" 
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedOrg,
      });

      const { result } = renderHook(() => useOrganizationStore());

      // Set initial organizations
      act(() => {
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
          { id: "2", name: "Org 2", slug: "org-2", createdAt: "2024-01-02" },
        ]);
      });

      await act(async () => {
        await result.current.updateOrganization("1", payload);
      });

      expect(result.current.organizations[0].name).toBe("Updated Org");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/orgs/1",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("should update currentOrg if it matches", async () => {
      const payload = { name: "Updated Current Org" };
      const mockUpdatedOrg: Organization = { 
        id: "1", 
        name: "Updated Current Org", 
        slug: "org-1", 
        createdAt: "2024-01-01" 
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedOrg,
      });

      const { result } = renderHook(() => useOrganizationStore());

      // Set current org
      act(() => {
        result.current.setCurrentOrg({ 
          id: "1", 
          name: "Org 1", 
          slug: "org-1", 
          createdAt: "2024-01-01" 
        });
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
        ]);
      });

      await act(async () => {
        await result.current.updateOrganization("1", payload);
      });

      expect(result.current.currentOrg?.name).toBe("Updated Current Org");
    });

    it("should handle update error", async () => {
      const payload = { name: "Updated Org" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid data" }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        try {
          await result.current.updateOrganization("1", payload);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Invalid data");
    });
  });

  describe("deleteOrganization", () => {
    it("should delete organization successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      // Set initial organizations
      act(() => {
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
          { id: "2", name: "Org 2", slug: "org-2", createdAt: "2024-01-02" },
        ]);
      });

      await act(async () => {
        await result.current.deleteOrganization("1");
      });

      expect(result.current.organizations).toHaveLength(1);
      expect(result.current.organizations[0].id).toBe("2");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/organizations/1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should delete with confirmation slug", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        await result.current.deleteOrganization("1", "org-1");
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/organizations/1",
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ confirmOrgSlug: "org-1" }),
        })
      );
    });

    it("should clear currentOrg if it was deleted", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      // Set current org
      act(() => {
        result.current.setCurrentOrg({ 
          id: "1", 
          name: "Org 1", 
          slug: "org-1", 
          createdAt: "2024-01-01" 
        });
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
        ]);
      });

      await act(async () => {
        await result.current.deleteOrganization("1");
      });

      expect(result.current.currentOrg).toBeNull();
    });

    it("should handle delete error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Cannot delete organization with clubs" }),
      });

      const { result } = renderHook(() => useOrganizationStore());

      await act(async () => {
        try {
          await result.current.deleteOrganization("1");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Cannot delete organization with clubs");
    });
  });

  describe("Selectors", () => {
    it("should get organization by ID", () => {
      const { result } = renderHook(() => useOrganizationStore());

      act(() => {
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
          { id: "2", name: "Org 2", slug: "org-2", createdAt: "2024-01-02" },
        ]);
      });

      const org = result.current.getOrganizationById("2");
      expect(org).toBeDefined();
      expect(org?.name).toBe("Org 2");
    });

    it("should return undefined for non-existent organization", () => {
      const { result } = renderHook(() => useOrganizationStore());

      act(() => {
        result.current.setOrganizations([
          { id: "1", name: "Org 1", slug: "org-1", createdAt: "2024-01-01" },
        ]);
      });

      const org = result.current.getOrganizationById("999");
      expect(org).toBeUndefined();
    });

    it("should check if organization is selected", () => {
      const { result } = renderHook(() => useOrganizationStore());

      act(() => {
        result.current.setCurrentOrg({ 
          id: "1", 
          name: "Org 1", 
          slug: "org-1", 
          createdAt: "2024-01-01" 
        });
      });

      expect(result.current.isOrgSelected("1")).toBe(true);
      expect(result.current.isOrgSelected("2")).toBe(false);
    });

    it("should return false when no organization is selected", () => {
      const { result } = renderHook(() => useOrganizationStore());

      expect(result.current.isOrgSelected("1")).toBe(false);
    });
  });
});
