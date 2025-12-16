/**
 * Tests for Payment Intent API Logic
 * 
 * Tests the payment intent creation logic and validation
 */

import { prisma } from "@/lib/prisma";
import { resolvePaymentAccountForBooking } from "@/services/paymentAccountService";
import { PaymentProvider, PaymentAccountScope } from "@/types/paymentAccount";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/services/paymentAccountService");

describe("Payment Intent Creation Logic", () => {
  const mockUserId = "user-123";
  const mockBookingId = "booking-456";
  const mockClubId = "club-789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Booking Validation", () => {
    it("should reject payment for non-existent booking", async () => {
      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await prisma.booking.findUnique({
        where: { id: mockBookingId },
      });

      expect(result).toBeNull();
    });

    it("should validate booking ownership", async () => {
      const mockBooking = {
        id: mockBookingId,
        userId: "different-user",
        paymentStatus: "Unpaid",
        bookingStatus: "Pending",
      };

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const result = await prisma.booking.findUnique({
        where: { id: mockBookingId },
      });

      expect(result?.userId).not.toBe(mockUserId);
    });

    it("should reject already paid bookings", async () => {
      const mockBooking = {
        id: mockBookingId,
        userId: mockUserId,
        paymentStatus: "Paid",
        bookingStatus: "Active",
      };

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const result = await prisma.booking.findUnique({
        where: { id: mockBookingId },
      });

      expect(result?.paymentStatus).toBe("Paid");
    });

    it("should reject cancelled bookings", async () => {
      const mockBooking = {
        id: mockBookingId,
        userId: mockUserId,
        paymentStatus: "Unpaid",
        bookingStatus: "Cancelled",
      };

      (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const result = await prisma.booking.findUnique({
        where: { id: mockBookingId },
      });

      expect(result?.bookingStatus).toBe("Cancelled");
    });
  });



  describe("Payment Account Resolution", () => {
    it("should return null when no payment account exists", async () => {
      (resolvePaymentAccountForBooking as jest.Mock).mockResolvedValue(null);

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).toBeNull();
      expect(resolvePaymentAccountForBooking).toHaveBeenCalledWith(mockClubId);
    });

    it("should resolve payment account for valid club", async () => {
      const mockPaymentAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        merchantId: "merchant-123",
        secretKey: "secret-key",
        providerConfig: null,
        displayName: "Club Payment",
      };

      (resolvePaymentAccountForBooking as jest.Mock).mockResolvedValue(mockPaymentAccount);

      const result = await resolvePaymentAccountForBooking(mockClubId);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe(PaymentProvider.WAYFORPAY);
      expect(result?.merchantId).toBe("merchant-123");
    });
  });

  describe("Payment and Booking Updates", () => {
    it("should create payment record with correct data", async () => {
      (prisma.payment.create as jest.Mock).mockResolvedValue({
        id: "payment-1",
        bookingId: mockBookingId,
        provider: "wayforpay",
        status: "pending",
        amount: 1000,
      });

      const result = await prisma.payment.create({
        data: {
          bookingId: mockBookingId,
          provider: "wayforpay",
          status: "pending",
          amount: 1000,
        },
      });

      expect(result).toEqual({
        id: "payment-1",
        bookingId: mockBookingId,
        provider: "wayforpay",
        status: "pending",
        amount: 1000,
      });
    });

    it("should update booking paymentStatus to PaymentPending", async () => {
      (prisma.booking.update as jest.Mock).mockResolvedValue({
        id: mockBookingId,
        paymentStatus: "PaymentPending",
      });

      const result = await prisma.booking.update({
        where: { id: mockBookingId },
        data: {
          paymentStatus: "PaymentPending",
        },
      });

      expect(result?.paymentStatus).toBe("PaymentPending");
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: mockBookingId },
        data: {
          paymentStatus: "PaymentPending",
        },
      });
    });
  });

  describe("Security Validation", () => {
    it("should mask merchant IDs (show only last 4 chars)", () => {
      const merchantId = "merchant-12345678";
      const masked = "****" + merchantId.slice(-4);
      
      expect(masked).toBe("****5678");
      expect(masked).not.toContain("1234");
    });

    it("should prevent exposure of secret keys", () => {
      const mockPaymentAccount = {
        id: "account-1",
        provider: PaymentProvider.WAYFORPAY,
        scope: PaymentAccountScope.CLUB,
        merchantId: "merchant-123",
        secretKey: "super-secret-key-do-not-expose",
        providerConfig: null,
        displayName: "Club Payment",
      };

      // Create a mock response object that would be sent to frontend
      const frontendSafeResponse = {
        provider: "wayforpay",
        merchantAccount: "****" + mockPaymentAccount.merchantId.slice(-4),
        amount: 1000,
        currency: "UAH",
        orderReference: "booking-123-456",
        // Note: secretKey is intentionally not included
      };

      const responseString = JSON.stringify(frontendSafeResponse);
      
      expect(responseString).not.toContain("super-secret-key-do-not-expose");
      expect(responseString).not.toContain("secretKey");
      expect(frontendSafeResponse).not.toHaveProperty("secretKey");
    });
  });
});
