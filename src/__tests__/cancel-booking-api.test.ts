/**
 * @jest-environment node
 */
import { POST } from "@/app/api/bookings/[id]/cancel/route";
import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS, PAYMENT_STATUS, CANCEL_REASON } from "@/types/booking";
import { requireAuth } from "@/lib/requireRole";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock requireAuth
jest.mock("@/lib/requireRole", () => ({
  requireAuth: jest.fn(),
}));

const mockedRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe("POST /api/bookings/[id]/cancel", () => {
  const mockUserId = "user-123";
  const mockBookingId = "booking-123";

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for requireAuth - authorized user
    mockedRequireAuth.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
    });
  });

  const createRequest = () => {
    return new Request(`http://localhost:3000/api/bookings/${mockBookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  };

  const createContext = (id: string) => {
    return {
      params: Promise.resolve({ id }),
    };
  };

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedRequireAuth.mockResolvedValueOnce({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      });

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);

      expect(response.status).toBe(401);
    });
  });

  describe("Booking validation", () => {
    it("should return 404 if booking does not exist", async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Booking not found");
    });

    it("should return 403 if booking does not belong to user", async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        userId: "different-user-id",
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        start: new Date("2026-01-15T10:00:00.000Z"),
      });

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You do not have permission to cancel this booking");
    });

    it("should return 400 if booking is already cancelled", async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        bookingStatus: BOOKING_STATUS.CANCELLED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        start: new Date("2026-01-15T10:00:00.000Z"),
      });

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("This booking has already been cancelled");
    });

    it("should return 400 if booking is already paid", async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PAID,
        start: new Date("2026-01-15T10:00:00.000Z"),
      });

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot cancel a paid booking. Please contact support for refunds.");
    });

    it("should return 400 if booking slot has already passed", async () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        start: pastDate,
      });

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot cancel a booking that has already started or passed");
    });
  });

  describe("Successful cancellation", () => {
    it("should cancel unpaid booking successfully", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        userId: mockUserId,
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        start: futureDate,
      });

      (prisma.booking.update as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        bookingStatus: BOOKING_STATUS.CANCELLED,
        cancelReason: CANCEL_REASON.USER_CANCELLED,
        reservationExpiresAt: null,
      });

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Booking cancelled successfully");

      // Verify the update was called with correct data
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBookingId },
        data: {
          bookingStatus: BOOKING_STATUS.CANCELLED,
          cancelReason: CANCEL_REASON.USER_CANCELLED,
          reservationExpiresAt: null,
        },
      });
    });
  });

  describe("Error handling", () => {
    it("should return 500 on database error", async () => {
      (prisma.booking.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createRequest();
      const context = createContext(mockBookingId);
      const response = await POST(request, context);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
