/**
 * Tests for time-of-day conversion utilities (for business hours and price rules)
 */

import {
  timeOfDayToUTC,
  timeOfDayFromUTC,
} from "@/utils/dateTime";

describe("Time-of-Day Conversion (Business Hours & Price Rules)", () => {
  describe("timeOfDayToUTC", () => {
    it("should convert Kyiv time-of-day to UTC correctly", () => {
      // Europe/Kyiv is UTC+2 in winter (standard time)
      // 09:00 Kyiv → 07:00 UTC
      const result = timeOfDayToUTC("09:00", "Europe/Kyiv");
      expect(result).toBe("07:00");
    });

    it("should handle midnight correctly", () => {
      // 00:00 Kyiv → 22:00 UTC (previous day, but we only care about time)
      const result = timeOfDayToUTC("00:00", "Europe/Kyiv");
      expect(result).toBe("22:00");
    });

    it("should handle noon correctly", () => {
      // 12:00 Kyiv → 10:00 UTC
      const result = timeOfDayToUTC("12:00", "Europe/Kyiv");
      expect(result).toBe("10:00");
    });

    it("should handle end of day correctly", () => {
      // 23:30 Kyiv → 21:30 UTC
      const result = timeOfDayToUTC("23:30", "Europe/Kyiv");
      expect(result).toBe("21:30");
    });

    it("should work with different timezones (New York)", () => {
      // America/New_York is UTC-5 in winter
      // 10:00 NY → 15:00 UTC
      const result = timeOfDayToUTC("10:00", "America/New_York");
      expect(result).toBe("15:00");
    });

    it("should work with UTC timezone (no conversion)", () => {
      // UTC → UTC (no change)
      const result = timeOfDayToUTC("10:00", "UTC");
      expect(result).toBe("10:00");
    });
  });

  describe("timeOfDayFromUTC", () => {
    it("should convert UTC time-of-day to Kyiv correctly", () => {
      // 07:00 UTC → 09:00 Kyiv
      const result = timeOfDayFromUTC("07:00", "Europe/Kyiv");
      expect(result).toBe("09:00");
    });

    it("should handle midnight UTC", () => {
      // 00:00 UTC → 02:00 Kyiv
      const result = timeOfDayFromUTC("00:00", "Europe/Kyiv");
      expect(result).toBe("02:00");
    });

    it("should handle different timezones (New York)", () => {
      // 15:00 UTC → 10:00 NY (in winter)
      const result = timeOfDayFromUTC("15:00", "America/New_York");
      expect(result).toBe("10:00");
    });

    it("should work with UTC timezone (no conversion)", () => {
      // UTC → UTC (no change)
      const result = timeOfDayFromUTC("10:00", "UTC");
      expect(result).toBe("10:00");
    });
  });

  describe("Round-trip conversion", () => {
    it("should convert local time → UTC → local time correctly", () => {
      const originalTime = "14:30";
      const timezone = "Europe/Kyiv";
      
      // Convert to UTC
      const utcTime = timeOfDayToUTC(originalTime, timezone);
      
      // Convert back to local
      const localTime = timeOfDayFromUTC(utcTime, timezone);
      
      expect(localTime).toBe(originalTime);
    });

    it("should handle midnight in round-trip", () => {
      const originalTime = "00:00";
      const timezone = "Europe/Kyiv";
      
      // Convert to UTC
      const utcTime = timeOfDayToUTC(originalTime, timezone);
      
      // Convert back to local
      const localTime = timeOfDayFromUTC(utcTime, timezone);
      
      expect(localTime).toBe(originalTime);
    });

    it("should handle business hours range correctly", () => {
      const timezone = "Europe/Kyiv";
      
      // Typical business hours: 09:00-21:00 Kyiv
      const openTime = "09:00";
      const closeTime = "21:00";
      
      // Convert to UTC
      const openUTC = timeOfDayToUTC(openTime, timezone);
      const closeUTC = timeOfDayToUTC(closeTime, timezone);
      
      expect(openUTC).toBe("07:00");
      expect(closeUTC).toBe("19:00");
      
      // Convert back to local
      const openLocal = timeOfDayFromUTC(openUTC, timezone);
      const closeLocal = timeOfDayFromUTC(closeUTC, timezone);
      
      expect(openLocal).toBe(openTime);
      expect(closeLocal).toBe(closeTime);
    });
  });

  describe("Price rules time conversion", () => {
    it("should handle peak hours pricing correctly", () => {
      const timezone = "America/New_York";
      
      // Peak hours: 18:00-22:00 NY time
      const peakStart = "18:00";
      const peakEnd = "22:00";
      
      // Convert to UTC (winter time: UTC-5)
      const peakStartUTC = timeOfDayToUTC(peakStart, timezone);
      const peakEndUTC = timeOfDayToUTC(peakEnd, timezone);
      
      expect(peakStartUTC).toBe("23:00");
      expect(peakEndUTC).toBe("03:00"); // Next day in UTC
      
      // Verify round-trip
      expect(timeOfDayFromUTC(peakStartUTC, timezone)).toBe(peakStart);
      expect(timeOfDayFromUTC(peakEndUTC, timezone)).toBe(peakEnd);
    });
  });
});
