/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { UnifiedDashboardResponse } from "@/app/api/admin/dashboard/route";

describe("useDashboardStore", () => {
  const mockDashboardData: UnifiedDashboardResponse = {
    adminType: "root_admin",
    isRoot: true,
    platformStats: {
      totalOrganizations: 3,
      totalClubs: 5,
      activeBookingsCount: 20,
      pastBookingsCount: 50,
    },
    registeredUsers: {
      totalUsers: 100,
      trend: [],
    },
    graphsData: {
      bookingTrends: [],
      activeUsers: [],
      timeRange: "week",
    },
  };

  beforeEach(() => {
    // Reset store before each test
    const { resetDashboard } = useDashboardStore.getState();
    resetDashboard();
    
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should fetch dashboard data successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { result } = renderHook(() => useDashboardStore());

    let data: UnifiedDashboardResponse | null = null;
    await act(async () => {
      data = await result.current.fetchDashboardOnce();
    });

    expect(data).toEqual(mockDashboardData);
    expect(result.current.data).toEqual(mockDashboardData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasFetched).toBe(true);
  });

  it("should only fetch once even when called multiple times", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { result } = renderHook(() => useDashboardStore());

    // Call fetchDashboardOnce multiple times
    await act(async () => {
      await Promise.all([
        result.current.fetchDashboardOnce(),
        result.current.fetchDashboardOnce(),
        result.current.fetchDashboardOnce(),
      ]);
    });

    // Verify fetch was called only once
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockDashboardData);
    expect(result.current.hasFetched).toBe(true);
  });

  it("should return cached data on subsequent calls", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { result } = renderHook(() => useDashboardStore());

    // First call - should fetch
    await act(async () => {
      await result.current.fetchDashboardOnce();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call - should return cached data
    let cachedData: UnifiedDashboardResponse | null = null;
    await act(async () => {
      cachedData = await result.current.fetchDashboardOnce();
    });

    expect(global.fetch).toHaveBeenCalledTimes(1); // Still only 1 call
    expect(cachedData).toEqual(mockDashboardData);
  });

  it("should handle unauthorized errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useDashboardStore());

    await act(async () => {
      try {
        await result.current.fetchDashboardOnce();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Unauthorized");
      }
    });

    expect(result.current.error).toBe("Unauthorized");
    expect(result.current.data).toBe(null);
  });

  it("should handle network errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDashboardStore());

    await act(async () => {
      try {
        await result.current.fetchDashboardOnce();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.data).toBe(null);
  });

  it("should refresh dashboard data", async () => {
    const updatedMockData = {
      ...mockDashboardData,
      platformStats: {
        ...mockDashboardData.platformStats!,
        totalOrganizations: 5, // Updated value
      },
    };

    // First fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { result } = renderHook(() => useDashboardStore());

    await act(async () => {
      await result.current.fetchDashboardOnce();
    });

    expect(result.current.data?.platformStats?.totalOrganizations).toBe(3);

    // Refresh with updated data
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedMockData,
    });

    await act(async () => {
      await result.current.refreshDashboard();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.data?.platformStats?.totalOrganizations).toBe(5);
  });

  it("should reset dashboard state", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    const { result } = renderHook(() => useDashboardStore());

    // Fetch data
    await act(async () => {
      await result.current.fetchDashboardOnce();
    });

    expect(result.current.data).toEqual(mockDashboardData);
    expect(result.current.hasFetched).toBe(true);

    // Reset
    act(() => {
      result.current.resetDashboard();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.hasFetched).toBe(false);
  });

  it("should abort request on AbortError without setting error", async () => {
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    
    (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useDashboardStore());

    await act(async () => {
      await result.current.fetchDashboardOnce();
    });

    // Error should not be set for aborted requests
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it("should prevent concurrent requests with inflight guard", async () => {
    let resolveFirst: (value: any) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      return firstPromise.then(() => ({
        ok: true,
        json: async () => mockDashboardData,
      }));
    });

    const { result } = renderHook(() => useDashboardStore());

    // Start first request (don't await)
    const firstRequest = act(async () => {
      return result.current.fetchDashboardOnce();
    });

    // Start second request while first is in flight
    const secondRequest = act(async () => {
      return result.current.fetchDashboardOnce();
    });

    // Resolve the first request
    act(() => {
      resolveFirst!({
        ok: true,
        json: async () => mockDashboardData,
      });
    });

    // Wait for both to complete
    await Promise.all([firstRequest, secondRequest]);

    // Verify fetch was called only once
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
