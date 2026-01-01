/**
 * Test for club store fetchClubById behavior
 * Validates that fetchClubById updates both currentClub and clubsById
 */

import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { ClubDetail } from "@/types/club";

// Mock fetch
global.fetch = jest.fn();

describe("useAdminClubStore - fetchClubById updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAdminClubStore.setState({
      clubs: [],
      clubsById: {},
      currentClub: null,
      loadingClubs: false,
      loading: false,
      clubsError: null,
      error: null,
      lastFetchedAt: null,
      lastOrganizationId: null,
      _inflightFetchClubs: null,
      _inflightFetchClubById: null,
    });
  });

  it("should update both currentClub and clubsById when fetching a club", async () => {
    const mockClub: ClubDetail = {
      id: "club-123",
      name: "Updated Club Name",
      slug: "updated-club",
      organizationId: "org-123",
      location: "Test Location",
      shortDescription: "Test Description",
      city: "Test City",
      country: "Test Country",
      latitude: 40.7128,
      longitude: -74.006,
      phone: "+1234567890",
      email: "test@club.com",
      website: "https://club.com",
      status: "ACTIVE",
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logoData: null,
      bannerData: null,
      metadata: null,
      tags: null,
      courts: [],
      businessHours: [],
      specialHours: [],
      gallery: [],
    };

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockClub,
    });

    // Call fetchClubById
    const store = useAdminClubStore.getState();
    await store.fetchClubById("club-123");

    // Verify both currentClub and clubsById are updated
    const state = useAdminClubStore.getState();
    expect(state.currentClub).toEqual(mockClub);
    expect(state.clubsById["club-123"]).toEqual(mockClub);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it("should maintain consistency when currentClub and clubsById reference the same club", async () => {
    const mockClub: ClubDetail = {
      id: "club-456",
      name: "Test Club",
      slug: "test-club",
      organizationId: "org-123",
      location: "Test Location",
      shortDescription: "Test Description",
      city: "Test City",
      country: "Test Country",
      latitude: null,
      longitude: null,
      phone: null,
      email: null,
      website: null,
      status: "ACTIVE",
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logoData: null,
      bannerData: null,
      metadata: null,
      tags: null,
      courts: [],
      businessHours: [],
      specialHours: [],
      gallery: [],
    };

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockClub,
    });

    // Call fetchClubById
    const store = useAdminClubStore.getState();
    await store.fetchClubById("club-456");

    // Verify the data is consistent
    const state = useAdminClubStore.getState();
    expect(state.currentClub?.id).toBe("club-456");
    expect(state.clubsById["club-456"]?.id).toBe("club-456");
    expect(state.currentClub?.name).toBe(state.clubsById["club-456"]?.name);
  });

  it("should handle errors correctly and not update clubsById on failure", async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Club not found" }),
    });

    const store = useAdminClubStore.getState();
    
    // Call should throw
    await expect(store.fetchClubById("club-999")).rejects.toThrow();

    // Verify state is not updated
    const state = useAdminClubStore.getState();
    expect(state.currentClub).toBeNull();
    expect(state.clubsById["club-999"]).toBeUndefined();
    expect(state.error).toBeTruthy();
  });
});
