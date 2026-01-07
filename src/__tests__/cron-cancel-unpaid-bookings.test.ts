import { shouldCancelUnpaidBooking } from "@/utils/bookingStatus";
import { BOOKING_STATUS, PAYMENT_STATUS } from "@/types/booking";

describe("Cron Job - Cancel Unpaid Bookings", () => {
  describe("Payment timeout cancellation logic", () => {
    it("should identify bookings that need cancellation based on reservationExpiresAt", () => {
      const now = new Date("2024-01-15T14:00:00Z");
      
      // Test case 1: Booking with expired reservation (should cancel)
      const booking1 = {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: new Date("2024-01-15T13:00:00Z").toISOString(), // Expired 1 hour ago
      };
      
      expect(
        shouldCancelUnpaidBooking(
          booking1.bookingStatus,
          booking1.paymentStatus,
          booking1.reservationExpiresAt,
          now
        )
      ).toBe(true);
      
      // Test case 2: Booking with non-expired reservation (should NOT cancel)
      const booking2 = {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: new Date("2024-01-15T14:10:00Z").toISOString(), // Expires in 10 minutes
      };
      
      expect(
        shouldCancelUnpaidBooking(
          booking2.bookingStatus,
          booking2.paymentStatus,
          booking2.reservationExpiresAt,
          now
        )
      ).toBe(false);
      
      // Test case 3: Paid booking (should NOT cancel)
      const booking3 = {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PAID,
        reservationExpiresAt: new Date("2024-01-15T13:00:00Z").toISOString(), // Expired
      };
      
      expect(
        shouldCancelUnpaidBooking(
          booking3.bookingStatus,
          booking3.paymentStatus,
          booking3.reservationExpiresAt,
          now
        )
      ).toBe(false);
      
      // Test case 4: UPCOMING booking (should NOT cancel)
      const booking4 = {
        bookingStatus: BOOKING_STATUS.UPCOMING,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: new Date("2024-01-15T13:00:00Z").toISOString(), // Expired
      };
      
      expect(
        shouldCancelUnpaidBooking(
          booking4.bookingStatus,
          booking4.paymentStatus,
          booking4.reservationExpiresAt,
          now
        )
      ).toBe(false);
    });

    it("should handle edge cases correctly", () => {
      const now = new Date("2024-01-15T14:30:00Z");
      
      // Exactly at the expiry time
      const bookingAtBoundary = {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: new Date("2024-01-15T14:30:00Z").toISOString(),
      };
      
      expect(
        shouldCancelUnpaidBooking(
          bookingAtBoundary.bookingStatus,
          bookingAtBoundary.paymentStatus,
          bookingAtBoundary.reservationExpiresAt,
          now
        )
      ).toBe(true);
      
      // Just before expiry (1 second before)
      const bookingJustBefore = {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: new Date("2024-01-15T14:30:01Z").toISOString(),
      };
      
      expect(
        shouldCancelUnpaidBooking(
          bookingJustBefore.bookingStatus,
          bookingJustBefore.paymentStatus,
          bookingJustBefore.reservationExpiresAt,
          now
        )
      ).toBe(false);
    });

    it("should not cancel bookings that are already cancelled", () => {
      const now = new Date("2024-01-15T14:00:00Z");
      
      const cancelledBooking = {
        bookingStatus: BOOKING_STATUS.CANCELLED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: new Date("2024-01-15T13:00:00Z").toISOString(),
      };
      
      expect(
        shouldCancelUnpaidBooking(
          cancelledBooking.bookingStatus,
          cancelledBooking.paymentStatus,
          cancelledBooking.reservationExpiresAt,
          now
        )
      ).toBe(false);
    });

    it("should not cancel bookings without reservationExpiresAt (backwards compatibility)", () => {
      const now = new Date("2024-01-15T14:00:00Z");
      
      const bookingWithoutExpiry = {
        bookingStatus: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.UNPAID,
        reservationExpiresAt: null,
      };
      
      expect(
        shouldCancelUnpaidBooking(
          bookingWithoutExpiry.bookingStatus,
          bookingWithoutExpiry.paymentStatus,
          bookingWithoutExpiry.reservationExpiresAt,
          now
        )
      ).toBe(false);
    });
  });
});
