/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
    },
    adminNotification: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { GET } from "@/app/api/home/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

describe("GET /api/home", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 for unauthenticated users", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 for session without user id", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: {} });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return personalized data for authenticated users", async () => {
    const mockUserId = "user-123";
    (auth as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    const mockBookings = [
      {
        id: "booking-1",
        start: new Date("2024-12-15T10:00:00Z"),
        end: new Date("2024-12-15T11:00:00Z"),
        status: "reserved",
        price: 5000,
        court: {
          id: "court-1",
          name: "Court A",
          club: {
            id: "club-1",
            name: "Test Club",
          },
        },
        coach: {
          id: "coach-1",
          user: {
            name: "John Trainer",
          },
        },
      },
    ];

    const mockNotifications = [
      {
        id: "notif-1",
        type: "ACCEPTED",
        sessionDate: new Date("2024-12-15"),
        sessionTime: "10:00",
        courtInfo: "Court A",
        createdAt: new Date("2024-12-10T12:00:00Z"),
      },
    ];

    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);
    (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.upcomingBookings).toHaveLength(1);
    expect(data.upcomingBookings[0].id).toBe("booking-1");
    expect(data.upcomingBookings[0].court.name).toBe("Court A");
    expect(data.upcomingBookings[0].club.name).toBe("Test Club");
    expect(data.upcomingBookings[0].coach.name).toBe("John Trainer");
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].type).toBe("ACCEPTED");
  });

  it("should return empty arrays when user has no bookings or notifications", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user-123" },
    });

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.upcomingBookings).toEqual([]);
    expect(data.notifications).toEqual([]);
  });

  it("should query bookings with correct filters", async () => {
    const mockUserId = "user-123";
    (auth as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue([]);

    await GET();

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: mockUserId,
          status: { in: ["reserved", "paid"] },
        }),
        orderBy: { start: "asc" },
        take: 5,
      })
    );
  });

  it("should query notifications with correct filters", async () => {
    const mockUserId = "user-123";
    (auth as jest.Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue([]);

    await GET();

    expect(prisma.adminNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { playerId: mockUserId },
            { coachId: mockUserId },
          ],
          read: false,
        }),
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    );
  });

  it("should handle booking without coach", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user-123" },
    });

    const mockBookings = [
      {
        id: "booking-1",
        start: new Date("2024-12-15T10:00:00Z"),
        end: new Date("2024-12-15T11:00:00Z"),
        status: "reserved",
        price: 5000,
        court: {
          id: "court-1",
          name: "Court A",
          club: {
            id: "club-1",
            name: "Test Club",
          },
        },
        coach: null,
      },
    ];

    (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);
    (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.upcomingBookings[0].coach).toBe(null);
  });

  it("should return 500 for database errors", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user-123" },
    });

    (prisma.booking.findMany as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
