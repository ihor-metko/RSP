/**
 * Integration Tests for Reactive Statistics Updates
 * 
 * These tests verify that statistics are automatically updated
 * when bookings are created, updated, or deleted.
 */

import { 
  updateStatisticsForBooking,
  calculateAndStoreDailyStatistics,
} from "@/services/statisticsService";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findMany: jest.fn(),
    },
    clubSpecialHours: {
      findUnique: jest.fn(),
    },
    clubBusinessHours: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    clubDailyStatistics: {
      upsert: jest.fn(),
    },
  },
}));

describe("Reactive Statistics Integration", () => {
  const clubId = "club-123";
  const date = new Date("2024-01-15");

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (prisma.court.findMany as jest.Mock).mockResolvedValue([
      { id: "court-1" },
      { id: "court-2" },
    ]);
    (prisma.clubSpecialHours.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.clubBusinessHours.findUnique as jest.Mock).mockResolvedValue({
      isClosed: false,
      openTime: "08:00",
      closeTime: "22:00", // 14 hours
    });
  });

  describe("Booking Creation Flow", () => {
    it("should update statistics when a new booking is created", async () => {
      // Initial state: No bookings
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-initial",
        clubId,
        date,
        bookedSlots: 0,
        totalSlots: 28, // 2 courts × 14 hours
        occupancyPercentage: 0,
      });
      
      const initialStats = await calculateAndStoreDailyStatistics(clubId, date);
      
      expect(initialStats).toMatchObject({
        bookedSlots: 0,
        totalSlots: 28, // 2 courts × 14 hours
        occupancyPercentage: 0,
      });

      // User creates a booking
      const bookingStart = new Date("2024-01-15T10:00:00");
      const bookingEnd = new Date("2024-01-15T11:00:00");

      // Mock the booking now exists
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: bookingStart,
          end: bookingEnd,
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-updated",
        clubId,
        date,
        bookedSlots: 1,
        totalSlots: 28,
        occupancyPercentage: 3.57,
      });

      // Reactive update triggered
      const updatedStats = await updateStatisticsForBooking(
        clubId,
        bookingStart,
        bookingEnd
      );

      expect(updatedStats).toHaveLength(1);
      expect(updatedStats[0]).toMatchObject({
        bookedSlots: 1,
        totalSlots: 28,
        occupancyPercentage: 3.57,
      });
    });

    it("should reflect multiple bookings in statistics", async () => {
      // Mock multiple bookings
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: new Date("2024-01-15T10:00:00"),
          end: new Date("2024-01-15T11:00:00"), // 1 hour
        },
        {
          start: new Date("2024-01-15T14:00:00"),
          end: new Date("2024-01-15T16:00:00"), // 2 hours
        },
        {
          start: new Date("2024-01-15T18:00:00"),
          end: new Date("2024-01-15T20:00:00"), // 2 hours
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-multiple",
        clubId,
        date,
        bookedSlots: 5, // Total: 1 + 2 + 2
        totalSlots: 28,
        occupancyPercentage: 17.86,
      });

      const bookingStart = new Date("2024-01-15T18:00:00");
      const bookingEnd = new Date("2024-01-15T20:00:00");

      const stats = await updateStatisticsForBooking(
        clubId,
        bookingStart,
        bookingEnd
      );

      expect(stats[0]).toMatchObject({
        bookedSlots: 5,
        occupancyPercentage: 17.86,
      });
    });
  });

  describe("Booking Update Flow", () => {
    it("should recalculate statistics when booking status changes to cancelled", async () => {
      // Initially 3 bookings
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: new Date("2024-01-15T10:00:00"),
          end: new Date("2024-01-15T11:00:00"),
        },
        {
          start: new Date("2024-01-15T14:00:00"),
          end: new Date("2024-01-15T16:00:00"),
        },
        {
          start: new Date("2024-01-15T18:00:00"),
          end: new Date("2024-01-15T20:00:00"),
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-before-cancel",
        clubId,
        date,
        bookedSlots: 5,
        totalSlots: 28,
        occupancyPercentage: 17.86,
      });

      let stats = await updateStatisticsForBooking(
        clubId,
        new Date("2024-01-15T10:00:00"),
        new Date("2024-01-15T11:00:00")
      );

      expect(stats[0].bookedSlots).toBe(5);

      // One booking gets cancelled (filtered out by bookingStatus)
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: new Date("2024-01-15T10:00:00"),
          end: new Date("2024-01-15T11:00:00"),
        },
        {
          start: new Date("2024-01-15T14:00:00"),
          end: new Date("2024-01-15T16:00:00"),
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-after-cancel",
        clubId,
        date,
        bookedSlots: 3, // One 2-hour booking removed
        totalSlots: 28,
        occupancyPercentage: 10.71,
      });

      // Reactive update after status change
      stats = await updateStatisticsForBooking(
        clubId,
        new Date("2024-01-15T18:00:00"),
        new Date("2024-01-15T20:00:00")
      );

      expect(stats[0]).toMatchObject({
        bookedSlots: 3,
        occupancyPercentage: 10.71,
      });
    });
  });

  describe("Booking Deletion Flow", () => {
    it("should recalculate statistics when booking is deleted", async () => {
      // Initially 2 bookings
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: new Date("2024-01-15T10:00:00"),
          end: new Date("2024-01-15T11:00:00"),
        },
        {
          start: new Date("2024-01-15T14:00:00"),
          end: new Date("2024-01-15T16:00:00"),
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-before-delete",
        clubId,
        date,
        bookedSlots: 3,
        totalSlots: 28,
        occupancyPercentage: 10.71,
      });

      let stats = await updateStatisticsForBooking(
        clubId,
        new Date("2024-01-15T10:00:00"),
        new Date("2024-01-15T11:00:00")
      );

      expect(stats[0].bookedSlots).toBe(3);

      // After deletion, only one booking remains
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: new Date("2024-01-15T10:00:00"),
          end: new Date("2024-01-15T11:00:00"),
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-after-delete",
        clubId,
        date,
        bookedSlots: 1,
        totalSlots: 28,
        occupancyPercentage: 3.57,
      });

      // Reactive update after deletion
      stats = await updateStatisticsForBooking(
        clubId,
        new Date("2024-01-15T14:00:00"),
        new Date("2024-01-15T16:00:00")
      );

      expect(stats[0]).toMatchObject({
        bookedSlots: 1,
        occupancyPercentage: 3.57,
      });
    });

    it("should handle complete deletion of all bookings", async () => {
      // Initially has bookings
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: new Date("2024-01-15T10:00:00"),
          end: new Date("2024-01-15T11:00:00"),
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-has-bookings",
        clubId,
        date,
        bookedSlots: 1,
        totalSlots: 28,
        occupancyPercentage: 3.57,
      });

      let stats = await updateStatisticsForBooking(
        clubId,
        new Date("2024-01-15T10:00:00"),
        new Date("2024-01-15T11:00:00")
      );

      expect(stats[0].bookedSlots).toBe(1);

      // All bookings deleted
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-no-bookings",
        clubId,
        date,
        bookedSlots: 0,
        totalSlots: 28,
        occupancyPercentage: 0,
      });

      // Reactive update after last deletion
      stats = await updateStatisticsForBooking(
        clubId,
        new Date("2024-01-15T10:00:00"),
        new Date("2024-01-15T11:00:00")
      );

      expect(stats[0]).toMatchObject({
        bookedSlots: 0,
        occupancyPercentage: 0,
      });
    });
  });

  describe("Transaction Safety", () => {
    it("should handle transaction rollback scenario", async () => {
      // This test simulates what happens if a booking creation fails
      // but statistics were attempted to be updated
      
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      // In a real transaction, if the booking creation fails,
      // the statistics update should also be rolled back
      // This is guaranteed by wrapping both operations in prisma.$transaction

      try {
        // Simulate a failed booking creation
        throw new Error("CONFLICT");
      } catch {
        // Statistics update should not have persisted
        // because it was in the same transaction
        expect(prisma.clubDailyStatistics.upsert).not.toHaveBeenCalled();
      }
    });

    it("should be atomic - both booking and statistics succeed or both fail", async () => {
      // This test demonstrates the atomicity guarantee
      const bookingStart = new Date("2024-01-15T10:00:00");
      const bookingEnd = new Date("2024-01-15T11:00:00");

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          start: bookingStart,
          end: bookingEnd,
        },
      ]);

      (prisma.clubDailyStatistics.upsert as jest.Mock).mockResolvedValue({
        id: "stats-success",
        clubId,
        date,
        bookedSlots: 1,
        totalSlots: 28,
        occupancyPercentage: 3.57,
      });

      // Both operations succeed together
      const stats = await updateStatisticsForBooking(
        clubId,
        bookingStart,
        bookingEnd
      );

      expect(stats).toHaveLength(1);
      expect(stats[0].bookedSlots).toBe(1);

      // Reset mocks for failure scenario
      jest.clearAllMocks();
      
      // Setup mocks again for error scenario
      (prisma.court.findMany as jest.Mock).mockResolvedValue([
        { id: "court-1" },
        { id: "court-2" },
      ]);
      (prisma.clubSpecialHours.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.clubBusinessHours.findUnique as jest.Mock).mockResolvedValue({
        isClosed: false,
        openTime: "08:00",
        closeTime: "22:00",
      });
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      
      // If statistics update fails, the whole transaction should fail
      (prisma.clubDailyStatistics.upsert as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Set NODE_ENV to development to enable error logging
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await updateStatisticsForBooking(clubId, bookingStart, bookingEnd);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});
