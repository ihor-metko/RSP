/**
 * @jest-environment node
 */
import { GET } from "../../archived_features/api/coach/bookings/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    coach: {
      findFirst: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("GET /api/coach/bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (dateParam?: string) => {
    const url = dateParam
      ? `http://localhost:3000/api/coach/bookings?date=${dateParam}`
      : "http://localhost:3000/api/coach/bookings";
    return new Request(url, { method: "GET" });
  };

  describe("Authentication and Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = createRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Input validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });
    });

    it("should return 400 when date parameter is missing", async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameter: date");
    });

    it("should return 400 when date format is invalid", async () => {
      const request = createRequest("15-01-2024");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });

    it("should return 400 when date is invalid", async () => {
      const request = createRequest("2024-13-45");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid date format. Use YYYY-MM-DD");
    });
  });

  describe("Coach profile validation", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });
    });

    it("should return 404 when coach profile not found", async () => {
      (prisma.coach.findFirst as jest.Mock).mockResolvedValue(null);

      const request = createRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Coach profile not found");
    });
  });

  describe("Successful booking fetch", () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({
        user: { id: "coach-user-123", role: "coach" },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "coach-user-123",
      });
    });

    it("should return empty array when no bookings exist", async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return bookings with correct format", async () => {
      const mockBookings = [
        {
          id: "booking-1",
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
          status: "reserved",
          user: {
            name: "John Doe",
            email: "john@example.com",
          },
          court: {
            name: "Court 1",
          },
        },
        {
          id: "booking-2",
          start: new Date("2024-01-15T14:00:00.000Z"),
          end: new Date("2024-01-15T15:30:00.000Z"),
          status: "paid",
          user: {
            name: null,
            email: "jane@example.com",
          },
          court: {
            name: "Court 2",
          },
        },
      ];

      (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

      const request = createRequest("2024-01-15");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].bookingId).toBe("booking-1");
      expect(data[0].playerName).toBe("John Doe");
      expect(data[0].playerContact).toBe("john@example.com");
      expect(data[0].courtName).toBe("Court 1");
      expect(data[0].duration).toBe(60);
      expect(data[0].status).toBe("reserved");

      expect(data[1].bookingId).toBe("booking-2");
      expect(data[1].playerName).toBe("Unknown Player");
      expect(data[1].duration).toBe(90);
    });
  });

  describe("Admin access", () => {
    it("should allow admin to fetch coach bookings", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.coach.findFirst as jest.Mock).mockResolvedValue({
        id: "coach-123",
        userId: "admin-123",
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const request = createRequest("2024-01-15");
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});
