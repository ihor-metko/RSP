/**
 * @jest-environment node
 */
import { GET } from "@/app/api/clubs/[id]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
  },
}));

describe("GET /api/clubs/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (id: string) => {
    return new Request(`http://localhost:3000/api/clubs/${id}`, {
      method: "GET",
    });
  };

  it("should return club data with courts and coaches", async () => {
    const mockClub = {
      id: "club-123",
      name: "Test Club",
      location: "Test Location",
      courts: [
        {
          id: "court-1",
          name: "Court 1",
          indoor: true,
          defaultPriceCents: 5000,
        },
        {
          id: "court-2",
          name: "Court 2",
          indoor: false,
          defaultPriceCents: 4000,
        },
      ],
      coaches: [
        {
          id: "coach-1",
          user: { name: "Coach Alice" },
        },
        {
          id: "coach-2",
          user: { name: "Coach Bob" },
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = createRequest("club-123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("club-123");
    expect(data.name).toBe("Test Club");
    expect(data.location).toBe("Test Location");
    expect(data.courts).toHaveLength(2);
    expect(data.courts[0].name).toBe("Court 1");
    expect(data.courts[0].indoor).toBe(true);
    expect(data.courts[0].defaultPriceCents).toBe(5000);
    expect(data.coaches).toHaveLength(2);
    expect(data.coaches[0].name).toBe("Coach Alice");
    expect(data.coaches[1].name).toBe("Coach Bob");
  });

  it("should return 404 when club not found", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest("nonexistent-club");
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent-club" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Club not found");
  });

  it("should handle club with no courts", async () => {
    const mockClub = {
      id: "club-empty",
      name: "Empty Club",
      location: "Empty Location",
      courts: [],
      coaches: [],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = createRequest("club-empty");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-empty" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.courts).toHaveLength(0);
    expect(data.coaches).toHaveLength(0);
  });

  it("should handle coach with null user name", async () => {
    const mockClub = {
      id: "club-123",
      name: "Test Club",
      location: "Test Location",
      courts: [],
      coaches: [
        {
          id: "coach-1",
          user: { name: null },
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

    const request = createRequest("club-123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.coaches[0].name).toBe("Unknown Coach");
  });

  it("should return 500 for database errors", async () => {
    (prisma.club.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = createRequest("club-123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
