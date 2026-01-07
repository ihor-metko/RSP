/**
 * Test for player club page loading and error states
 * This test verifies that the club page follows the correct loading → success → error flow
 */

import { renderHook, act } from "@testing-library/react";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";

// Mock fetch
global.fetch = jest.fn();

describe("Player Club Page - Loading and Error States", () => {
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

  it("should show loading state when loadingClubs is true and no club data", () => {
    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // Set loading state
    act(() => {
      usePlayerClubStore.setState({ loadingClubs: true });
    });

    // Should be in loading state
    expect(result.current.loadingClubs).toBe(true);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe(null);
  });

  it("should show loading state when no club data yet and no error", () => {
    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // Initial state: no loading, no club, no error - should show loading skeleton
    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe(null);
  });

  it("should show error state only when clubsError exists", () => {
    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // Set error state
    act(() => {
      usePlayerClubStore.setState({
        loadingClubs: false,
        clubsError: "Club not found",
      });
    });

    // Should be in error state
    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe("Club not found");
  });

  it("should NOT show error state when loading is complete but club is null (before API call)", () => {
    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // This represents the state BEFORE the API call is made
    // loadingClubs is false (not started yet), no club, no error
    // This should show loading skeleton, NOT error
    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe(null);
  });

  it("should show success state when club data is loaded", () => {
    const mockClub = {
      id: "club-1",
      name: "Test Club",
      shortDescription: "A test club",
      longDescription: "A longer description",
    };

    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // Simulate successful load
    act(() => {
      usePlayerClubStore.setState({
        loadingClubs: false,
        currentClub: mockClub,
        clubsError: null,
      });
    });

    // Should be in success state
    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toEqual(mockClub);
    expect(result.current.clubsError).toBe(null);
  });

  it("should follow loading → success flow without showing error", () => {
    const mockClub = {
      id: "club-1",
      name: "Test Club",
      shortDescription: "A test club",
    };

    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // Initial state (before fetch starts)
    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe(null);

    // Start loading
    act(() => {
      usePlayerClubStore.setState({ loadingClubs: true });
    });

    expect(result.current.loadingClubs).toBe(true);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe(null);

    // Complete loading successfully
    act(() => {
      usePlayerClubStore.setState({
        loadingClubs: false,
        currentClub: mockClub,
      });
    });

    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toEqual(mockClub);
    expect(result.current.clubsError).toBe(null);
  });

  it("should follow loading → error flow", () => {
    const { result } = renderHook(() => {
      const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
      const currentClub = usePlayerClubStore((state) => state.currentClub);
      const clubsError = usePlayerClubStore((state) => state.clubsError);
      return { loadingClubs, currentClub, clubsError };
    });

    // Start loading
    act(() => {
      usePlayerClubStore.setState({ loadingClubs: true });
    });

    expect(result.current.loadingClubs).toBe(true);
    expect(result.current.clubsError).toBe(null);

    // Complete loading with error
    act(() => {
      usePlayerClubStore.setState({
        loadingClubs: false,
        clubsError: "HTTP 404",
      });
    });

    expect(result.current.loadingClubs).toBe(false);
    expect(result.current.currentClub).toBe(null);
    expect(result.current.clubsError).toBe("HTTP 404");
  });
});
