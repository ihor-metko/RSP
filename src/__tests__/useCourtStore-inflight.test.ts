/**
 * Tests for useCourtStore inflight guards and fetch-if-missing functionality
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useCourtStore } from "@/stores/useCourtStore";
import type { Court, CourtDetail } from "@/types/court";

// Mock fetch
global.fetch = jest.fn();

describe("useCourtStore - Inflight Guards & Fetch-if-Missing", () => {
  beforeEach(() => {
    // Clear store state before each test
    const { result } = renderHook(() => useCourtStore());
    act(() => {
      result.current.invalidateCourts();
      result.current.setLoading(false);
      result.current.setError(null);
      result.current.setCurrentCourt(null);
    });
    // Clear fetch mock
    jest.clearAllMocks();
  });

  describe("fetchCourtsIfNeeded", () => {
    it("should fetch courts when cache is empty", async () => {
      const mockCourts: Court[] = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courts: mockCourts }),
      });

      const { result } = renderHook(() => useCourtStore());

      let courts: Court[] = [];
      await act(async () => {
        courts = await result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
      });

      expect(courts).toEqual(mockCourts);
      expect(result.current.courts).toEqual(mockCourts);
      expect(result.current.loadingCourts).toBe(false);
      expect(result.current.courtsError).toBeNull();
      expect(result.current.lastFetchedAt).not.toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith("/api/clubs/club-1/courts");
    });

    it("should return cached courts without fetching when data exists", async () => {
      const mockCourts: Court[] = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
        },
      ];

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate cache
      act(() => {
        result.current.setCourts(mockCourts);
      });

      let courts: Court[] = [];
      await act(async () => {
        courts = await result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
      });

      expect(courts).toEqual(mockCourts);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should force fetch when force=true even if cache exists", async () => {
      const initialCourts: Court[] = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
        },
      ];

      const updatedCourts: Court[] = [
        {
          id: "court-1",
          name: "Court 1 Updated",
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 6000,
        },
        {
          id: "court-2",
          name: "Court 2",
          slug: "court-2",
          type: "tennis",
          surface: "clay",
          indoor: false,
          defaultPriceCents: 4000,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courts: updatedCourts }),
      });

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate cache
      act(() => {
        result.current.setCourts(initialCourts);
      });

      let courts: Court[] = [];
      await act(async () => {
        courts = await result.current.fetchCourtsIfNeeded({ clubId: "club-1", force: true });
      });

      expect(courts).toEqual(updatedCourts);
      expect(result.current.courts).toEqual(updatedCourts);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent calls with single network request", async () => {
      const mockCourts: Court[] = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
        },
      ];

      type FetchResponse = { ok: boolean; json: () => Promise<{ courts: Court[] }> };
      let resolvePromise: ((value: FetchResponse) => void) | undefined;
      const fetchPromise = new Promise<FetchResponse>((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useCourtStore());

      let promise1: Promise<Court[]>;
      let promise2: Promise<Court[]>;
      
      // Start two concurrent fetches
      act(() => {
        promise1 = result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
        promise2 = result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
      });

      // Resolve the fetch
      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ courts: mockCourts }),
        });
      });

      const [courts1, courts2] = await Promise.all([promise1!, promise2!]);

      expect(courts1).toEqual(mockCourts);
      expect(courts2).toEqual(mockCourts);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should clear inflight guard on error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
        } catch (error) {
          // Expected to throw - error is intentionally unused
          void error;
        }
      });

      expect(result.current.loadingCourts).toBe(false);
      expect(result.current.courtsError).toBe("Server error");
      expect(result.current._inflightFetchCourts).toBeNull();

      // Should allow retry after error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courts: [] }),
      });

      await act(async () => {
        await result.current.fetchCourtsIfNeeded({ clubId: "club-1", force: true });
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should set loading state during fetch", async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ courts: [] }),
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useCourtStore());

      act(() => {
        result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
      });

      expect(result.current.loadingCourts).toBe(true);

      await waitFor(() => expect(result.current.loadingCourts).toBe(false));
    });
  });

  describe("ensureCourtById", () => {
    it("should fetch court when not in cache", async () => {
      const mockCourt: CourtDetail = {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        clubId: "club-1",
        isActive: true,
        club: {
          id: "club-1",
          name: "Test Club",
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      let court: CourtDetail | undefined;
      await act(async () => {
        court = await result.current.ensureCourtById("court-1", { clubId: "club-1" });
      });

      expect(court).toEqual(mockCourt);
      expect(result.current.courtsById["court-1"]).toEqual(mockCourt);
      expect(result.current.loadingCourts).toBe(false);
      expect(result.current.courtsError).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should return cached court without fetching when exists", async () => {
      const mockCourt: CourtDetail = {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        clubId: "club-1",
        isActive: true,
        club: {
          id: "club-1",
          name: "Test Club",
        },
      };

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate cache
      act(() => {
        result.current.setCourts([mockCourt]);
      });
      act(() => {
        useCourtStore.setState({
          courtsById: { "court-1": mockCourt },
        });
      });

      let court: CourtDetail | undefined;
      await act(async () => {
        court = await result.current.ensureCourtById("court-1");
      });

      expect(court).toEqual(mockCourt);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should force fetch when force=true even if cached", async () => {
      const cachedCourt: CourtDetail = {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        clubId: "club-1",
        isActive: true,
      };

      const updatedCourt: CourtDetail = {
        id: "court-1",
        name: "Court 1 Updated",
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 6000,
        clubId: "club-1",
        isActive: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate cache
      act(() => {
        useCourtStore.setState({
          courtsById: { "court-1": cachedCourt },
        });
      });

      let court: CourtDetail | undefined;
      await act(async () => {
        court = await result.current.ensureCourtById("court-1", { force: true });
      });

      expect(court).toEqual(updatedCourt);
      expect(result.current.courtsById["court-1"]).toEqual(updatedCourt);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent calls for same court with single request", async () => {
      const mockCourt: CourtDetail = {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        clubId: "club-1",
        isActive: true,
      };

      type FetchResponse = { ok: boolean; json: () => Promise<CourtDetail> };
      let resolvePromise: ((value: FetchResponse) => void) | undefined;
      const fetchPromise = new Promise<FetchResponse>((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useCourtStore());

      let promise1: Promise<CourtDetail>;
      let promise2: Promise<CourtDetail>;

      // Start two concurrent fetches
      act(() => {
        promise1 = result.current.ensureCourtById("court-1");
        promise2 = result.current.ensureCourtById("court-1");
      });

      // Resolve the fetch
      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => mockCourt,
        });
      });

      const [court1, court2] = await Promise.all([promise1!, promise2!]);

      expect(court1).toEqual(mockCourt);
      expect(court2).toEqual(mockCourt);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should clear inflight guard on error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Court not found" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.ensureCourtById("court-999");
        } catch (error) {
          // Expected to throw - error is intentionally unused
          void error;
        }
      });

      expect(result.current.loadingCourts).toBe(false);
      expect(result.current.courtsError).toBe("Court not found");
      expect(result.current._inflightFetchCourtById["court-999"]).toBeUndefined();
    });

    it("should add court to courts array if not present", async () => {
      const mockCourt: CourtDetail = {
        id: "court-2",
        name: "Court 2",
        slug: "court-2",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        clubId: "club-1",
        isActive: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate with different court
      act(() => {
        result.current.setCourts([
          {
            id: "court-1",
            name: "Court 1",
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
          },
        ]);
      });

      await act(async () => {
        await result.current.ensureCourtById("court-2");
      });

      expect(result.current.courts).toHaveLength(2);
      expect(result.current.courts.find((c) => c.id === "court-2")).toEqual(mockCourt);
    });
  });

  describe("invalidateCourts", () => {
    it("should clear all caches and state", () => {
      const { result } = renderHook(() => useCourtStore());

      // Pre-populate store
      act(() => {
        result.current.setCourts([
          {
            id: "court-1",
            name: "Court 1",
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
          },
        ]);
        useCourtStore.setState({
          courtsById: {
            "court-1": {
              id: "court-1",
              name: "Court 1",
              slug: "court-1",
              type: "padel",
              surface: "synthetic",
              indoor: true,
              defaultPriceCents: 5000,
              clubId: "club-1",
              isActive: true,
            },
          },
        });
      });

      expect(result.current.courts.length).toBeGreaterThan(0);
      expect(result.current.lastFetchedAt).not.toBeNull();

      act(() => {
        result.current.invalidateCourts();
      });

      expect(result.current.courts).toEqual([]);
      expect(result.current.courtsById).toEqual({});
      expect(result.current.lastFetchedAt).toBeNull();
      expect(result.current._inflightFetchCourts).toBeNull();
      expect(result.current._inflightFetchCourtById).toEqual({});
    });

    it("should allow fresh fetch after invalidation", async () => {
      const mockCourts: Court[] = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
        },
      ];

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate cache
      act(() => {
        result.current.setCourts(mockCourts);
      });

      // Invalidate
      act(() => {
        result.current.invalidateCourts();
      });

      expect(result.current.courts).toEqual([]);

      // Now fetch should make network request
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courts: mockCourts }),
      });

      await act(async () => {
        await result.current.fetchCourtsIfNeeded({ clubId: "club-1" });
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.current.courts).toEqual(mockCourts);
    });
  });

  describe("Integration with create/update/delete", () => {
    it("should update cache when creating a court", async () => {
      const newCourt: Court = {
        id: "court-2",
        name: "New Court",
        slug: "new-court",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate with existing court
      act(() => {
        result.current.setCourts([
          {
            id: "court-1",
            name: "Court 1",
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
          },
        ]);
      });

      await act(async () => {
        await result.current.createCourt("club-1", {
          name: "New Court",
          slug: "new-court",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
        });
      });

      expect(result.current.courts).toHaveLength(2);
      expect(result.current.courtsById["court-2"]).toEqual(newCourt);
      expect(result.current.lastFetchedAt).not.toBeNull();
    });

    it("should update cache when updating a court", async () => {
      const updatedCourt: Court = {
        id: "court-1",
        name: "Updated Court",
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 6000,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate
      act(() => {
        result.current.setCourts([
          {
            id: "court-1",
            name: "Court 1",
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
          },
        ]);
        useCourtStore.setState({
          courtsById: {
            "court-1": {
              id: "court-1",
              name: "Court 1",
              slug: "court-1",
              type: "padel",
              surface: "synthetic",
              indoor: true,
              defaultPriceCents: 5000,
              clubId: "club-1",
              isActive: true,
            },
          },
        });
      });

      await act(async () => {
        await result.current.updateCourt("club-1", "court-1", {
          name: "Updated Court",
          defaultPriceCents: 6000,
        });
      });

      expect(result.current.courts[0].name).toBe("Updated Court");
      expect(result.current.courtsById["court-1"].name).toBe("Updated Court");
      expect(result.current.lastFetchedAt).not.toBeNull();
    });

    it("should remove from cache when deleting a court", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Deleted" }),
      });

      const { result } = renderHook(() => useCourtStore());

      // Pre-populate
      act(() => {
        result.current.setCourts([
          {
            id: "court-1",
            name: "Court 1",
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
          },
        ]);
        useCourtStore.setState({
          courtsById: {
            "court-1": {
              id: "court-1",
              name: "Court 1",
              slug: "court-1",
              type: "padel",
              surface: "synthetic",
              indoor: true,
              defaultPriceCents: 5000,
              clubId: "club-1",
              isActive: true,
            },
          },
        });
      });

      await act(async () => {
        await result.current.deleteCourt("club-1", "court-1");
      });

      expect(result.current.courts).toHaveLength(0);
      expect(result.current.courtsById["court-1"]).toBeUndefined();
      expect(result.current.lastFetchedAt).not.toBeNull();
    });
  });
});
