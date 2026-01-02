/**
 * Test for player club page courts rendering
 * This test verifies that courts are properly rendered when the store state changes
 */

import { renderHook, act } from "@testing-library/react";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";

// Mock fetch
global.fetch = jest.fn();

describe("Player Club Page - Courts Rendering", () => {
  beforeEach(() => {
    // Clear store state before each test
    usePlayerClubStore.setState({
      clubs: [],
      clubsById: {},
      currentClub: null,
      loadingClubs: false,
      loading: false,
      clubsError: null,
      error: null,
      lastFetchedAt: null,
      courtsByClubId: {},
      galleryByClubId: {},
      loadingCourts: false,
      loadingGallery: false,
      _inflightFetchClubs: null,
      _inflightFetchClubById: null,
      _inflightFetchCourts: null,
      _inflightFetchGallery: null,
    });
    // Clear fetch mock
    jest.clearAllMocks();
  });

  it("should properly subscribe to courtsByClubId changes", () => {
    const clubId = "test-club-id";
    const mockCourts = [
      {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "grass",
        indoor: false,
        sportType: "PADEL" as const,
        defaultPriceCents: 5000,
        bannerData: { url: "https://example.com/banner.jpg" },
        metadata: {},
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
      {
        id: "court-2",
        name: "Court 2",
        slug: "court-2",
        type: "padel",
        surface: "artificial",
        indoor: true,
        sportType: "PADEL" as const,
        defaultPriceCents: 6000,
        bannerData: { url: "https://example.com/banner2.jpg" },
        metadata: {},
        createdAt: "2024-01-02",
        updatedAt: "2024-01-02",
      },
    ];

    // Set up a hook that subscribes to courts using the correct pattern
    const { result, rerender } = renderHook(() => {
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const rawCourts = usePlayerClubStore((state) =>
        currentClub ? state.getCourtsForClub(currentClub.id) : []
      );
      return { currentClub, rawCourts };
    });

    // Initially, no club is set, so courts should be empty
    expect(result.current.rawCourts).toEqual([]);

    // Set a current club
    act(() => {
      usePlayerClubStore.setState({
        currentClub: {
          id: clubId,
          name: "Test Club",
          shortDescription: "A test club",
          longDescription: "A longer description",
        },
      });
    });

    // Rerender to pick up the club change
    rerender();

    // Courts should still be empty since we haven't added them yet
    expect(result.current.rawCourts).toEqual([]);

    // Now add courts to the store
    act(() => {
      usePlayerClubStore.setState({
        courtsByClubId: {
          [clubId]: mockCourts,
        },
      });
    });

    // Rerender to pick up the courts change
    rerender();

    // The component should now receive the courts because it's properly subscribed to courtsByClubId
    expect(result.current.rawCourts).toEqual(mockCourts);
    expect(result.current.rawCourts).toHaveLength(2);
    expect(result.current.rawCourts[0].name).toBe("Court 1");
    expect(result.current.rawCourts[1].name).toBe("Court 2");
  });

  it("should NOT re-render when using extracted function pattern (broken pattern)", () => {
    const clubId = "test-club-id";
    const mockCourts = [
      {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "grass",
        indoor: false,
        sportType: "PADEL" as const,
        defaultPriceCents: 5000,
        bannerData: null,
        metadata: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ];

    // Set up a hook using the BROKEN pattern (extracting function)
    const { result, rerender } = renderHook(() => {
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      // BROKEN: Extracting the function instead of calling it in selector
      const getCourtsForClub = usePlayerClubStore((state) => state.getCourtsForClub);
      // This doesn't subscribe to courtsByClubId changes
      const rawCourts = currentClub ? getCourtsForClub(currentClub.id) : [];
      return { currentClub, rawCourts };
    });

    // Set a current club
    act(() => {
      usePlayerClubStore.setState({
        currentClub: {
          id: clubId,
          name: "Test Club",
        },
      });
    });

    rerender();

    // Now add courts to the store
    act(() => {
      usePlayerClubStore.setState({
        courtsByClubId: {
          [clubId]: mockCourts,
        },
      });
    });

    rerender();

    // The broken pattern does NOT pick up the courts because it doesn't subscribe to courtsByClubId
    // This demonstrates why the fix was necessary
    expect(result.current.rawCourts).toEqual([]);
  });

  it("should update courts when they change in the store", () => {
    const clubId = "test-club-id";
    const initialCourts = [
      {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "grass",
        indoor: false,
        sportType: "PADEL" as const,
        defaultPriceCents: 5000,
        bannerData: null,
        metadata: null,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      },
    ];

    const updatedCourts = [
      ...initialCourts,
      {
        id: "court-2",
        name: "Court 2",
        slug: "court-2",
        type: "padel",
        surface: "artificial",
        indoor: true,
        sportType: "PADEL" as const,
        defaultPriceCents: 6000,
        bannerData: null,
        metadata: null,
        createdAt: "2024-01-02",
        updatedAt: "2024-01-02",
      },
    ];

    // Set up hook with correct subscription pattern
    const { result, rerender } = renderHook(() => {
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const rawCourts = usePlayerClubStore((state) =>
        currentClub ? state.getCourtsForClub(currentClub.id) : []
      );
      return { rawCourts };
    });

    // Set club and initial courts
    act(() => {
      usePlayerClubStore.setState({
        currentClub: { id: clubId, name: "Test Club" },
        courtsByClubId: { [clubId]: initialCourts },
      });
    });

    rerender();
    expect(result.current.rawCourts).toHaveLength(1);

    // Update courts
    act(() => {
      usePlayerClubStore.setState({
        courtsByClubId: { [clubId]: updatedCourts },
      });
    });

    rerender();

    // Courts should update
    expect(result.current.rawCourts).toHaveLength(2);
    expect(result.current.rawCourts[1].name).toBe("Court 2");
  });
});
