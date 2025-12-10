/**
 * Tests for useAdminUsersStore
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import type { AdminUser, AdminUserDetail, AdminUsersListResponse } from "@/types/adminUser";

// Mock fetch
global.fetch = jest.fn();

describe("useAdminUsersStore", () => {
  beforeEach(() => {
    // Clear store state before each test
    useAdminUsersStore.setState({
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
      _inflightFetchUsers: null,
      _inflightFetchUserById: null,
    });
    // Clear fetch mock
    jest.clearAllMocks();
  });

  describe("Initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useAdminUsersStore());
      
      expect(result.current.users).toEqual([]);
      expect(result.current.usersById).toEqual({});
      expect(result.current.currentUser).toBeNull();
      expect(result.current.simpleUsers).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.loadingDetail).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.detailError).toBeNull();
      expect(result.current.hasFetched).toBe(false);
      expect(result.current.pagination).toBeNull();
      expect(result.current.filters).toEqual({});
      expect(result.current.lastFetchedAt).toBeNull();
    });
  });

  describe("State setters", () => {
    it("should set users", () => {
      const { result } = renderHook(() => useAdminUsersStore());
      const mockUsers: AdminUser[] = [
        {
          id: "1",
          name: "User 1",
          email: "user1@example.com",
          role: "user",
          organization: null,
          club: null,
          blocked: false,
          createdAt: "2024-01-01",
          lastActivity: "2024-01-01",
        },
      ];

      act(() => {
        result.current.setUsers(mockUsers);
      });

      expect(result.current.users).toEqual(mockUsers);
    });

    it("should set current user", () => {
      const { result } = renderHook(() => useAdminUsersStore());
      const mockUser: AdminUserDetail = {
        id: "1",
        name: "User 1",
        email: "user1@example.com",
        blocked: false,
      };

      act(() => {
        result.current.setCurrentUser(mockUser);
      });

      expect(result.current.currentUser).toEqual(mockUser);
    });

    it("should clear current user", () => {
      const { result } = renderHook(() => useAdminUsersStore());
      const mockUser: AdminUserDetail = {
        id: "1",
        name: "User 1",
        email: "user1@example.com",
        blocked: false,
      };

      act(() => {
        result.current.setCurrentUser(mockUser);
        result.current.clearCurrentUser();
      });

      expect(result.current.currentUser).toBeNull();
    });

    it("should set loading state", () => {
      const { result } = renderHook(() => useAdminUsersStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("should set error state", () => {
      const { result } = renderHook(() => useAdminUsersStore());

      act(() => {
        result.current.setError("Test error");
      });

      expect(result.current.error).toBe("Test error");
    });

    it("should set filters", () => {
      const { result } = renderHook(() => useAdminUsersStore());
      const filters = { search: "test", role: "user" as const };

      act(() => {
        result.current.setFilters(filters);
      });

      expect(result.current.filters).toEqual(filters);
    });
  });

  describe("fetchUsers", () => {
    it("should fetch users successfully", async () => {
      const mockResponse: AdminUsersListResponse = {
        users: [
          {
            id: "1",
            name: "User 1",
            email: "user1@example.com",
            role: "user",
            organization: null,
            club: null,
            blocked: false,
            createdAt: "2024-01-01",
            lastActivity: "2024-01-01",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAdminUsersStore());

      await act(async () => {
        await result.current.fetchUsers();
      });

      expect(result.current.users).toEqual(mockResponse.users);
      expect(result.current.pagination).toEqual(mockResponse.pagination);
      expect(result.current.loading).toBe(false);
      expect(result.current.hasFetched).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch users error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const { result } = renderHook(() => useAdminUsersStore());

      await act(async () => {
        try {
          await result.current.fetchUsers();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Server error");
      expect(result.current.loading).toBe(false);
    });

    it("should skip fetch if already loaded and not forcing", async () => {
      const { result } = renderHook(() => useAdminUsersStore());

      // Set hasFetched to true
      act(() => {
        useAdminUsersStore.setState({ hasFetched: true, users: [] });
      });

      await act(async () => {
        await result.current.fetchUsers();
      });

      // fetch should not have been called
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should force fetch when force option is true", async () => {
      const mockResponse: AdminUsersListResponse = {
        users: [
          {
            id: "1",
            name: "User 1",
            email: "user1@example.com",
            role: "user",
            organization: null,
            club: null,
            blocked: false,
            createdAt: "2024-01-01",
            lastActivity: "2024-01-01",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          totalCount: 1,
          totalPages: 1,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAdminUsersStore());

      // Set hasFetched to true
      act(() => {
        useAdminUsersStore.setState({ hasFetched: true, users: [] });
      });

      await act(async () => {
        await result.current.fetchUsers({ force: true });
      });

      // fetch should have been called
      expect(global.fetch).toHaveBeenCalled();
      expect(result.current.users).toEqual(mockResponse.users);
    });

    it("should include filters in query params", async () => {
      const mockResponse: AdminUsersListResponse = {
        users: [],
        pagination: {
          page: 1,
          pageSize: 10,
          totalCount: 0,
          totalPages: 0,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAdminUsersStore());

      await act(async () => {
        await result.current.fetchUsers({
          filters: {
            search: "test",
            role: "user",
            status: "active",
          },
        });
      });

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchCall).toContain("search=test");
      expect(fetchCall).toContain("role=user");
      expect(fetchCall).toContain("status=active");
    });
  });

  describe("fetchUserById", () => {
    it("should fetch user by ID successfully", async () => {
      const mockUser: AdminUserDetail = {
        id: "1",
        name: "User 1",
        email: "user1@example.com",
        blocked: false,
        role: "user",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAdminUsersStore());

      await act(async () => {
        await result.current.fetchUserById("1");
      });

      expect(result.current.currentUser).toEqual(mockUser);
      expect(result.current.loadingDetail).toBe(false);
      expect(result.current.detailError).toBeNull();
    });

    it("should handle fetch user by ID error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "User not found" }),
      });

      const { result } = renderHook(() => useAdminUsersStore());

      await act(async () => {
        try {
          await result.current.fetchUserById("1");
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.detailError).toBe("User not found");
      expect(result.current.loadingDetail).toBe(false);
      expect(result.current.currentUser).toBeNull();
    });
  });

  describe("ensureUserById", () => {
    it("should return cached user if available", async () => {
      const mockUser: AdminUserDetail = {
        id: "1",
        name: "User 1",
        email: "user1@example.com",
        blocked: false,
      };

      const { result } = renderHook(() => useAdminUsersStore());

      // Pre-populate cache
      act(() => {
        useAdminUsersStore.setState({
          usersById: { "1": mockUser },
        });
      });

      let cachedUser: AdminUserDetail | undefined;
      await act(async () => {
        cachedUser = await result.current.ensureUserById("1");
      });

      expect(cachedUser).toEqual(mockUser);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should fetch user if not cached", async () => {
      const mockUser: AdminUserDetail = {
        id: "1",
        name: "User 1",
        email: "user1@example.com",
        blocked: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAdminUsersStore());

      let fetchedUser: AdminUserDetail | undefined;
      await act(async () => {
        fetchedUser = await result.current.ensureUserById("1");
      });

      expect(fetchedUser).toEqual(mockUser);
      expect(result.current.usersById["1"]).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      const mockUser: AdminUserDetail = {
        id: "1",
        name: "User 1",
        email: "user1@example.com",
        blocked: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      });

      const { result } = renderHook(() => useAdminUsersStore());

      // Pre-populate users list
      act(() => {
        useAdminUsersStore.setState({
          users: [
            {
              id: "1",
              name: "User 1",
              email: "user1@example.com",
              role: "user",
              organization: null,
              club: null,
              blocked: false,
              createdAt: "2024-01-01",
              lastActivity: "2024-01-01",
            },
          ],
        });
      });

      await act(async () => {
        await result.current.updateUser("1", { blocked: true });
      });

      expect(result.current.users[0].blocked).toBe(true);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("blockUser", () => {
    it("should block user successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useAdminUsersStore());

      // Pre-populate users list
      act(() => {
        useAdminUsersStore.setState({
          users: [
            {
              id: "1",
              name: "User 1",
              email: "user1@example.com",
              role: "user",
              organization: null,
              club: null,
              blocked: false,
              createdAt: "2024-01-01",
              lastActivity: "2024-01-01",
            },
          ],
        });
      });

      await act(async () => {
        await result.current.blockUser("1");
      });

      expect(result.current.users[0].blocked).toBe(true);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("unblockUser", () => {
    it("should unblock user successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => useAdminUsersStore());

      // Pre-populate users list
      act(() => {
        useAdminUsersStore.setState({
          users: [
            {
              id: "1",
              name: "User 1",
              email: "user1@example.com",
              role: "user",
              organization: null,
              club: null,
              blocked: true,
              createdAt: "2024-01-01",
              lastActivity: "2024-01-01",
            },
          ],
        });
      });

      await act(async () => {
        await result.current.unblockUser("1");
      });

      expect(result.current.users[0].blocked).toBe(false);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useAdminUsersStore());

      // Pre-populate users list
      act(() => {
        useAdminUsersStore.setState({
          users: [
            {
              id: "1",
              name: "User 1",
              email: "user1@example.com",
              role: "user",
              organization: null,
              club: null,
              blocked: false,
              createdAt: "2024-01-01",
              lastActivity: "2024-01-01",
            },
          ],
        });
      });

      await act(async () => {
        await result.current.deleteUser("1");
      });

      expect(result.current.users).toHaveLength(0);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("Selectors", () => {
    it("should get user by ID", () => {
      const { result } = renderHook(() => useAdminUsersStore());

      act(() => {
        useAdminUsersStore.setState({
          users: [
            {
              id: "1",
              name: "User 1",
              email: "user1@example.com",
              role: "user",
              organization: null,
              club: null,
              blocked: false,
              createdAt: "2024-01-01",
              lastActivity: "2024-01-01",
            },
          ],
        });
      });

      const user = result.current.getUserById("1");
      expect(user).toBeDefined();
      expect(user?.id).toBe("1");
    });

    it("should check if user is selected", () => {
      const { result } = renderHook(() => useAdminUsersStore());

      act(() => {
        useAdminUsersStore.setState({
          currentUser: {
            id: "1",
            name: "User 1",
            email: "user1@example.com",
            blocked: false,
          },
        });
      });

      expect(result.current.isUserSelected("1")).toBe(true);
      expect(result.current.isUserSelected("2")).toBe(false);
    });
  });

  describe("invalidateUsers", () => {
    it("should clear users cache", () => {
      const { result } = renderHook(() => useAdminUsersStore());

      act(() => {
        useAdminUsersStore.setState({
          users: [
            {
              id: "1",
              name: "User 1",
              email: "user1@example.com",
              role: "user",
              organization: null,
              club: null,
              blocked: false,
              createdAt: "2024-01-01",
              lastActivity: "2024-01-01",
            },
          ],
          hasFetched: true,
          lastFetchedAt: Date.now(),
        });
      });

      act(() => {
        result.current.invalidateUsers();
      });

      expect(result.current.users).toHaveLength(0);
      expect(result.current.usersById).toEqual({});
      expect(result.current.hasFetched).toBe(false);
      expect(result.current.lastFetchedAt).toBeNull();
    });
  });
});
