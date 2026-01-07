/**
 * @jest-environment node
 */
import { GET } from "@/app/api/admin/clubs/[id]/operations/bookings/route";
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

// Mock authorization helpers
const mockRequireClubAdmin = jest.fn();
const mockRequireOrganizationAdmin = jest.fn();
jest.mock("@/lib/requireRole", () => ({
  requireClubAdmin: (...args: unknown[]) => mockRequireClubAdmin(...args),
  requireOrganizationAdmin: (...args: unknown[]) => mockRequireOrganizationAdmin(...args),
}));

describe("GET /api/clubs/[clubId]/operations/bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (clubId: string, date?: string) => {
    const url = new URL(`http://localhost:3000/api/clubs/${clubId}/operations/bookings`);
    if (date) {
      url.searchParams.set("date", date);
    }
    return new Request(url.toString(), { method: "GET" });
  };

  const mockContext = (clubId: string) => ({
    params: Promise.resolve({ clubId }),
  });

  describe("Validation", () => {
    it("should return 400 when date parameter is missing", async () => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: true,
        userId: "admin-user",
        isRoot: false,
        userRole: "CLUB_ADMIN",
      });

      const request = createRequest("club-1");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Missing required parameter: date");
    });

    it("should return 400 when date format is invalid", async () => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: true,
        userId: "admin-user",
        isRoot: false,
        userRole: "CLUB_ADMIN",
      });

      const request = createRequest("club-1", "invalid-date");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid date format");
    });
  });

  describe("Authorization", () => {
    it("should allow club admin access to their club", async () => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: true,
        userId: "club-admin-user",
        isRoot: false,
        userRole: "CLUB_ADMIN",
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("club-1", "2024-01-15");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(200);
      expect(mockRequireClubAdmin).toHaveBeenCalledWith("club-1");
    });

    it("should allow organization admin access to clubs in their org", async () => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        }),
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-1",
      });

      mockRequireOrganizationAdmin.mockResolvedValue({
        authorized: true,
        userId: "org-admin-user",
        isRoot: false,
        userRole: "ORGANIZATION_ADMIN",
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("club-1", "2024-01-15");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(200);
      expect(mockRequireOrganizationAdmin).toHaveBeenCalledWith("org-1");
    });

    it("should deny access to unauthorized users", async () => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        }),
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-1",
      });

      mockRequireOrganizationAdmin.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
        }),
      });

      const request = createRequest("club-1", "2024-01-15");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(403);
    });
  });

  describe("Fetching bookings", () => {
    beforeEach(() => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: true,
        userId: "admin-user",
        isRoot: false,
        userRole: "CLUB_ADMIN",
      });
    });

    it("should return bookings for specified date", async () => {
      const mockBookings = [
        {
          id: "booking-1",
          userId: "user-1",
          courtId: "court-1",
          coachId: null,
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
          status: "reserved",
          price: 5000,
          sportType: "PADEL",
          createdAt: new Date("2024-01-14T10:00:00.000Z"),
          user: {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
          },
          court: {
            id: "court-1",
            name: "Court 1",
          },
          coach: null,
        },
        {
          id: "booking-2",
          userId: "user-2",
          courtId: "court-2",
          coachId: "coach-1",
          start: new Date("2024-01-15T14:00:00.000Z"),
          end: new Date("2024-01-15T15:00:00.000Z"),
          status: "paid",
          price: 6000,
          sportType: "PADEL",
          createdAt: new Date("2024-01-14T12:00:00.000Z"),
          user: {
            id: "user-2",
            name: "Jane Smith",
            email: "jane@example.com",
          },
          court: {
            id: "court-2",
            name: "Court 2",
          },
          coach: {
            id: "coach-1",
            user: {
              name: "Coach Mike",
            },
          },
        },
      ];

      (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

      const request = createRequest("club-1", "2024-01-15");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        id: "booking-1",
        userName: "John Doe",
        userEmail: "john@example.com",
        courtName: "Court 1",
        status: "reserved",
        coachName: null,
      });
      expect(data[1]).toMatchObject({
        id: "booking-2",
        userName: "Jane Smith",
        userEmail: "jane@example.com",
        courtName: "Court 2",
        status: "paid",
        coachName: "Coach Mike",
      });
    });

    it("should filter bookings by date correctly", async () => {
      const mockBookings: unknown[] = [];
      (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

      const request = createRequest("club-1", "2024-01-15");
      await GET(request, mockContext("club-1"));

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            court: { clubId: "club-1" },
            start: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );

      // Verify date range
      const call = (prisma.booking.findMany as jest.Mock).mock.calls[0][0];
      const startOfDay = call.where.start.gte;
      const endOfDay = call.where.start.lte;

      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
    });

    it("should return empty array when no bookings exist", async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("club-1", "2024-01-15");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    it("should order bookings by start time", async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("club-1", "2024-01-15");
      await GET(request, mockContext("club-1"));

      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { start: "asc" },
        })
      );
    });
  });

  describe("Error handling", () => {
    beforeEach(() => {
      mockRequireClubAdmin.mockResolvedValue({
        authorized: true,
        userId: "admin-user",
        isRoot: false,
        userRole: "CLUB_ADMIN",
      });
    });

    it("should return 500 on database error", async () => {
      (prisma.booking.findMany as jest.Mock).mockRejectedValue(
        new Error("Database connection error")
      );

      const request = createRequest("club-1", "2024-01-15");
      const response = await GET(request, mockContext("club-1"));

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Internal server error");
    });
  });
});
