/**
 * @jest-environment node
 */
import { GET } from "@/app/api/clubs/[id]/available-courts/route";
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

  const createRequest = (clubId: string, params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    const url = `http://localhost:3000/api/clubs/${clubId}/available-courts?${searchParams}`;
    return new Request(url, { method: "GET" });
  };

  const mockClubWithCourts = {
    id: "club-123",
    name: "Test Club",
    courts: [
      {
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "Padel",
        surface: "Artificial Grass",
        indoor: false,
        defaultPriceCents: 5000,
      },
      {
        id: "court-2",
        name: "Court 2",
        slug: "court-2",
        type: "Tennis",
        surface: "Hard",
        indoor: true,
        defaultPriceCents: 6000,
      },
    ],
  };

  describe("Parameter validation", () => {
    it("should return 400 if date is missing", async () => {
      const request = createRequest("club-123", { start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("date and start are required");
    });

    it("should return 400 if start is missing", async () => {
      const request = createRequest("club-123", { date: "2024-01-15", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("date and start are required");
    });

    it("should return 400 for invalid date format", async () => {
      const request = createRequest("club-123", { date: "invalid", start: "10:00" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });

    it("should return 400 for invalid start time format", async () => {
      const request = createRequest("club-123", { date: "2024-01-15", start: "25:00" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid start time format. Use HH:MM");
    });

    it("should return 400 for invalid duration", async () => {
      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "invalid" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid duration. Must be a positive integer");
    });

    it("should return 400 for negative duration", async () => {
      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "-30" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid duration. Must be a positive integer");
    });
  });

  describe("Club validation", () => {
    it("should return 404 when club not found", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest("nonexistent-club", { date: "2024-01-15", start: "10:00" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "nonexistent-club" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });
  });

  describe("Availability calculation", () => {
    it("should return all courts available when no bookings exist", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(2);
      expect(data.availableCourts[0].id).toBe("court-1");
      expect(data.availableCourts[1].id).toBe("court-2");
    });

    it("should exclude courts with overlapping bookings", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          courtId: "court-1",
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
        },
      ]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(1);
      expect(data.availableCourts[0].id).toBe("court-2");
    });

    it("should exclude courts with partial overlapping bookings", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      // Booking starts at 10:30, overlaps with 10:00-11:00 slot
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          courtId: "court-1",
          start: new Date("2024-01-15T10:30:00.000Z"),
          end: new Date("2024-01-15T11:30:00.000Z"),
        },
      ]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(1);
      expect(data.availableCourts[0].id).toBe("court-2");
    });

    it("should return empty list when all courts are booked", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          courtId: "court-1",
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
        },
        {
          courtId: "court-2",
          start: new Date("2024-01-15T09:30:00.000Z"),
          end: new Date("2024-01-15T10:30:00.000Z"),
        },
      ]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(0);
    });

    it("should return court available when booking ends before requested slot", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          courtId: "court-1",
          start: new Date("2024-01-15T08:00:00.000Z"),
          end: new Date("2024-01-15T10:00:00.000Z"),
        },
      ]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(2);
    });

    it("should return court available when booking starts after requested slot ends", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          courtId: "court-1",
          start: new Date("2024-01-15T11:00:00.000Z"),
          end: new Date("2024-01-15T12:00:00.000Z"),
        },
      ]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(2);
    });
  });

  describe("Business hours validation", () => {
    it("should return empty list when slot starts before business hours", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      // Business hours are 9:00-22:00, requesting 8:00 slot
      const request = createRequest("club-123", { date: "2024-01-15", start: "08:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(0);
    });

    it("should return empty list when slot ends after business hours", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      // Business hours are 9:00-22:00, requesting 22:00 slot would end at 23:00
      const request = createRequest("club-123", { date: "2024-01-15", start: "22:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(0);
    });

    it("should return courts when slot is within business hours", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      // Business hours are 9:00-22:00, requesting 21:00 slot (ends at 22:00)
      const request = createRequest("club-123", { date: "2024-01-15", start: "21:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts).toHaveLength(2);
    });
  });

  describe("Default duration", () => {
    it("should use 60 minutes as default duration when not provided", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      // Booking at 10:30-11:30, would overlap with default 60min slot starting at 10:00
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          courtId: "court-1",
          start: new Date("2024-01-15T10:30:00.000Z"),
          end: new Date("2024-01-15T11:30:00.000Z"),
        },
      ]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Court 1 should be excluded due to overlap with default 60min slot
      expect(data.availableCourts).toHaveLength(1);
      expect(data.availableCourts[0].id).toBe("court-2");
    });
  });

  describe("Response format", () => {
    it("should return courts with correct fields", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithCourts);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00", duration: "60" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.availableCourts[0]).toEqual({
        id: "court-1",
        name: "Court 1",
        slug: "court-1",
        type: "Padel",
        surface: "Artificial Grass",
        indoor: false,
        defaultPriceCents: 5000,
      });
    });
  });

  describe("Error handling", () => {
    it("should return 500 for database errors", async () => {
      (prisma.club.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createRequest("club-123", { date: "2024-01-15", start: "10:00" });
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
