/**
 * @jest-environment node
 */
import { GET } from "@/app/api/(player)/courts/[courtId]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findUnique: jest.fn(),
    },
  },
}));

describe("GET /api/courts/[courtId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (courtId: string) => {
    return new Request(`http://localhost:3000/api/courts/${courtId}`, {
      method: "GET",
    });
  };

  it("should return court data when court exists", async () => {
    const mockCourt = {
      id: "court-123",
      name: "Court 1",
      slug: "court-1",
      type: "padel",
      surface: "artificial",
      indoor: true,
      isPublished: true, // Court must be published to be visible to players
      defaultPriceCents: 5000,
      clubId: "club-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

    const request = createRequest("court-123");
    const response = await GET(request, {
      params: Promise.resolve({ courtId: "court-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("court-123");
    expect(data.name).toBe("Court 1");
    expect(data.type).toBe("padel");
    expect(data.surface).toBe("artificial");
    expect(data.indoor).toBe(true);
    expect(data.defaultPriceCents).toBe(5000);
    expect(data.clubId).toBe("club-123");
  });

  it("should return 404 when court not found", async () => {
    (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest("nonexistent-court");
    const response = await GET(request, {
      params: Promise.resolve({ courtId: "nonexistent-court" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Court not found");
  });

  it("should return 404 when court is not published", async () => {
    const mockCourt = {
      id: "court-123",
      name: "Unpublished Court",
      slug: "unpublished",
      type: "padel",
      surface: "artificial",
      indoor: true,
      isPublished: false, // Court is not published
      defaultPriceCents: 5000,
      clubId: "club-123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

    const request = createRequest("court-123");
    const response = await GET(request, {
      params: Promise.resolve({ courtId: "court-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Court not found");
  });

  it("should return 500 for database errors", async () => {
    (prisma.court.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = createRequest("court-123");
    const response = await GET(request, {
      params: Promise.resolve({ courtId: "court-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
