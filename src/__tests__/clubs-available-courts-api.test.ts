/**
 * @jest-environment node
 */
import { GET } from "@/app/api/(player)/clubs/[id]/available-courts/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  },
}));

describe("GET /api/clubs/[id]/available-courts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (clubId: string, params: { date: string; start: string; duration?: string }) => {
    const searchParams = new URLSearchParams({
      date: params.date,
      start: params.start,
      ...(params.duration && { duration: params.duration }),
    });
    const url = `http://localhost:3000/api/clubs/${clubId}/available-courts?${searchParams}`;
    return new Request(url, { method: "GET" });
  };

  it("should only return published courts", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Published Court",
          slug: "published-court",
          type: "padel",
          surface: "artificial grass",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 5000,
        },
        // Note: Unpublished court should NOT be in the result
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "10:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    expect(response.status).toBe(200);

    // Verify the query includes isPublished: true filter
    expect(prisma.club.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "club-123" },
        include: expect.objectContaining({
          courts: expect.objectContaining({
            where: expect.objectContaining({
              isPublished: true,
            }),
          }),
        }),
      })
    );
  });

  it("should return empty array when no published courts exist", async () => {
    const mockClub = {
      id: "club-123",
      courts: [], // No published courts
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "10:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.availableCourts).toEqual([]);
  });

  it("should return 400 for missing required parameters", async () => {
    const url = "http://localhost:3000/api/clubs/club-123/available-courts";
    const request = new Request(url, { method: "GET" });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("required parameters");
  });

  it("should return 404 when club does not exist", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest("nonexistent-club", {
      date: "2024-01-15",
      start: "10:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent-club" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain("not found");
  });

  it("should filter out courts with overlapping bookings", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Available Court",
          slug: "available",
          type: "padel",
          surface: "artificial grass",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 5000,
        },
        {
          id: "court-2",
          name: "Booked Court",
          slug: "booked",
          type: "padel",
          surface: "artificial grass",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 5000,
        },
      ],
    };

    const mockBookings = [
      {
        courtId: "court-2",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      },
    ];

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

    const request = createRequest("club-123", {
      date: "2024-01-15",
      start: "10:00",
      duration: "60",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.availableCourts).toHaveLength(1);
    expect(data.availableCourts[0].id).toBe("court-1");
  });
});
