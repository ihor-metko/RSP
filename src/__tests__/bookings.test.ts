/**
 * @jest-environment node
 */
import { POST } from "@/app/api/bookings/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

// Mock requireRole to always authorize for tests
jest.mock("@/lib/requireRole", () => ({
  requireRole: jest.fn().mockResolvedValue({
    authorized: true,
    userId: "test-user-id",
    userRole: "player",
  }),
}));

describe("POST /api/bookings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  describe("Input validation", () => {
    it("should return 400 if courtId is missing", async () => {
      const request = createRequest({
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 if startTime is missing", async () => {
      const request = createRequest({
        courtId: "court-123",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 if endTime is missing", async () => {
      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 if userId is missing", async () => {
      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing required fields");
    });

    it("should return 400 if startTime >= endTime", async () => {
      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T11:00:00.000Z",
        endTime: "2024-01-15T10:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("startTime must be before endTime");
    });

    it("should return 400 if startTime equals endTime", async () => {
      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T10:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("startTime must be before endTime");
    });
  });

  describe("Overlap detection", () => {
    it("should return 409 Conflict when overlapping booking exists", async () => {
      const mockTx = {
        booking: {
          findFirst: jest.fn().mockResolvedValue({
            id: "existing-booking",
            courtId: "court-123",
            start: new Date("2024-01-15T10:30:00.000Z"),
            end: new Date("2024-01-15T11:30:00.000Z"),
            status: "reserved",
          }),
        },
        court: {
          findUnique: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Selected time slot is already booked");
    });
  });

  describe("Successful booking", () => {
    it("should create booking and return 201 when no overlap exists", async () => {
      const mockBooking = {
        id: "new-booking-id",
        courtId: "court-123",
        userId: "user-123",
        coachId: null,
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
        price: 5000,
        status: "reserved",
      };

      const mockCourt = {
        id: "court-123",
        name: "Court 1",
        defaultPrice: 5000,
      };

      const mockTx = {
        booking: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockBooking),
        },
        court: {
          findUnique: jest.fn().mockResolvedValue(mockCourt),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.bookingId).toBe("new-booking-id");
      expect(data.status).toBe("reserved");
      expect(data.courtId).toBe("court-123");
      expect(data.startTime).toBe("2024-01-15T10:00:00.000Z");
      expect(data.endTime).toBe("2024-01-15T11:00:00.000Z");
      expect(data.coachId).toBeNull();

      // Verify booking was created with correct data
      expect(mockTx.booking.create).toHaveBeenCalledWith({
        data: {
          courtId: "court-123",
          userId: "user-123",
          coachId: null,
          start: new Date("2024-01-15T10:00:00.000Z"),
          end: new Date("2024-01-15T11:00:00.000Z"),
          price: 5000,
          status: "reserved",
        },
      });
    });

    it("should create booking with coachId when provided", async () => {
      const mockBooking = {
        id: "new-booking-id",
        courtId: "court-123",
        userId: "user-123",
        coachId: "coach-456",
        start: new Date("2024-01-15T10:00:00.000Z"),
        end: new Date("2024-01-15T11:00:00.000Z"),
        price: 5000,
        status: "reserved",
      };

      const mockCourt = {
        id: "court-123",
        name: "Court 1",
        defaultPrice: 5000,
      };

      const mockTx = {
        booking: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockBooking),
        },
        court: {
          findUnique: jest.fn().mockResolvedValue(mockCourt),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: "coach-456",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.coachId).toBe("coach-456");
    });
  });

  describe("Error handling", () => {
    it("should return 400 when court is not found", async () => {
      const mockTx = {
        booking: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        court: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      const request = createRequest({
        courtId: "nonexistent-court",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Court not found");
    });

    it("should return 500 for unexpected errors", async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createRequest({
        courtId: "court-123",
        startTime: "2024-01-15T10:00:00.000Z",
        endTime: "2024-01-15T11:00:00.000Z",
        userId: "user-123",
        coachId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
