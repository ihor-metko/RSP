/**
 * Test for club store updateClubInStore partial updates
 * Validates that updateClubInStore correctly handles partial updates
 */

import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { ClubDetail } from "@/types/club";

// Mock fetch
global.fetch = jest.fn();

describe("useAdminClubStore - updateClubInStore partial updates", () => {
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

  it("should update only the provided fields in clubsById", () => {
    const existingClub: ClubDetail = {
      id: "club-123",
      name: "Original Club Name",
      slug: "original-club",
      organizationId: "org-123",
      location: "Original Location",
      shortDescription: "Original Description",
      city: "Original City",
      country: "Original Country",
      latitude: 40.7128,
      longitude: -74.006,
      phone: "+1234567890",
      email: "original@club.com",
      website: "https://original.com",
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

    // Set up existing club in store
    useAdminClubStore.setState({
      clubsById: { "club-123": existingClub },
      currentClub: existingClub,
    });

    // Update only name and shortDescription
    const store = useAdminClubStore.getState();
    store.updateClubInStore("club-123", {
      name: "Updated Club Name",
      shortDescription: "Updated Description",
    });

    // Verify only the specified fields were updated
    const updatedClub = useAdminClubStore.getState().clubsById["club-123"];
    expect(updatedClub.name).toBe("Updated Club Name");
    expect(updatedClub.shortDescription).toBe("Updated Description");

    // Verify other fields remain unchanged
    expect(updatedClub.location).toBe("Original Location");
    expect(updatedClub.city).toBe("Original City");
    expect(updatedClub.country).toBe("Original Country");
    expect(updatedClub.phone).toBe("+1234567890");
    expect(updatedClub.email).toBe("original@club.com");
    expect(updatedClub.website).toBe("https://original.com");
  });

  it("should update contacts fields only", () => {
    const existingClub: ClubDetail = {
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

    // Set up existing club in store
    useAdminClubStore.setState({
      clubsById: { "club-456": existingClub },
      currentClub: existingClub,
    });

    // Update only contact fields
    const store = useAdminClubStore.getState();
    store.updateClubInStore("club-456", {
      phone: "+9876543210",
      email: "updated@club.com",
      website: "https://updated.com",
    });

    // Verify only contact fields were updated
    const updatedClub = useAdminClubStore.getState().clubsById["club-456"];
    expect(updatedClub.phone).toBe("+9876543210");
    expect(updatedClub.email).toBe("updated@club.com");
    expect(updatedClub.website).toBe("https://updated.com");

    // Verify other fields remain unchanged
    expect(updatedClub.name).toBe("Test Club");
    expect(updatedClub.shortDescription).toBe("Test Description");
    expect(updatedClub.location).toBe("Test Location");
  });

  it("should update business hours", () => {
    const existingClub: ClubDetail = {
      id: "club-789",
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
      businessHours: [
        { id: "bh-1", clubId: "club-789", dayOfWeek: 0, openTime: "09:00", closeTime: "21:00", isClosed: false },
      ],
      specialHours: [],
      gallery: [],
    };

    // Set up existing club in store
    useAdminClubStore.setState({
      clubsById: { "club-789": existingClub },
      currentClub: existingClub,
    });

    // Update business hours
    const store = useAdminClubStore.getState();
    store.updateClubInStore("club-789", {
      businessHours: [
        { id: "bh-1", clubId: "club-789", dayOfWeek: 0, openTime: "08:00", closeTime: "22:00", isClosed: false },
        { id: "bh-2", clubId: "club-789", dayOfWeek: 1, openTime: "08:00", closeTime: "22:00", isClosed: false },
      ],
    });

    // Verify business hours were updated
    const updatedClub = useAdminClubStore.getState().clubsById["club-789"];
    expect(updatedClub.businessHours).toHaveLength(2);
    expect(updatedClub.businessHours[0].openTime).toBe("08:00");
    expect(updatedClub.businessHours[0].closeTime).toBe("22:00");

    // Verify other fields remain unchanged
    expect(updatedClub.name).toBe("Test Club");
    expect(updatedClub.location).toBe("Test Location");
  });

  it("should update currentClub when it matches the clubId", () => {
    const existingClub: ClubDetail = {
      id: "club-current",
      name: "Current Club",
      slug: "current-club",
      organizationId: "org-123",
      location: "Current Location",
      shortDescription: "Current Description",
      city: "Current City",
      country: "Current Country",
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

    // Set up existing club as current club
    useAdminClubStore.setState({
      clubsById: { "club-current": existingClub },
      currentClub: existingClub,
    });

    // Update club
    const store = useAdminClubStore.getState();
    store.updateClubInStore("club-current", {
      name: "Updated Current Club",
    });

    // Verify currentClub was also updated
    const state = useAdminClubStore.getState();
    expect(state.currentClub?.name).toBe("Updated Current Club");
    expect(state.clubsById["club-current"].name).toBe("Updated Current Club");
  });

  it("should not update currentClub when it doesn't match the clubId", () => {
    const existingClub1: ClubDetail = {
      id: "club-1",
      name: "Club 1",
      slug: "club-1",
      organizationId: "org-123",
      location: "Location 1",
      shortDescription: "Description 1",
      city: "City 1",
      country: "Country 1",
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

    const existingClub2: ClubDetail = {
      ...existingClub1,
      id: "club-2",
      name: "Club 2",
    };

    // Set up club-1 as current club, but update club-2
    useAdminClubStore.setState({
      clubsById: { "club-1": existingClub1, "club-2": existingClub2 },
      currentClub: existingClub1,
    });

    // Update club-2
    const store = useAdminClubStore.getState();
    store.updateClubInStore("club-2", {
      name: "Updated Club 2",
    });

    // Verify currentClub remains unchanged
    const state = useAdminClubStore.getState();
    expect(state.currentClub?.id).toBe("club-1");
    expect(state.currentClub?.name).toBe("Club 1");

    // Verify club-2 was updated in clubsById
    expect(state.clubsById["club-2"].name).toBe("Updated Club 2");
  });

  it("should warn when trying to update a club not in cache", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    // Try to update a club that doesn't exist in the store
    const store = useAdminClubStore.getState();
    store.updateClubInStore("non-existent-club", {
      name: "Updated Name",
    });

    // Verify warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Club non-existent-club not found in store")
    );

    consoleWarnSpy.mockRestore();
  });

  it("should update clubs array when club exists there", () => {
    const existingClub: ClubDetail = {
      id: "club-in-array",
      name: "Array Club",
      slug: "array-club",
      organizationId: "org-123",
      location: "Array Location",
      shortDescription: "Array Description",
      city: "Array City",
      country: "Array Country",
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

    // Set up club in both clubs array and clubsById
    useAdminClubStore.setState({
      clubs: [existingClub as any], // Cast to ClubWithCounts for the array
      clubsById: { "club-in-array": existingClub },
    });

    // Update club
    const store = useAdminClubStore.getState();
    store.updateClubInStore("club-in-array", {
      name: "Updated Array Club",
      shortDescription: "Updated Description",
    });

    // Verify clubs array was also updated
    const state = useAdminClubStore.getState();
    expect(state.clubs[0].name).toBe("Updated Array Club");
    expect(state.clubs[0].shortDescription).toBe("Updated Description");

    // Verify clubsById was updated
    expect(state.clubsById["club-in-array"].name).toBe("Updated Array Club");
  });
});
