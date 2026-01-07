/**
 * @jest-environment jsdom
 */

import { act } from "@testing-library/react";
import { useProfileStore } from "@/stores/useProfileStore";

// Mock fetch globally
global.fetch = jest.fn();

describe("useProfileStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useProfileStore.setState({
        upcomingBookings: [],
        pastBookings: [],
        activityHistory: [],
        loading: false,
        upcomingLoading: false,
        pastLoading: false,
        activityLoading: false,
        error: null,
        lastFetchedAt: null,
        hasMoreUpcoming: true,
        hasMorePast: true,
        hasMoreActivity: true,
        _inflightFetch: null,
        _inflightUpcoming: null,
        _inflightPast: null,
        _inflightActivity: null,
      });
    });
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockUpcomingBooking = {
    id: "booking-1",
    courtId: "court-1",
    start: "2024-01-20T10:00:00.000Z",
    end: "2024-01-20T11:00:00.000Z",
    price: 5000,
    status: "reserved",
    bookingStatus: "UPCOMING",
    paymentStatus: "Unpaid",
    reservationExpiresAt: "2024-01-20T09:45:00.000Z",
    court: {
      id: "court-1",
      name: "Court 1",
      club: {
        id: "club-1",
        name: "Test Club",
      },
    },
  };

  const mockPastBooking = {
    id: "booking-2",
    courtId: "court-1",
    start: "2024-01-10T10:00:00.000Z",
    end: "2024-01-10T11:00:00.000Z",
    price: 5000,
    status: "paid",
    bookingStatus: "Completed",
    paymentStatus: "Paid",
    reservationExpiresAt: null,
    court: {
      id: "court-1",
      name: "Court 1",
      club: {
        id: "club-1",
        name: "Test Club",
      },
    },
  };

  const mockActivityItem = {
    id: "booking-3",
    courtId: "court-1",
    start: "2024-01-05T10:00:00.000Z",
    end: "2024-01-05T11:00:00.000Z",
    price: 5000,
    bookingStatus: "Cancelled",
    paymentStatus: "Unpaid",
    cancelReason: "PAYMENT_TIMEOUT",
    createdAt: "2024-01-05T09:00:00.000Z",
    court: {
      id: "court-1",
      name: "Court 1",
      club: {
        id: "club-1",
        name: "Test Club",
      },
    },
  };

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useProfileStore.getState();

      expect(state.upcomingBookings).toEqual([]);
      expect(state.pastBookings).toEqual([]);
      expect(state.activityHistory).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetchedAt).toBeNull();
      expect(state.hasMoreUpcoming).toBe(true);
      expect(state.hasMorePast).toBe(true);
      expect(state.hasMoreActivity).toBe(true);
    });
  });

  describe("fetchProfileData", () => {
    it("should fetch all profile data successfully", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockUpcomingBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockPastBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockActivityItem],
        });

      await act(async () => {
        await useProfileStore.getState().fetchProfileData();
      });

      const state = useProfileStore.getState();
      expect(state.upcomingBookings).toHaveLength(1);
      expect(state.upcomingBookings[0]).toEqual(mockUpcomingBooking);
      expect(state.pastBookings).toHaveLength(1);
      expect(state.pastBookings[0]).toEqual(mockPastBooking);
      expect(state.activityHistory).toHaveLength(1);
      expect(state.activityHistory[0]).toEqual(mockActivityItem);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetchedAt).not.toBeNull();
    });

    it("should handle fetch error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      await act(async () => {
        try {
          await useProfileStore.getState().fetchProfileData();
        } catch {
          // Expected error
        }
      });

      const state = useProfileStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.loading).toBe(false);
    });

    it("should handle unauthorized error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      });

      await act(async () => {
        try {
          await useProfileStore.getState().fetchProfileData();
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      const state = useProfileStore.getState();
      expect(state.error).toBe("Unauthorized");
    });

    it("should prevent duplicate inflight requests", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockUpcomingBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockPastBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockActivityItem],
        });

      let promise1: Promise<unknown>;

      await act(async () => {
        // Start both fetches in the same tick to test inflight guard
        promise1 = useProfileStore.getState().fetchProfileData();
        void useProfileStore.getState().fetchProfileData(); // Second fetch should be ignored
        
        await promise1;
      });

      // The second call should have returned the same inflight promise
      // This tests that the inflight guard is working
      const state = useProfileStore.getState();
      expect(state.upcomingBookings).toHaveLength(1);
      
      // Should only have made 3 fetch calls total (not 6)
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("fetchProfileDataIfNeeded", () => {
    it("should fetch data when cache is empty", async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockUpcomingBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockPastBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockActivityItem],
        });

      await act(async () => {
        await useProfileStore.getState().fetchProfileDataIfNeeded();
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should use cached data when fresh", async () => {
      // Set up cached data
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          pastBookings: [mockPastBooking],
          activityHistory: [mockActivityItem],
          lastFetchedAt: Date.now(),
        });
      });

      await act(async () => {
        await useProfileStore.getState().fetchProfileDataIfNeeded();
      });

      // Should not make any fetch calls
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should force fetch when force option is true", async () => {
      // Set up cached data
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          pastBookings: [mockPastBooking],
          activityHistory: [mockActivityItem],
          lastFetchedAt: Date.now(),
        });
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockUpcomingBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockPastBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
        });

      await act(async () => {
        await useProfileStore.getState().fetchProfileDataIfNeeded({ force: true });
      });

      // Should make fetch calls despite cached data
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should fetch when cache is stale", async () => {
      // Set up stale cached data (6 minutes old)
      const staleTimestamp = Date.now() - (6 * 60 * 1000);
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          lastFetchedAt: staleTimestamp,
        });
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockUpcomingBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [mockPastBooking],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
        });

      await act(async () => {
        await useProfileStore.getState().fetchProfileDataIfNeeded();
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("invalidateProfile", () => {
    it("should clear lastFetchedAt timestamp", () => {
      // Set up cached data
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          lastFetchedAt: Date.now(),
        });
      });

      act(() => {
        useProfileStore.getState().invalidateProfile();
      });

      const state = useProfileStore.getState();
      expect(state.lastFetchedAt).toBeNull();
      // Data should still be present
      expect(state.upcomingBookings).toHaveLength(1);
    });
  });

  describe("Pagination - loadMoreUpcoming", () => {
    it("should load more upcoming bookings", async () => {
      // Set initial data
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          hasMoreUpcoming: true,
        });
      });

      const newBooking = { ...mockUpcomingBooking, id: "booking-new" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [newBooking],
      });

      await act(async () => {
        await useProfileStore.getState().loadMoreUpcoming();
      });

      const state = useProfileStore.getState();
      expect(state.upcomingBookings).toHaveLength(2);
      expect(state.upcomingBookings[1]).toEqual(newBooking);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("skip=1")
      );
    });

    it("should update hasMoreUpcoming when less than 5 items returned", async () => {
      act(() => {
        useProfileStore.setState({
          // ITEMS_PER_PAGE is 5 in the store
          upcomingBookings: Array(5).fill(mockUpcomingBooking).map((b, i) => ({ ...b, id: `booking-${i}` })),
          hasMoreUpcoming: true,
        });
      });

      // Return only 2 items (less than ITEMS_PER_PAGE = 5)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [mockUpcomingBooking, { ...mockUpcomingBooking, id: "booking-6" }],
      });

      await act(async () => {
        await useProfileStore.getState().loadMoreUpcoming();
      });

      const state = useProfileStore.getState();
      expect(state.hasMoreUpcoming).toBe(false);
    });

    it("should prevent duplicate pagination requests", async () => {
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          upcomingLoading: true, // Already loading
        });
      });

      await act(async () => {
        await useProfileStore.getState().loadMoreUpcoming();
      });

      // Should not make fetch call
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("Pagination - loadMorePast", () => {
    it("should load more past bookings", async () => {
      // Set initial data
      act(() => {
        useProfileStore.setState({
          pastBookings: [mockPastBooking],
          hasMorePast: true,
        });
      });

      const newBooking = { ...mockPastBooking, id: "booking-new" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [newBooking],
      });

      await act(async () => {
        await useProfileStore.getState().loadMorePast();
      });

      const state = useProfileStore.getState();
      expect(state.pastBookings).toHaveLength(2);
      expect(state.pastBookings[1]).toEqual(newBooking);
    });
  });

  describe("Pagination - loadMoreActivity", () => {
    it("should load more activity history", async () => {
      // Set initial data
      act(() => {
        useProfileStore.setState({
          activityHistory: [mockActivityItem],
          hasMoreActivity: true,
        });
      });

      const newItem = { ...mockActivityItem, id: "booking-new" };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [newItem],
      });

      await act(async () => {
        await useProfileStore.getState().loadMoreActivity();
      });

      const state = useProfileStore.getState();
      expect(state.activityHistory).toHaveLength(2);
      expect(state.activityHistory[1]).toEqual(newItem);
    });
  });

  describe("Selectors", () => {
    it("isDataStale should return true when no fetch timestamp", () => {
      const state = useProfileStore.getState();
      expect(state.isDataStale()).toBe(true);
    });

    it("isDataStale should return false when data is fresh", () => {
      act(() => {
        useProfileStore.setState({
          lastFetchedAt: Date.now(),
        });
      });

      const state = useProfileStore.getState();
      expect(state.isDataStale()).toBe(false);
    });

    it("isDataStale should return true when data is stale", () => {
      const staleTimestamp = Date.now() - (6 * 60 * 1000);
      act(() => {
        useProfileStore.setState({
          lastFetchedAt: staleTimestamp,
        });
      });

      const state = useProfileStore.getState();
      expect(state.isDataStale()).toBe(true);
    });

    it("hasData should return false when no data", () => {
      const state = useProfileStore.getState();
      expect(state.hasData()).toBe(false);
    });

    it("hasData should return true when upcoming bookings exist", () => {
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
        });
      });

      const state = useProfileStore.getState();
      expect(state.hasData()).toBe(true);
    });

    it("hasData should return true when past bookings exist", () => {
      act(() => {
        useProfileStore.setState({
          pastBookings: [mockPastBooking],
        });
      });

      const state = useProfileStore.getState();
      expect(state.hasData()).toBe(true);
    });

    it("hasData should return true when activity history exists", () => {
      act(() => {
        useProfileStore.setState({
          activityHistory: [mockActivityItem],
        });
      });

      const state = useProfileStore.getState();
      expect(state.hasData()).toBe(true);
    });
  });

  describe("refreshProfileData", () => {
    it("should force fetch regardless of cache", async () => {
      // Set up fresh cached data
      act(() => {
        useProfileStore.setState({
          upcomingBookings: [mockUpcomingBooking],
          lastFetchedAt: Date.now(),
        });
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
        });

      await act(async () => {
        await useProfileStore.getState().refreshProfileData();
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      const state = useProfileStore.getState();
      expect(state.upcomingBookings).toHaveLength(0); // Should be cleared
    });
  });
});
