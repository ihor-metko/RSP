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

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "@/app/api/clubs/route";
import { prisma } from "@/lib/prisma";

describe("GET /api/clubs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return clubs for authenticated player", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "player-123", role: "player" },
    });

    const mockClubs = [
      {
        id: "club-1",
        name: "Club A",
        location: "123 Main St",
        contactInfo: "contact@a.com",
        openingHours: "9am-10pm",
        logo: "https://example.com/logo.png",
        createdAt: new Date().toISOString(),
      },
      {
        id: "club-2",
        name: "Club B",
        location: "456 Oak Ave",
        contactInfo: null,
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
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
    expect(data[1].name).toBe("Club B");
  });

  it("should return 403 for authenticated coach", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "coach-123", role: "coach" },
    });

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return 403 for authenticated admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", role: "admin" },
    });

    const request = new Request("http://localhost:3000/api/clubs", {
      method: "GET",
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return empty array when no clubs exist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "player-123", role: "player" },
    });

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
    mockAuth.mockResolvedValue({
      user: { id: "player-123", role: "player" },
    });

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
    mockAuth.mockResolvedValue({
      user: { id: "player-123", role: "player" },
    });

    const mockClubs = [
      {
        id: "club-1",
        name: "Complete Club",
        location: "789 Sports Lane",
        contactInfo: "+1-555-0123",
        openingHours: "Mon-Fri 6am-11pm, Sat-Sun 7am-10pm",
        logo: "https://example.com/complete-logo.png",
        createdAt: new Date().toISOString(),
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
      })
    );
  });
});
