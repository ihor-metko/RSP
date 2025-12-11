/**
 * Test to verify club filter visibility for different admin types on Bookings page
 * @jest-environment jsdom
 */
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { useClubStore } from "@/stores/useClubStore";

// Mock fetch globally
global.fetch = jest.fn();

describe("Bookings Page - Club Filter State Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state
    useClubStore.getState().setClubs([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should handle empty clubs array for organization admin", async () => {
    // Mock API response with empty clubs array
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        clubs: [],
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
        },
      }),
    });

    const { result } = renderHook(() => useClubStore());

    // Call fetchClubsIfNeeded (simulating organization admin)
    await result.current.fetchClubsIfNeeded();

    // Verify the store was updated with empty array
    await waitFor(() => {
      expect(result.current.clubs).toEqual([]);
      expect(result.current.loadingClubs).toBe(false);
      expect(result.current.clubsError).toBeNull();
    });
  });

  it("should handle clubs array with data for organization admin", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Test Club 1",
        location: "Location 1",
        city: "City 1",
        status: "active",
        createdAt: new Date("2024-01-01"),
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        shortDescription: "Test",
        indoorCount: 1,
        outdoorCount: 1,
        courtCount: 2,
        bookingCount: 0,
      },
      {
        id: "club-2",
        name: "Test Club 2",
        location: "Location 2",
        city: "City 2",
        status: "active",
        createdAt: new Date("2024-01-02"),
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        shortDescription: "Test 2",
        indoorCount: 2,
        outdoorCount: 0,
        courtCount: 2,
        bookingCount: 5,
      },
    ];

    // Mock API response with clubs
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        clubs: mockClubs,
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 2,
          totalPages: 1,
        },
      }),
    });

    const { result } = renderHook(() => useClubStore());

    // Call fetchClubsIfNeeded
    await result.current.fetchClubsIfNeeded();

    // Verify the store was updated with clubs
    await waitFor(() => {
      expect(result.current.clubs).toHaveLength(2);
      expect(result.current.clubs[0].name).toBe("Test Club 1");
      expect(result.current.clubs[1].name).toBe("Test Club 2");
      expect(result.current.loadingClubs).toBe(false);
      expect(result.current.clubsError).toBeNull();
    });
  });

  it("should not refetch clubs if already loaded", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Test Club 1",
        location: "Location 1",
        city: "City 1",
        status: "active",
        createdAt: new Date("2024-01-01"),
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        shortDescription: "Test",
        indoorCount: 1,
        outdoorCount: 1,
        courtCount: 2,
        bookingCount: 0,
      },
    ];

    // Mock API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        clubs: mockClubs,
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      }),
    });

    const { result } = renderHook(() => useClubStore());

    // First call - should fetch
    await result.current.fetchClubsIfNeeded();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call - should NOT fetch (clubs already loaded)
    await result.current.fetchClubsIfNeeded();
    expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, no additional call
  });

  it("should refetch clubs when force option is true", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Test Club 1",
        location: "Location 1",
        city: "City 1",
        status: "active",
        createdAt: new Date("2024-01-01"),
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        shortDescription: "Test",
        indoorCount: 1,
        outdoorCount: 1,
        courtCount: 2,
        bookingCount: 0,
      },
    ];

    // Mock API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        clubs: mockClubs,
        pagination: {
          page: 1,
          pageSize: 20,
          totalCount: 1,
          totalPages: 1,
        },
      }),
    });

    const { result } = renderHook(() => useClubStore());

    // First call - should fetch
    await result.current.fetchClubsIfNeeded();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second call with force - should fetch again
    await result.current.fetchClubsIfNeeded({ force: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
