/**
 * Test to verify Organization Admins can see clubs on the Bookings page
 * @jest-environment node
 */
import { GET as getClubs } from "@/app/api/admin/clubs/route";

// Mock Prisma
const mockClubFindMany = jest.fn();
const mockClubCount = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: (...args: unknown[]) => mockClubFindMany(...args),
      count: (...args: unknown[]) => mockClubCount(...args),
    },
  },
}));

// Mock requireAnyAdmin
const mockRequireAnyAdmin = jest.fn();
jest.mock("@/lib/requireRole", () => ({
  requireAnyAdmin: (...args: unknown[]) => mockRequireAnyAdmin(...args),
}));

// Mock isMockMode to return false (use real DB logic)
jest.mock("@/services/mockDb", () => ({
  isMockMode: () => false,
}));

describe("Organization Admin - Bookings Page Club Visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (queryParams: Record<string, string> = {}) => {
    const url = new URL("http://localhost:3000/api/admin/clubs");
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new Request(url.toString(), { method: "GET" });
  };

  it("should return clubs for organization admin with clubs in their org", async () => {
    // Mock organization admin auth
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: "org-admin-id",
      isRoot: false,
      adminType: "organization_admin",
      managedIds: ["org-1"], // Admin manages organization org-1
    });

    // Mock clubs that belong to org-1
    const mockClubs = [
      {
        id: "club-1",
        name: "Club Alpha",
        shortDescription: "Test club",
        location: "Location 1",
        city: "City 1",
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        status: "active",
        supportedSports: ["PADEL"],
        createdAt: new Date("2024-01-01"),
        organizationId: "org-1",
        organization: {
          id: "org-1",
          name: "Organization 1",
        },
        courts: [
          {
            id: "court-1",
            indoor: true,
            bookings: [],
          },
        ],
        clubMemberships: [],
      },
      {
        id: "club-2",
        name: "Club Beta",
        shortDescription: "Another test club",
        location: "Location 2",
        city: "City 2",
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        status: "active",
        supportedSports: ["PADEL"],
        createdAt: new Date("2024-01-02"),
        organizationId: "org-1",
        organization: {
          id: "org-1",
          name: "Organization 1",
        },
        courts: [
          {
            id: "court-2",
            indoor: false,
            bookings: [],
          },
        ],
        clubMemberships: [],
      },
    ];

    mockClubCount.mockResolvedValue(2);
    mockClubFindMany.mockResolvedValue(mockClubs);

    const request = createRequest();
    const response = await getClubs(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.clubs).toHaveLength(2);
    expect(data.clubs[0].name).toBe("Club Alpha");
    expect(data.clubs[1].name).toBe("Club Beta");
    
    // Verify the where clause includes organization filter
    expect(mockClubFindMany).toHaveBeenCalled();
    const findManyCall = mockClubFindMany.mock.calls[0][0];
    expect(findManyCall.where.organizationId).toEqual({ in: ["org-1"] });
  });

  it("should return empty array for organization admin with no clubs", async () => {
    // Mock organization admin auth
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: "org-admin-id",
      isRoot: false,
      adminType: "organization_admin",
      managedIds: ["org-2"], // Admin manages organization org-2 which has no clubs
    });

    mockClubCount.mockResolvedValue(0);
    mockClubFindMany.mockResolvedValue([]);

    const request = createRequest();
    const response = await getClubs(request);
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.clubs).toHaveLength(0);
    expect(data.clubs).toEqual([]);
  });

  it("should not return clubs from other organizations", async () => {
    // Mock organization admin auth for org-1
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: "org-admin-id",
      isRoot: false,
      adminType: "organization_admin",
      managedIds: ["org-1"],
    });

    // Mock only returns clubs from org-1 (not org-2)
    const mockClubs = [
      {
        id: "club-1",
        name: "Club Alpha",
        shortDescription: "Test club",
        location: "Location 1",
        city: "City 1",
        contactInfo: null,
        openingHours: null,
        logo: null,
        heroImage: null,
        tags: null,
        isPublic: true,
        status: "active",
        supportedSports: ["PADEL"],
        createdAt: new Date("2024-01-01"),
        organizationId: "org-1",
        organization: {
          id: "org-1",
          name: "Organization 1",
        },
        courts: [],
        clubMemberships: [],
      },
    ];

    mockClubCount.mockResolvedValue(1);
    mockClubFindMany.mockResolvedValue(mockClubs);

    const request = createRequest();
    const response = await getClubs(request);
    const data = await response.json();

    // Verify only org-1 clubs are returned
    expect(response.status).toBe(200);
    expect(data.clubs).toHaveLength(1);
    expect(data.clubs[0].organization.id).toBe("org-1");
    
    // Verify where clause
    const findManyCall = mockClubFindMany.mock.calls[0][0];
    expect(findManyCall.where.organizationId).toEqual({ in: ["org-1"] });
  });
});
