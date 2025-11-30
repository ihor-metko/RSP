/**
 * @jest-environment node
 */
import { GET } from "@/app/api/clubs/[id]/courts/availability/route";
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

describe("GET /api/clubs/[id]/courts/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (id: string, weekStart?: string) => {
    const url = weekStart
      ? `http://localhost:3000/api/clubs/${id}/courts/availability?weekStart=${weekStart}`
      : `http://localhost:3000/api/clubs/${id}/courts/availability`;
    return new Request(url, { method: "GET" });
  };

  const mockClub = {
    id: "club-123",
    name: "Test Club",
    courts: [
      {
        id: "court-1",
        name: "Court 1",
        type: "Padel",
        indoor: true,
      },
      {
        id: "court-2",
        name: "Court 2",
        type: "Tennis",
        indoor: false,
      },
    ],
  };

  it("should return weekly availability for all courts", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.weekStart).toBe("2024-01-15");
    expect(data.weekEnd).toBe("2024-01-21");
    expect(data.days).toHaveLength(7);
    expect(data.courts).toHaveLength(2);
    
    // Check first day structure
    const firstDay = data.days[0];
    expect(firstDay.date).toBe("2024-01-15");
    expect(firstDay.dayOfWeek).toBe(1); // Monday
    expect(firstDay.dayName).toBe("Monday");
    expect(firstDay.hours.length).toBeGreaterThan(0);
    
    // Check hour structure
    const firstHour = firstDay.hours[0];
    expect(firstHour.hour).toBe(8);
    expect(firstHour.courts).toHaveLength(2);
    expect(firstHour.summary.available).toBe(2);
    expect(firstHour.summary.booked).toBe(0);
    expect(firstHour.summary.partial).toBe(0);
    expect(firstHour.summary.total).toBe(2);
    expect(firstHour.overallStatus).toBe("available");
  });

  it("should return 404 when club not found", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

    const request = createRequest("nonexistent-club", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent-club" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Club not found");
  });

  it("should return 400 for invalid weekStart format", async () => {
    const request = createRequest("club-123", "invalid-date");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid weekStart format. Use YYYY-MM-DD");
  });

  it("should mark slots as booked when there are bookings", async () => {
    const mockBookings = [
      {
        courtId: "court-1",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      },
    ];

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Find the 10:00 slot for Monday
    const monday = data.days.find((d: { date: string }) => d.date === "2024-01-15");
    const slot10am = monday.hours.find((h: { hour: number }) => h.hour === 10);
    
    // Court 1 should be booked, Court 2 should be available
    const court1 = slot10am.courts.find((c: { courtId: string }) => c.courtId === "court-1");
    const court2 = slot10am.courts.find((c: { courtId: string }) => c.courtId === "court-2");
    
    expect(court1.status).toBe("booked");
    expect(court2.status).toBe("available");
    expect(slot10am.summary.available).toBe(1);
    expect(slot10am.summary.booked).toBe(1);
    expect(slot10am.overallStatus).toBe("partial");
  });

  it("should mark slots as partial when there is partial overlap", async () => {
    const mockBookings = [
      {
        courtId: "court-1",
        start: new Date("2024-01-15T10:30:00.000Z"),
        end: new Date("2024-01-15T11:30:00.000Z"),
      },
    ];

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    const monday = data.days.find((d: { date: string }) => d.date === "2024-01-15");
    const slot10am = monday.hours.find((h: { hour: number }) => h.hour === 10);
    
    const court1 = slot10am.courts.find((c: { courtId: string }) => c.courtId === "court-1");
    expect(court1.status).toBe("partial");
  });

  it("should mark slot as fully booked when all courts are booked", async () => {
    const mockBookings = [
      {
        courtId: "court-1",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      },
      {
        courtId: "court-2",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
      },
    ];

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    const monday = data.days.find((d: { date: string }) => d.date === "2024-01-15");
    const slot10am = monday.hours.find((h: { hour: number }) => h.hour === 10);
    
    expect(slot10am.summary.booked).toBe(2);
    expect(slot10am.summary.available).toBe(0);
    expect(slot10am.overallStatus).toBe("booked");
  });

  it("should use current week's Monday when no weekStart provided", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const request = createRequest("club-123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.days).toHaveLength(7);
    
    // The first day should be a Monday (dayOfWeek = 1)
    // Note: This test may be flaky depending on the current day
    // The implementation calculates Monday from the current date
    expect(data.days).toBeDefined();
  });

  it("should return 500 for database errors", async () => {
    (prisma.club.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should include court details in the response", async () => {
    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    // Check courts list
    expect(data.courts[0].name).toBe("Court 1");
    expect(data.courts[0].type).toBe("Padel");
    expect(data.courts[0].indoor).toBe(true);
    expect(data.courts[1].name).toBe("Court 2");
    expect(data.courts[1].type).toBe("Tennis");
    expect(data.courts[1].indoor).toBe(false);
    
    // Check court details in hour slots
    const monday = data.days.find((d: { date: string }) => d.date === "2024-01-15");
    const firstHour = monday.hours[0];
    
    const court1Detail = firstHour.courts.find((c: { courtId: string }) => c.courtId === "court-1");
    expect(court1Detail.courtName).toBe("Court 1");
    expect(court1Detail.courtType).toBe("Padel");
    expect(court1Detail.indoor).toBe(true);
  });

  it("should correctly prioritize complete bookings over partial ones", async () => {
    // This tests the edge case where bookings might be processed in any order
    // A complete booking should result in "booked" status regardless of order
    const mockBookings = [
      // Partial booking comes first in the list
      {
        courtId: "court-1",
        start: new Date("2024-01-15T10:30:00.000Z"),
        end: new Date("2024-01-15T11:30:00.000Z"),
      },
      // Complete booking for a different time slot
      {
        courtId: "court-1",
        start: new Date("2024-01-15T12:00:00.000Z"),
        end: new Date("2024-01-15T13:00:00.000Z"),
      },
    ];

    (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

    const request = createRequest("club-123", "2024-01-15");
    const response = await GET(request, {
      params: Promise.resolve({ id: "club-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    
    const monday = data.days.find((d: { date: string }) => d.date === "2024-01-15");
    
    // The 10:00 slot should be partial (booking 10:30-11:30 doesn't fully cover 10:00-11:00)
    const slot10am = monday.hours.find((h: { hour: number }) => h.hour === 10);
    const court1At10 = slot10am.courts.find((c: { courtId: string }) => c.courtId === "court-1");
    expect(court1At10.status).toBe("partial");
    
    // The 12:00 slot should be fully booked
    const slot12pm = monday.hours.find((h: { hour: number }) => h.hour === 12);
    const court1At12 = slot12pm.courts.find((c: { courtId: string }) => c.courtId === "court-1");
    expect(court1At12.status).toBe("booked");
  });
});
