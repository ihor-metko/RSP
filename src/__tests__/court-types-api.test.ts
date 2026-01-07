/**
 * @jest-environment node
 */

import { GET } from "@/app/api/(player)/clubs/[id]/court-types/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Court Types API - GET /api/clubs/[id]/court-types", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return available court types for a club with both Single and Double courts", async () => {
    const mockClub = {
      id: "club-1",
      courts: [
        { courtFormat: "SINGLE" },
        { courtFormat: "DOUBLE" },
        { courtFormat: "DOUBLE" },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = new Request("http://localhost:3000/api/clubs/club-1/court-types");
    const params = Promise.resolve({ id: "club-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availableTypes).toEqual(["DOUBLE", "SINGLE"]); // Sorted alphabetically
  });

  it("should return only Single court type for a club with only Single courts", async () => {
    const mockClub = {
      id: "club-2",
      courts: [
        { courtFormat: "SINGLE" },
        { courtFormat: "SINGLE" },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = new Request("http://localhost:3000/api/clubs/club-2/court-types");
    const params = Promise.resolve({ id: "club-2" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availableTypes).toEqual(["SINGLE"]);
  });

  it("should return only Double court type for a club with only Double courts", async () => {
    const mockClub = {
      id: "club-3",
      courts: [
        { courtFormat: "DOUBLE" },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = new Request("http://localhost:3000/api/clubs/club-3/court-types");
    const params = Promise.resolve({ id: "club-3" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availableTypes).toEqual(["DOUBLE"]);
  });

  it("should return empty array for a club with no published courts", async () => {
    const mockClub = {
      id: "club-4",
      courts: [],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = new Request("http://localhost:3000/api/clubs/club-4/court-types");
    const params = Promise.resolve({ id: "club-4" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availableTypes).toEqual([]);
  });

  it("should ignore courts with null or invalid types", async () => {
    const mockClub = {
      id: "club-5",
      courts: [
        { courtFormat: "SINGLE" },
        { courtFormat: null },
        { courtFormat: "DOUBLE" },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = new Request("http://localhost:3000/api/clubs/club-5/court-types");
    const params = Promise.resolve({ id: "club-5" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availableTypes).toEqual(["DOUBLE", "SINGLE"]); // Only valid types
  });

  it("should return 404 for non-existent club", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/clubs/non-existent/court-types");
    const params = Promise.resolve({ id: "non-existent" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Club not found");
  });

  it("should handle database errors gracefully", async () => {
    (prisma.club.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost:3000/api/clubs/club-1/court-types");
    const params = Promise.resolve({ id: "club-1" });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
