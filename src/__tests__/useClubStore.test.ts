/**
 * Tests for useClubStore
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { useClubStore } from "@/stores/useClubStore";
import type { ClubWithCounts, ClubDetail } from "@/types/club";

// Mock fetch
global.fetch = jest.fn();

describe("useClubStore", () => {
  beforeEach(() => {
    // Clear store state before each test
    useClubStore.setState({
      clubs: [],
      clubsById: {},
      currentClub: null,
      loadingClubs: false,
      loading: false,
      clubsError: null,
      error: null,
      lastFetchedAt: null,
      _inflightFetchClubs: null,
      _inflightFetchClubById: null,
    });
    // Clear fetch mock
    jest.clearAllMocks();
  });

  describe("Initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useClubStore());
      
      expect(result.current.clubs).toEqual([]);
      expect(result.current.currentClub).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("State setters", () => {
    it("should set clubs", () => {
      const { result } = renderHook(() => useClubStore());
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-1",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
          courtCount: 5,
        },
        { 
          id: "2", 
          name: "Club 2", 
          organizationId: "org-1",
          location: "Location 2", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-02",
          courtCount: 3,
        },
      ];

      act(() => {
        result.current.setClubs(mockClubs);
      });

      expect(result.current.clubs).toEqual(mockClubs);
    });

    it("should set current club", () => {
      const { result } = renderHook(() => useClubStore());
      const mockClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      act(() => {
        result.current.setCurrentClub(mockClub);
      });

      expect(result.current.currentClub).toEqual(mockClub);
    });

    it("should clear current club", () => {
      const { result } = renderHook(() => useClubStore());
      const mockClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      act(() => {
        result.current.setCurrentClub(mockClub);
      });

      expect(result.current.currentClub).toEqual(mockClub);

      act(() => {
        result.current.clearCurrentClub();
      });

      expect(result.current.currentClub).toBeNull();
    });

    it("should set loading state", () => {
      const { result } = renderHook(() => useClubStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it("should set error state", () => {
      const { result } = renderHook(() => useClubStore());

      act(() => {
        result.current.setError("Test error");
      });

      expect(result.current.error).toBe("Test error");
    });
  });

  describe("fetchClubs", () => {
    it("should fetch clubs successfully", async () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
          courtCount: 5,
        },
        { 
          id: "2", 
          name: "Club 2", 
          organizationId: "org-test",
          location: "Location 2", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-02",
          courtCount: 3,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clubs: mockClubs }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        await result.current.fetchClubs();
      });

      expect(result.current.clubs).toEqual(mockClubs);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs");
    });

    it("should handle non-paginated response", async () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
          courtCount: 5,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClubs,
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        await result.current.fetchClubs();
      });

      expect(result.current.clubs).toEqual(mockClubs);
    });

    it("should handle fetch error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.fetchClubs();
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
          json: async () => ({ clubs: [] }),
        }), 100))
      );

      const { result } = renderHook(() => useClubStore());

      act(() => {
        result.current.fetchClubs();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => expect(result.current.loading).toBe(false));
    });
  });

  describe("fetchClubById", () => {
    it("should fetch club by ID successfully", async () => {
      const mockClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClub,
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        await result.current.fetchClubById("1");
      });

      expect(result.current.currentClub).toEqual(mockClub);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs/1");
    });

    it("should handle fetch by ID error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.fetchClubById("999");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.currentClub).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Not found");
    });
  });

  describe("createClub", () => {
    it("should create club successfully", async () => {
      const payload = { 
        organizationId: "org-1",
        name: "New Club", 
        shortDescription: "Test",
        location: "Test Location" 
      };
      const mockNewClub = { 
        id: "3", 
        name: "New Club", 
          organizationId: "org-test",
        location: "Test Location", 
        contactInfo: null,
        openingHours: null,
        logo: null,
        status: "active", 
        createdAt: "2024-01-03",
        shortDescription: "Test",
        city: null,
        heroImage: null,
        tags: null,
        isPublic: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewClub,
      });

      const { result } = renderHook(() => useClubStore());

      // Set initial clubs
      act(() => {
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01",
          },
        ]);
      });

      let createdClub;
      await act(async () => {
        createdClub = await result.current.createClub(payload);
      });

      expect(createdClub).toEqual(mockNewClub);
      expect(result.current.clubs).toHaveLength(2);
      expect(result.current.clubs[0].id).toBe("3");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/clubs/new",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("should handle create error", async () => {
      const payload = { 
        organizationId: "org-1",
        name: "New Club",
        shortDescription: "Test",
        location: "Test Location" 
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Club already exists" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.createClub(payload);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Club already exists");
    });
  });

  describe("updateClub", () => {
    it("should update club successfully", async () => {
      const payload = { name: "Updated Club" };
      const mockUpdatedClub = { 
        id: "1", 
        name: "Updated Club", 
          organizationId: "org-test",
        location: "Location 1", 
        contactInfo: null,
        openingHours: null,
        logo: null,
        status: "active", 
        createdAt: "2024-01-01" 
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedClub,
      });

      const { result } = renderHook(() => useClubStore());

      // Set initial clubs
      act(() => {
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01" 
          },
          { 
            id: "2", 
            name: "Club 2", 
          organizationId: "org-test",
            location: "Location 2", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-02" 
          },
        ]);
      });

      await act(async () => {
        await result.current.updateClub("1", payload);
      });

      expect(result.current.clubs[0].name).toBe("Updated Club");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/clubs/1",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("should update currentClub if it matches", async () => {
      const payload = { name: "Updated Current Club" };
      const mockUpdatedClub = { 
        id: "1", 
        name: "Updated Current Club", 
          organizationId: "org-test",
        location: "Location 1",
        contactInfo: null,
        openingHours: null,
        logo: null,
        status: "active", 
        createdAt: "2024-01-01" 
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdatedClub,
      });

      const { result } = renderHook(() => useClubStore());

      // Set current club
      act(() => {
        result.current.setCurrentClub({ 
          id: "1", 
          name: "Club 1", 
          slug: "club-1",
          shortDescription: "Test",
          longDescription: null,
          location: "Location 1", 
          city: null,
          country: null,
          latitude: null,
          longitude: null,
          phone: null,
          email: null,
          website: null,
          socialLinks: null,
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          heroImage: null,
          defaultCurrency: "UAH",
          timezone: "UTC",
          isPublic: true,
          status: "active", 
          tags: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          courts: [],
          coaches: [],
          gallery: [],
          businessHours: [],
          specialHours: [],
        });
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01" 
          },
        ]);
      });

      await act(async () => {
        await result.current.updateClub("1", payload);
      });

      expect(result.current.currentClub?.name).toBe("Updated Current Club");
    });

    it("should handle update error", async () => {
      const payload = { name: "Updated Club" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "Invalid data" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.updateClub("1", payload);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Invalid data");
    });
  });

  describe("deleteClub", () => {
    it("should delete club successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Club deleted successfully" }),
      });

      const { result } = renderHook(() => useClubStore());

      // Set initial clubs
      act(() => {
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01" 
          },
          { 
            id: "2", 
            name: "Club 2", 
          organizationId: "org-test",
            location: "Location 2", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-02" 
          },
        ]);
      });

      await act(async () => {
        await result.current.deleteClub("1");
      });

      expect(result.current.clubs).toHaveLength(1);
      expect(result.current.clubs[0].id).toBe("2");
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/clubs/1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should clear currentClub if it was deleted", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Club deleted successfully" }),
      });

      const { result } = renderHook(() => useClubStore());

      // Set current club
      act(() => {
        result.current.setCurrentClub({ 
          id: "1", 
          name: "Club 1", 
          slug: "club-1",
          shortDescription: "Test",
          longDescription: null,
          location: "Location 1", 
          city: null,
          country: null,
          latitude: null,
          longitude: null,
          phone: null,
          email: null,
          website: null,
          socialLinks: null,
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          heroImage: null,
          defaultCurrency: "UAH",
          timezone: "UTC",
          isPublic: true,
          status: "active", 
          tags: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          courts: [],
          coaches: [],
          gallery: [],
          businessHours: [],
          specialHours: [],
        });
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01" 
          },
        ]);
      });

      await act(async () => {
        await result.current.deleteClub("1");
      });

      expect(result.current.currentClub).toBeNull();
    });

    it("should handle delete error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: "Cannot delete club with active bookings" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.deleteClub("1");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Cannot delete club with active bookings");
    });
  });

  describe("Selectors", () => {
    it("should get club by ID", () => {
      const { result } = renderHook(() => useClubStore());

      act(() => {
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01" 
          },
          { 
            id: "2", 
            name: "Club 2", 
          organizationId: "org-test",
            location: "Location 2", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-02" 
          },
        ]);
      });

      const club = result.current.getClubById("2");
      expect(club).toBeDefined();
      expect(club?.name).toBe("Club 2");
    });

    it("should return undefined for non-existent club", () => {
      const { result } = renderHook(() => useClubStore());

      act(() => {
        result.current.setClubs([
          { 
            id: "1", 
            name: "Club 1", 
          organizationId: "org-test",
            location: "Location 1", 
            contactInfo: null, 
            openingHours: null, 
            logo: null, 
            status: "active", 
            createdAt: "2024-01-01" 
          },
        ]);
      });

      const club = result.current.getClubById("999");
      expect(club).toBeUndefined();
    });

    it("should check if club is selected", () => {
      const { result } = renderHook(() => useClubStore());

      act(() => {
        result.current.setCurrentClub({ 
          id: "1", 
          name: "Club 1", 
          slug: "club-1",
          shortDescription: "Test",
          longDescription: null,
          location: "Location 1", 
          city: null,
          country: null,
          latitude: null,
          longitude: null,
          phone: null,
          email: null,
          website: null,
          socialLinks: null,
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          heroImage: null,
          defaultCurrency: "UAH",
          timezone: "UTC",
          isPublic: true,
          status: "active", 
          tags: null,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
          courts: [],
          coaches: [],
          gallery: [],
          businessHours: [],
          specialHours: [],
        });
      });

      expect(result.current.isClubSelected("1")).toBe(true);
      expect(result.current.isClubSelected("2")).toBe(false);
    });

    it("should return false when no club is selected", () => {
      const { result } = renderHook(() => useClubStore());

      expect(result.current.isClubSelected("1")).toBe(false);
    });
  });

  describe("fetchClubsIfNeeded", () => {
    it("should fetch clubs when clubs array is empty", async () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
          courtCount: 5,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clubs: mockClubs }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        await result.current.fetchClubsIfNeeded();
      });

      expect(result.current.clubs).toEqual(mockClubs);
      expect(result.current.loadingClubs).toBe(false);
      expect(result.current.clubsError).toBeNull();
      expect(result.current.lastFetchedAt).toBeTruthy();
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs");
    });

    it("should not fetch when clubs already exist and force is false", async () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
        },
      ];

      const { result } = renderHook(() => useClubStore());

      // Pre-populate clubs
      act(() => {
        result.current.setClubs(mockClubs);
      });

      await act(async () => {
        await result.current.fetchClubsIfNeeded();
      });

      // Should not have made a network call
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.clubs).toEqual(mockClubs);
    });

    it("should fetch when force is true even if clubs exist", async () => {
      const initialClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
        },
      ];

      const updatedClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1 Updated", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
        },
        { 
          id: "2", 
          name: "Club 2", 
          organizationId: "org-test",
          location: "Location 2", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-02",
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clubs: updatedClubs }),
      });

      const { result } = renderHook(() => useClubStore());

      // Pre-populate clubs
      act(() => {
        result.current.setClubs(initialClubs);
      });

      await act(async () => {
        await result.current.fetchClubsIfNeeded({ force: true });
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs");
      expect(result.current.clubs).toEqual(updatedClubs);
    });

    it("should deduplicate concurrent calls (inflight guard)", async () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
        },
      ];

      let resolvePromise: (value: unknown) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementation(() => delayedPromise);

      // Start multiple calls concurrently
      const promise1 = useClubStore.getState().fetchClubsIfNeeded();
      const promise2 = useClubStore.getState().fetchClubsIfNeeded();
      const promise3 = useClubStore.getState().fetchClubsIfNeeded();

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => ({ clubs: mockClubs }),
      });

      // All promises should resolve
      await Promise.all([promise1, promise2, promise3]);

      // Should only have made one network call despite multiple requests
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(useClubStore.getState().clubs).toEqual(mockClubs);
    });

    it("should clear inflight guard on error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.fetchClubsIfNeeded();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loadingClubs).toBe(false);
      expect(result.current.clubsError).toBe("Server error");

      // Clear mock for next call
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clubs: [] }),
      });

      // Should be able to retry after error
      await act(async () => {
        await result.current.fetchClubsIfNeeded({ force: true });
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("ensureClubById", () => {
    it("should fetch club when not in cache", async () => {
      const mockClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClub,
      });

      const { result } = renderHook(() => useClubStore());

      let club: ClubDetail | undefined;
      await act(async () => {
        club = await result.current.ensureClubById("1");
      });

      expect(club).toEqual(mockClub);
      expect(result.current.clubsById["1"]).toEqual(mockClub);
      expect(result.current.loadingClubs).toBe(false);
      expect(result.current.clubsError).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs/1");
    });

    it("should return cached club when available and force is false", async () => {
      const mockClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      const { result } = renderHook(() => useClubStore());

      // Pre-populate cache
      act(() => {
        result.current.setClubs([]);
        useClubStore.setState({ clubsById: { "1": mockClub } });
      });

      let club: ClubDetail | undefined;
      await act(async () => {
        club = await result.current.ensureClubById("1");
      });

      expect(club).toEqual(mockClub);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should fetch when force is true even if cached", async () => {
      const cachedClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      const updatedClub: ClubDetail = { 
        ...cachedClub,
        name: "Club 1 Updated",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedClub,
      });

      const { result } = renderHook(() => useClubStore());

      // Pre-populate cache
      act(() => {
        useClubStore.setState({ clubsById: { "1": cachedClub } });
      });

      let club: ClubDetail | undefined;
      await act(async () => {
        club = await result.current.ensureClubById("1", { force: true });
      });

      expect(club).toEqual(updatedClub);
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/clubs/1");
    });

    it("should deduplicate concurrent calls to same ID (inflight guard)", async () => {
      const mockClub: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test club",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      let resolvePromise: (value: unknown) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementation(() => delayedPromise);

      // Start multiple calls concurrently for the same ID
      const promise1 = useClubStore.getState().ensureClubById("1");
      const promise2 = useClubStore.getState().ensureClubById("1");
      const promise3 = useClubStore.getState().ensureClubById("1");

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => mockClub,
      });

      // All promises should resolve with the same club
      const [club1, club2, club3] = await Promise.all([promise1, promise2, promise3]);
      
      expect(club1).toEqual(mockClub);
      expect(club2).toEqual(mockClub);
      expect(club3).toEqual(mockClub);

      // Should only have made one network call despite multiple requests
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(useClubStore.getState().clubsById["1"]).toEqual(mockClub);
    });

    it("should clear inflight guard on error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Not found" }),
      });

      const { result } = renderHook(() => useClubStore());

      await act(async () => {
        try {
          await result.current.ensureClubById("999");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.loadingClubs).toBe(false);
      expect(result.current.clubsError).toBe("Not found");

      // Clear mock for next call
      jest.clearAllMocks();
      const mockClub: ClubDetail = { 
        id: "999", 
        name: "Club 999", 
        slug: "club-999",
        shortDescription: "Test",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockClub,
      });

      // Should be able to retry after error
      await act(async () => {
        await result.current.ensureClubById("999");
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidateClubs", () => {
    it("should clear clubs, clubsById, and lastFetchedAt", () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
        },
      ];

      const mockClubDetail: ClubDetail = { 
        id: "1", 
        name: "Club 1", 
        slug: "club-1",
        shortDescription: "Test",
        longDescription: null,
        location: "Location 1", 
        city: null,
        country: null,
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        socialLinks: null,
        contactInfo: null, 
        openingHours: null, 
        logo: null, 
        heroImage: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        isPublic: true,
        status: "active", 
        tags: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      const { result } = renderHook(() => useClubStore());

      // Populate state
      act(() => {
        result.current.setClubs(mockClubs);
        useClubStore.setState({ 
          clubsById: { "1": mockClubDetail },
          lastFetchedAt: Date.now(),
        });
      });

      expect(result.current.clubs.length).toBeGreaterThan(0);
      expect(Object.keys(result.current.clubsById).length).toBeGreaterThan(0);

      // Invalidate
      act(() => {
        result.current.invalidateClubs();
      });

      expect(result.current.clubs).toEqual([]);
      expect(result.current.clubsById).toEqual({});
      expect(result.current.lastFetchedAt).toBeNull();
      expect(result.current.clubsError).toBeNull();
    });

    it("should allow refetch after invalidation", async () => {
      const mockClubs: ClubWithCounts[] = [
        { 
          id: "1", 
          name: "Club 1", 
          organizationId: "org-test",
          location: "Location 1", 
          contactInfo: null, 
          openingHours: null, 
          logo: null, 
          status: "active", 
          createdAt: "2024-01-01",
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ clubs: mockClubs }),
      });

      const { result } = renderHook(() => useClubStore());

      // First fetch
      await act(async () => {
        await result.current.fetchClubsIfNeeded();
      });

      expect(result.current.clubs).toEqual(mockClubs);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Invalidate
      act(() => {
        result.current.invalidateClubs();
      });

      expect(result.current.clubs).toEqual([]);

      // Fetch again should trigger network call
      await act(async () => {
        await result.current.fetchClubsIfNeeded();
      });

      expect(result.current.clubs).toEqual(mockClubs);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
