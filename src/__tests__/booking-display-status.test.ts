import {
  getPlayerBookingDisplayStatus,
  getAdminBookingDisplayStatus,
} from "@/utils/bookingDisplayStatus";
import type { BookingStatus, PaymentStatus } from "@/types/booking";

describe("Booking Display Status Functions", () => {
  describe("getPlayerBookingDisplayStatus", () => {
    it('should return "Confirmed, awaiting payment" for Confirmed + Unpaid', () => {
      const result = getPlayerBookingDisplayStatus("Confirmed", "Unpaid");
      expect(result).toBe("Confirmed, awaiting payment");
    });

    it('should return "Booked" for UPCOMING + Paid', () => {
      const result = getPlayerBookingDisplayStatus("UPCOMING", "Paid");
      expect(result).toBe("Booked");
    });

    it('should return "Reserved, payment pending" for UPCOMING + Unpaid', () => {
      const result = getPlayerBookingDisplayStatus("UPCOMING", "Unpaid");
      expect(result).toBe("Reserved, payment pending");
    });

    it('should return "Cancelled" for Cancelled status regardless of payment', () => {
      expect(getPlayerBookingDisplayStatus("Cancelled", "Paid")).toBe("Cancelled");
      expect(getPlayerBookingDisplayStatus("Cancelled", "Unpaid")).toBe("Cancelled");
    });

    it('should return "Cancelled (Refunded)" for Cancelled + Refunded', () => {
      const result = getPlayerBookingDisplayStatus("Cancelled", "Refunded");
      expect(result).toBe("Cancelled (Refunded)");
    });

    it('should return "Completed" for Completed + Paid', () => {
      const result = getPlayerBookingDisplayStatus("Completed", "Paid");
      expect(result).toBe("Completed");
    });

    it('should return "Missed / Not paid" for Completed + Unpaid', () => {
      const result = getPlayerBookingDisplayStatus("Completed", "Unpaid");
      expect(result).toBe("Missed / Not paid");
    });

    it('should return "No-show" for No-show status', () => {
      const result = getPlayerBookingDisplayStatus("No-show", "Unpaid");
      expect(result).toBe("No-show");
    });

    it('should return "Confirmed" for Confirmed + Paid', () => {
      const result = getPlayerBookingDisplayStatus("Confirmed", "Paid");
      expect(result).toBe("Confirmed");
    });

    it('should handle refunded status for non-cancelled bookings', () => {
      const result = getPlayerBookingDisplayStatus("Completed", "Refunded");
      expect(result).toBe("Refunded");
    });
  });

  describe("getAdminBookingDisplayStatus", () => {
    it('should return "Reserved, pending payment" for Confirmed + Unpaid', () => {
      const result = getAdminBookingDisplayStatus("Confirmed", "Unpaid");
      expect(result).toBe("Reserved, pending payment");
    });

    it('should return "Paid" for UPCOMING + Paid', () => {
      const result = getAdminBookingDisplayStatus("UPCOMING", "Paid");
      expect(result).toBe("Paid");
    });

    it('should return "Reserved, pending payment" for UPCOMING + Unpaid', () => {
      const result = getAdminBookingDisplayStatus("UPCOMING", "Unpaid");
      expect(result).toBe("Reserved, pending payment");
    });

    it('should return "Cancelled" for Cancelled status with no refund', () => {
      expect(getAdminBookingDisplayStatus("Cancelled", "Paid")).toBe("Cancelled");
      expect(getAdminBookingDisplayStatus("Cancelled", "Unpaid")).toBe("Cancelled");
    });

    it('should return "Cancelled (Refunded)" for Cancelled + Refunded', () => {
      const result = getAdminBookingDisplayStatus("Cancelled", "Refunded");
      expect(result).toBe("Cancelled (Refunded)");
    });

    it('should return "Completed" for Completed + Paid', () => {
      const result = getAdminBookingDisplayStatus("Completed", "Paid");
      expect(result).toBe("Completed");
    });

    it('should return "Missed / Not paid" for Completed + Unpaid', () => {
      const result = getAdminBookingDisplayStatus("Completed", "Unpaid");
      expect(result).toBe("Missed / Not paid");
    });

    it('should return "No-show" for No-show status', () => {
      const result = getAdminBookingDisplayStatus("No-show", "Paid");
      expect(result).toBe("No-show");
    });

    it('should return "Reserved (paid)" for Confirmed + Paid', () => {
      const result = getAdminBookingDisplayStatus("Confirmed", "Paid");
      expect(result).toBe("Reserved (paid)");
    });

    it('should handle refunded status for non-cancelled bookings', () => {
      const result = getAdminBookingDisplayStatus("Completed", "Refunded");
      expect(result).toBe("Completed (Refunded)");
    });
  });

  describe("Display Status Functions - Comprehensive Status Combinations", () => {
    const bookingStatuses: BookingStatus[] = [
      "UPCOMING",
      "Confirmed",
      "Cancelled",
      "Completed",
      "No-show",
    ];
    const paymentStatuses: PaymentStatus[] = ["Paid", "Unpaid", "Refunded"];

    it("should return a string for all status combinations (Player)", () => {
      bookingStatuses.forEach((bookingStatus) => {
        paymentStatuses.forEach((paymentStatus) => {
          const result = getPlayerBookingDisplayStatus(bookingStatus, paymentStatus);
          expect(typeof result).toBe("string");
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });

    it("should return a string for all status combinations (Admin)", () => {
      bookingStatuses.forEach((bookingStatus) => {
        paymentStatuses.forEach((paymentStatus) => {
          const result = getAdminBookingDisplayStatus(bookingStatus, paymentStatus);
          expect(typeof result).toBe("string");
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("Display Status Functions - Consistency", () => {
    it("should prioritize terminal booking statuses over payment status", () => {
      // Cancelled should always show as cancelled for player
      expect(getPlayerBookingDisplayStatus("Cancelled", "Paid")).toBe("Cancelled");
      expect(getPlayerBookingDisplayStatus("Cancelled", "Unpaid")).toBe("Cancelled");

      // No-show should always show as no-show for player
      expect(getPlayerBookingDisplayStatus("No-show", "Paid")).toBe("No-show");
      expect(getPlayerBookingDisplayStatus("No-show", "Unpaid")).toBe("No-show");
    });

    it("should handle edge cases gracefully", () => {
      // Both functions should handle all valid combinations without errors
      const testCombinations: Array<[BookingStatus, PaymentStatus]> = [
        ["UPCOMING", "Paid"],
        ["UPCOMING", "Unpaid"],
        ["Confirmed", "Paid"],
        ["Confirmed", "Unpaid"],
        ["Cancelled", "Refunded"],
        ["Completed", "Paid"],
        ["Completed", "Unpaid"],
      ];

      testCombinations.forEach(([booking, payment]) => {
        expect(() => getPlayerBookingDisplayStatus(booking, payment)).not.toThrow();
        expect(() => getAdminBookingDisplayStatus(booking, payment)).not.toThrow();
      });
    });
  });
});
