/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: jest.fn(),
    },
  },
}));

import { GET } from "@/app/api/clubs/route";
import { prisma } from "@/lib/prisma";

describe("GET /api/clubs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return clubs for public access (no authentication required)", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Club A",
        location: "123 Main St",
        contactInfo: "contact@a.com",
        openingHours: "9am-10pm",
        logo: "https://example.com/logo.png",
        createdAt: new Date().toISOString(),
        courts: [{ id: "court-1", indoor: true }, { id: "court-2", indoor: false }],
      },
      {
        id: "club-2",
        name: "Club B",
        location: "456 Oak Ave",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Club A");
    expect(data[0].location).toBe("123 Main St");
    expect(data[0].contactInfo).toBe("contact@a.com");
    expect(data[0].openingHours).toBe("9am-10pm");
    expect(data[0].indoorCount).toBe(1);
    expect(data[0].outdoorCount).toBe(1);
    expect(data[1].name).toBe("Club B");
    expect(data[1].indoorCount).toBe(0);
    expect(data[1].outdoorCount).toBe(0);
  });

  it("should return empty array when no clubs exist", async () => {
    (prisma.club.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(0);
  });

  it("should return 500 for database errors", async () => {
    (prisma.club.findMany as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should return clubs with all fields populated", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Complete Club",
        location: "789 Sports Lane",
        contactInfo: "+1-555-0123",
        openingHours: "Mon-Fri 6am-11pm, Sat-Sun 7am-10pm",
        logo: "https://example.com/complete-logo.png",
        createdAt: new Date().toISOString(),
        courts: [{ id: "court-1", indoor: true }],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data[0]).toEqual(
      expect.objectContaining({
        id: "club-1",
        name: "Complete Club",
        location: "789 Sports Lane",
        contactInfo: "+1-555-0123",
        openingHours: "Mon-Fri 6am-11pm, Sat-Sun 7am-10pm",
        logo: "https://example.com/complete-logo.png",
        indoorCount: 1,
        outdoorCount: 0,
      })
    );
  });

  it("should filter clubs by search query", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Main Club",
        location: "123 Main St",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs?search=Main", {
      method: "GET",
    });

    const response = await GET(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(prisma.club.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ name: expect.objectContaining({ contains: "Main" }) }),
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it("should filter clubs by indoor param", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Indoor Club",
        location: "123 Main St",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [{ id: "court-1", indoor: true }],
      },
      {
        id: "club-2",
        name: "Outdoor Club",
        location: "456 Oak Ave",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [{ id: "court-2", indoor: false }],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs?indoor=true", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Only the club with indoor courts should be returned
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Indoor Club");
  });

  it("should filter clubs by q param (new search syntax)", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Test Club",
        location: "123 Main St",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs?q=Test", {
      method: "GET",
    });

    const response = await GET(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(prisma.club.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ name: expect.objectContaining({ contains: "Test" }) }),
              ]),
            }),
          ]),
        }),
      })
    );
  });

  it("should filter clubs by city param", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "City Club",
        location: "Kyiv, Ukraine",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs?city=Kyiv", {
      method: "GET",
    });

    const response = await GET(request);
    await response.json();

    expect(response.status).toBe(200);
    expect(prisma.club.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              location: expect.objectContaining({ contains: "Kyiv" }),
            }),
          ]),
        }),
      })
    );
  });

  it("should filter by q, city and indoor together", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Premium Club",
        location: "Kyiv Downtown",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [{ id: "court-1", indoor: true }],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request(
      "http://localhost:3000/api/clubs?q=Premium&city=Kyiv&indoor=true",
      { method: "GET" }
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Premium Club");
  });

  it("should limit results when limit param is provided", async () => {
    const mockClubs = [
      {
        id: "club-1",
        name: "Club 1",
        location: "Location 1",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [],
      },
      {
        id: "club-2",
        name: "Club 2",
        location: "Location 2",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
        courts: [],
      },
    ];

    (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

    const request = new Request("http://localhost:3000/api/clubs?limit=2", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.club.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
      })
    );
  });

  it("should accept popular param for ordering", async () => {
    (prisma.club.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/clubs?popular=true&limit=4", {
      method: "GET",
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.club.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        take: 4,
      })
    );
  });
});
