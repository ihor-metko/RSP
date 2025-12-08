/**
 * Tests for useCourtStore
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useCourtStore } from "@/stores/useCourtStore";
import type { Court, CourtDetail } from "@/types/court";

// Mock fetch
global.fetch = jest.fn();

describe("useCourtStore", () => {
  beforeEach(() => {
    // Clear store state before each test
    const { result } = renderHook(() => useCourtStore());
    act(() => {
      result.current.setCourts([]);
      result.current.setCurrentCourt(null);
      result.current.setLoading(false);
      result.current.setError(null);
    });
    // Clear fetch mock
    jest.clearAllMocks();
  });

  describe("Initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useCourtStore());
      
      expect(result.current.courts).toEqual([]);
      expect(result.current.currentCourt).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("State setters", () => {
    it("should set courts", () => {
      const { result } = renderHook(() => useCourtStore());
      const mockCourts: Court[] = [
        { 
          id: "court-1", 
          name: "Court 1", 
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        { 
          id: "court-2", 
          name: "Court 2", 
          slug: "court-2",
          type: "tennis",
          surface: "clay",
          indoor: false,
          defaultPriceCents: 3000,
          createdAt: "2024-01-02",
          updatedAt: "2024-01-02",
        },
      ];

      act(() => {
        result.current.setCourts(mockCourts);
      });

      expect(result.current.courts).toEqual(mockCourts);
    });

    it("should set current court", () => {
      const { result } = renderHook(() => useCourtStore());
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
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        club: {
          id: "club-1",
          name: "Test Club",
        },
      };

      act(() => {
        result.current.setCurrentCourt(mockCourt);
      });

      expect(result.current.currentCourt).toEqual(mockCourt);
    });

    it("should clear current court", () => {
      const { result } = renderHook(() => useCourtStore());
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
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      act(() => {
        result.current.setCurrentCourt(mockCourt);
      });

      expect(result.current.currentCourt).toEqual(mockCourt);

      act(() => {
        result.current.clearCurrentCourt();
      });

      expect(result.current.currentCourt).toBeNull();
    });

    it("should set loading state", () => {
      const { result } = renderHook(() => useCourtStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("should set error state", () => {
      const { result } = renderHook(() => useCourtStore());

      act(() => {
        result.current.setError("Test error");
      });

      expect(result.current.error).toBe("Test error");
    });
  });

  describe("fetchCourtsByClubId", () => {
    it("should fetch courts by club ID successfully", async () => {
      const mockCourts: Court[] = [
        { 
          id: "court-1", 
          name: "Court 1", 
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
        { 
          id: "court-2", 
          name: "Court 2", 
          slug: "court-2",
          type: "tennis",
          surface: "clay",
          indoor: false,
          defaultPriceCents: 3000,
          createdAt: "2024-01-02",
          updatedAt: "2024-01-02",
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courts: mockCourts }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        await result.current.fetchCourtsByClubId("club-1");
      });

      expect(result.current.courts).toEqual(mockCourts);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/clubs/club-1/courts");
    });

    it("should handle direct array response", async () => {
      const mockCourts: Court[] = [
        { 
          id: "court-1", 
          name: "Court 1", 
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCourts,
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        await result.current.fetchCourtsByClubId("club-1");
      });

      expect(result.current.courts).toEqual(mockCourts);
    });

    it("should handle fetch error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.fetchCourtsByClubId("club-1");
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
          json: async () => ({ courts: [] }),
        }), 100))
      );

      const { result } = renderHook(() => useCourtStore());

      act(() => {
        result.current.fetchCourtsByClubId("club-1");
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe("fetchCourtById", () => {
    it("should fetch court by ID successfully", async () => {
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
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
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

      await act(async () => {
        await result.current.fetchCourtById("club-1", "court-1");
      });

      expect(result.current.currentCourt).toEqual(mockCourt);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs/club-1/courts/court-1");
    });

    it("should handle fetch by ID error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Court not found" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.fetchCourtById("club-1", "court-999");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.currentCourt).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Court not found");
    });
  });

  describe("createCourt", () => {
    it("should create court successfully", async () => {
      const payload = { 
        name: "New Court", 
        slug: "new-court",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 4000,
      };
      const mockNewCourt: Court = { 
        id: "court-3", 
        name: "New Court", 
        slug: "new-court",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 4000,
        createdAt: "2024-01-03",
        updatedAt: "2024-01-03",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Set initial courts
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
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
        ]);
      });

      let createdCourt;
      await act(async () => {
        createdCourt = await result.current.createCourt("club-1", payload);
      });

      expect(createdCourt).toEqual(mockNewCourt);
      expect(result.current.courts).toHaveLength(2);
      expect(result.current.courts[1].id).toBe("court-3");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/clubs/club-1/courts",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("should handle create error", async () => {
      const payload = { 
        name: "New Court",
        slug: "new-court",
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Court with this slug already exists" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.createCourt("club-1", payload);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Court with this slug already exists");
    });
  });

  describe("updateCourt", () => {
    it("should update court successfully", async () => {
      const payload = { name: "Updated Court" };
      const mockUpdatedCourt: Court = { 
        id: "court-1", 
        name: "Updated Court", 
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-03",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Set initial courts
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
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
          { 
            id: "court-2", 
            name: "Court 2", 
            slug: "court-2",
            type: "tennis",
            surface: "clay",
            indoor: false,
            defaultPriceCents: 3000,
            createdAt: "2024-01-02",
            updatedAt: "2024-01-02",
          },
        ]);
      });

      await act(async () => {
        await result.current.updateCourt("club-1", "court-1", payload);
      });

      expect(result.current.courts[0].name).toBe("Updated Court");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/clubs/club-1/courts/court-1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("should update currentCourt if it matches", async () => {
      const payload = { name: "Updated Current Court" };
      const mockUpdatedCourt: Court = { 
        id: "court-1", 
        name: "Updated Current Court", 
        slug: "court-1",
        type: "padel",
        surface: "synthetic",
        indoor: true,
        defaultPriceCents: 5000,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-03",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedCourt,
      });

      const { result } = renderHook(() => useCourtStore());

      // Set current court
      act(() => {
        result.current.setCurrentCourt({ 
          id: "court-1", 
          name: "Court 1", 
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
          clubId: "club-1",
          isActive: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        });
        result.current.setCourts([
          { 
            id: "court-1", 
            name: "Court 1", 
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
        ]);
      });

      await act(async () => {
        await result.current.updateCourt("club-1", "court-1", payload);
      });

      expect(result.current.currentCourt?.name).toBe("Updated Current Court");
    });

    it("should handle update error", async () => {
      const payload = { name: "Updated Court" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid data" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.updateCourt("club-1", "court-1", payload);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Invalid data");
    });
  });

  describe("deleteCourt", () => {
    it("should delete court successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Court deleted successfully" }),
      });

      const { result } = renderHook(() => useCourtStore());

      // Set initial courts
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
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
          { 
            id: "court-2", 
            name: "Court 2", 
            slug: "court-2",
            type: "tennis",
            surface: "clay",
            indoor: false,
            defaultPriceCents: 3000,
            createdAt: "2024-01-02",
            updatedAt: "2024-01-02",
          },
        ]);
      });

      await act(async () => {
        await result.current.deleteCourt("club-1", "court-1");
      });

      expect(result.current.courts).toHaveLength(1);
      expect(result.current.courts[0].id).toBe("court-2");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/clubs/club-1/courts/court-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should clear currentCourt if it was deleted", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Court deleted successfully" }),
      });

      const { result } = renderHook(() => useCourtStore());

      // Set current court
      act(() => {
        result.current.setCurrentCourt({ 
          id: "court-1", 
          name: "Court 1", 
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
          clubId: "club-1",
          isActive: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        });
        result.current.setCourts([
          { 
            id: "court-1", 
            name: "Court 1", 
            slug: "court-1",
            type: "padel",
            surface: "synthetic",
            indoor: true,
            defaultPriceCents: 5000,
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
        ]);
      });

      await act(async () => {
        await result.current.deleteCourt("club-1", "court-1");
      });

      expect(result.current.currentCourt).toBeNull();
    });

    it("should handle delete error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Cannot delete court with active bookings" }),
      });

      const { result } = renderHook(() => useCourtStore());

      await act(async () => {
        try {
          await result.current.deleteCourt("club-1", "court-1");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Cannot delete court with active bookings");
    });
  });

  describe("Selectors", () => {
    it("should get court by ID", () => {
      const { result } = renderHook(() => useCourtStore());

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
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
          { 
            id: "court-2", 
            name: "Court 2", 
            slug: "court-2",
            type: "tennis",
            surface: "clay",
            indoor: false,
            defaultPriceCents: 3000,
            createdAt: "2024-01-02",
            updatedAt: "2024-01-02",
          },
        ]);
      });

      const court = result.current.getCourtById("court-2");
      expect(court).toBeDefined();
      expect(court?.name).toBe("Court 2");
    });

    it("should return undefined for non-existent court", () => {
      const { result } = renderHook(() => useCourtStore());

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
            createdAt: "2024-01-01",
            updatedAt: "2024-01-01",
          },
        ]);
      });

      const court = result.current.getCourtById("court-999");
      expect(court).toBeUndefined();
    });

    it("should check if court is selected", () => {
      const { result } = renderHook(() => useCourtStore());

      act(() => {
        result.current.setCurrentCourt({ 
          id: "court-1", 
          name: "Court 1", 
          slug: "court-1",
          type: "padel",
          surface: "synthetic",
          indoor: true,
          defaultPriceCents: 5000,
          clubId: "club-1",
          isActive: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        });
      });

      expect(result.current.isCourtSelected("court-1")).toBe(true);
      expect(result.current.isCourtSelected("court-2")).toBe(false);
    });

    it("should return false when no court is selected", () => {
      const { result } = renderHook(() => useCourtStore());

      expect(result.current.isCourtSelected("court-1")).toBe(false);
    });
  });
});
