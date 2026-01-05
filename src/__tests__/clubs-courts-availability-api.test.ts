/**
 * @jest-environment node
 */
import { GET } from "@/app/api/(player)/clubs/[id]/courts/availability/route";
import { prisma } from "@/lib/prisma";

// Mock date utilities
jest.mock("@/utils/dateTime", () => ({
  getTodayInTimezone: jest.fn(() => new Date("2024-01-15T12:00:00.000Z")),
  getDatesFromStart: jest.fn((start: Date, days: number) => {
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  }),
  getWeekMonday: jest.fn((date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }),
}));

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

describe("GET /api/clubs/[id]/courts/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (clubId: string, params?: { start?: string; days?: string; mode?: string }) => {
    const searchParams = new URLSearchParams(params || {});
    const url = `http://localhost:3000/api/clubs/${clubId}/courts/availability?${searchParams}`;
    return new Request(url, { method: "GET" });
  };

  it("should only return published courts in the availability response", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Published Court 1",
          type: "padel",
          indoor: true,
          sportType: "PADEL",
        },
        {
          id: "court-2",
          name: "Published Court 2",
          type: "padel",
          indoor: false,
          sportType: "PADEL",
        },
      ],
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // confirmed bookings
      .mockResolvedValueOnce([]); // pending bookings

    const request = createRequest("club-123");

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

    const data = await response.json();
    expect(data.courts).toHaveLength(2);
    expect(data.courts[0].name).toBe("Published Court 1");
    expect(data.courts[1].name).toBe("Published Court 2");
  });

  it("should return empty courts array when no published courts exist", async () => {
    const mockClub = {
      id: "club-123",
      courts: [], // No published courts
    };

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const request = createRequest("club-123");

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.courts).toEqual([]);
    expect(data.days).toBeDefined();
    expect(data.days.length).toBeGreaterThan(0);
    // Each day should have empty hours with no courts
    data.days.forEach((day: { hours: { courts: unknown[] }[] }) => {
      day.hours.forEach((hour: { courts: unknown[] }) => {
        expect(hour.courts).toEqual([]);
      });
    });
  });

  it("should return 404 when club does not exist", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest("nonexistent-club");

    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent-club" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toContain("not found");
  });

  it("should include booking statuses for published courts", async () => {
    const mockClub = {
      id: "club-123",
      courts: [
        {
          id: "court-1",
          name: "Published Court",
          type: "padel",
          indoor: true,
          sportType: "PADEL",
        },
      ],
    };

    const mockConfirmedBookings = [
      {
        courtId: "court-1",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      },
    ];

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock)
      .mockResolvedValueOnce(mockConfirmedBookings) // confirmed bookings
      .mockResolvedValueOnce([]); // pending bookings

    const request = createRequest("club-123", { start: "2024-01-15" });

    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.days).toBeDefined();

    // Find the hour slot at 10:00 on 2024-01-15
    const day = data.days.find((d: { date: string }) => d.date === "2024-01-15");
    expect(day).toBeDefined();

    const hour10 = day.hours.find((h: { hour: number }) => h.hour === 10);
    expect(hour10).toBeDefined();
    expect(hour10.courts[0].status).toBe("booked");
  });
});
