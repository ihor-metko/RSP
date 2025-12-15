/**
 * @jest-environment jsdom
 */

import { act, waitFor } from "@testing-library/react";
import { useUserStore, User } from "@/stores/useUserStore";

// Mock fetch globally
global.fetch = jest.fn();

describe("useUserStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useUserStore.getState().clearUser();
    });
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useUserStore.getState();

      expect(state.user).toBeNull();
      expect(state.roles).toEqual([]);
      expect(state.isLoggedIn).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isHydrated).toBe(false);
    });
  });

  describe("setUser", () => {
    it("should set user and update isLoggedIn", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        isRoot: false,
      };

      act(() => {
        useUserStore.getState().setUser(mockUser);
      });

      const state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoggedIn).toBe(true);
    });

    it("should clear user when set to null", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        isRoot: false,
      };

      act(() => {
        useUserStore.getState().setUser(mockUser);
      });

      expect(useUserStore.getState().isLoggedIn).toBe(true);

      act(() => {
        useUserStore.getState().setUser(null);
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoggedIn).toBe(false);
    });
  });

  describe("setRoles", () => {
    it("should set roles", () => {
      const roles = ["ROOT_ADMIN"];

      act(() => {
        useUserStore.getState().setRoles(roles);
      });

      expect(useUserStore.getState().roles).toEqual(roles);
    });

    it("should update roles", () => {
      act(() => {
        useUserStore.getState().setRoles(["ROOT_ADMIN"]);
      });

      expect(useUserStore.getState().roles).toEqual(["ROOT_ADMIN"]);

      act(() => {
        useUserStore.getState().setRoles(["ORGANIZATION_ADMIN"]);
      });

      expect(useUserStore.getState().roles).toEqual(["ORGANIZATION_ADMIN"]);
    });
  });

  describe("clearUser", () => {
    it("should clear all user state", () => {
      const mockUser: User = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        isRoot: true,
      };

      act(() => {
        useUserStore.getState().setUser(mockUser);
        useUserStore.getState().setRoles(["ROOT_ADMIN"]);
      });

      let state = useUserStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.roles).toEqual(["ROOT_ADMIN"]);
      expect(state.isLoggedIn).toBe(true);

      act(() => {
        useUserStore.getState().clearUser();
      });

      state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.roles).toEqual([]);
      expect(state.isLoggedIn).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isHydrated).toBe(true);
    });
  });

  describe("loadUser", () => {
    it("should load user successfully for root admin", async () => {
      const mockMeResponse = {
        userId: "user-123",
        email: "admin@example.com",
        name: "Admin User",
        isRoot: true,
        adminStatus: {
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        },
        memberships: [],
        clubMemberships: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeResponse,
      });

      await act(async () => {
        await useUserStore.getState().loadUser();
      });

      await waitFor(() => {
        const state = useUserStore.getState();
        expect(state.user).toEqual({
          id: "user-123",
          email: "admin@example.com",
          name: "Admin User",
          isRoot: true,
        });
        expect(state.roles).toEqual(["ROOT_ADMIN"]);
        expect(state.isLoggedIn).toBe(true);
        expect(state.isLoading).toBe(false);
        expect(state.isHydrated).toBe(true);
        expect(state.adminStatus).toEqual({
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        });
      });
    });

    it("should load user successfully for organization admin", async () => {
      const mockMeResponse = {
        userId: "user-456",
        email: "orgadmin@example.com",
        name: "Org Admin",
        isRoot: false,
        adminStatus: {
          isAdmin: true,
          adminType: "organization_admin",
          managedIds: ["org-1"],
          isPrimaryOwner: false,
        },
        memberships: [
          {
            organizationId: "org-1",
            role: "ORGANIZATION_ADMIN",
            isPrimaryOwner: false,
          },
        ],
        clubMemberships: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeResponse,
      });

      await act(async () => {
        await useUserStore.getState().loadUser();
      });

      await waitFor(() => {
        const state = useUserStore.getState();
        expect(state.user).toEqual({
          id: "user-456",
          email: "orgadmin@example.com",
          name: "Org Admin",
          isRoot: false,
        });
        expect(state.roles).toEqual(["ORGANIZATION_ADMIN"]);
        expect(state.isLoggedIn).toBe(true);
        expect(state.memberships).toHaveLength(1);
      });
    });

    it("should load user successfully for club admin", async () => {
      const mockMeResponse = {
        userId: "user-789",
        email: "clubadmin@example.com",
        name: "Club Admin",
        isRoot: false,
        adminStatus: {
          isAdmin: true,
          adminType: "club_admin",
          managedIds: ["club-1"],
          assignedClub: {
            id: "club-1",
            name: "Test Club",
          },
        },
        memberships: [],
        clubMemberships: [
          {
            clubId: "club-1",
            role: "CLUB_ADMIN",
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMeResponse,
      });

      await act(async () => {
        await useUserStore.getState().loadUser();
      });

      await waitFor(() => {
        expect(useUserStore.getState().roles).toEqual(["CLUB_ADMIN"]);
        expect(useUserStore.getState().clubMemberships).toHaveLength(1);
      });
    });

    it("should handle unauthenticated user", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await act(async () => {
        await useUserStore.getState().loadUser();
      });

      await waitFor(() => {
        const state = useUserStore.getState();
        expect(state.user).toBeNull();
        expect(state.roles).toEqual([]);
        expect(state.isLoggedIn).toBe(false);
        expect(state.isLoading).toBe(false);
        expect(state.isHydrated).toBe(true);
      });
    });

    it("should handle fetch errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await useUserStore.getState().loadUser();
      });

      await waitFor(() => {
        const state = useUserStore.getState();
        expect(state.user).toBeNull();
        expect(state.roles).toEqual([]);
        expect(state.isLoggedIn).toBe(false);
        expect(state.isLoading).toBe(false);
        expect(state.isHydrated).toBe(true);
      });
    });
  });

  describe("hasRole", () => {
    it("should return true when user has the role", () => {
      act(() => {
        useUserStore.getState().setRoles(["ROOT_ADMIN"]);
      });

      expect(useUserStore.getState().hasRole("ROOT_ADMIN")).toBe(true);
    });

    it("should return false when user does not have the role", () => {
      act(() => {
        useUserStore.getState().setRoles(["ORGANIZATION_ADMIN"]);
      });

      expect(useUserStore.getState().hasRole("ROOT_ADMIN")).toBe(false);
    });

    it("should return false when roles array is empty", () => {
      expect(useUserStore.getState().hasRole("ROOT_ADMIN")).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("should return true when user has at least one of the roles", () => {
      act(() => {
        useUserStore.getState().setRoles(["ORGANIZATION_ADMIN"]);
      });

      expect(useUserStore.getState().hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"])).toBe(true);
    });

    it("should return false when user has none of the roles", () => {
      act(() => {
        useUserStore.getState().setRoles(["CLUB_ADMIN"]);
      });

      expect(useUserStore.getState().hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"])).toBe(false);
    });

    it("should return false when roles array is empty", () => {
      expect(useUserStore.getState().hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"])).toBe(false);
    });

    it("should handle empty input array", () => {
      act(() => {
        useUserStore.getState().setRoles(["ROOT_ADMIN"]);
      });

      expect(useUserStore.getState().hasAnyRole([])).toBe(false);
    });
  });
});
