/**
 * Tests for club timezone conversion utilities
 */

import {
  clubLocalToUTC,
  utcToClubLocalTime,
  utcToClubLocalDate,
  getTodayInClubTimezone,
  getCurrentTimeInClubTimezone,
} from "@/utils/dateTime";

describe("Club Timezone Conversion", () => {
  describe("clubLocalToUTC", () => {
    it("should convert Kyiv local time to UTC correctly", () => {
      // Europe/Kyiv is UTC+2 in winter (standard time)
      const result = clubLocalToUTC("2026-01-06", "10:00", "Europe/Kyiv");
      expect(result).toBe("2026-01-06T08:00:00.000Z");
    });

    it("should handle midnight correctly", () => {
      const result = clubLocalToUTC("2026-01-06", "00:00", "Europe/Kyiv");
      expect(result).toBe("2026-01-05T22:00:00.000Z");
    });

    it("should handle noon correctly", () => {
      const result = clubLocalToUTC("2026-01-06", "12:00", "Europe/Kyiv");
      expect(result).toBe("2026-01-06T10:00:00.000Z");
    });

    it("should handle end of day correctly", () => {
      const result = clubLocalToUTC("2026-01-06", "23:30", "Europe/Kyiv");
      expect(result).toBe("2026-01-06T21:30:00.000Z");
    });

    it("should work with different timezones", () => {
      // America/New_York is UTC-5 in winter
      const result = clubLocalToUTC("2026-01-06", "10:00", "America/New_York");
      expect(result).toBe("2026-01-06T15:00:00.000Z");
    });
  });

  describe("utcToClubLocalTime", () => {
    it("should convert UTC to Kyiv local time correctly", () => {
      const result = utcToClubLocalTime("2026-01-06T08:00:00.000Z", "Europe/Kyiv");
      expect(result).toBe("10:00");
    });

    it("should handle midnight UTC", () => {
      const result = utcToClubLocalTime("2026-01-06T00:00:00.000Z", "Europe/Kyiv");
      expect(result).toBe("02:00");
    });

    it("should handle different timezones", () => {
      const result = utcToClubLocalTime("2026-01-06T15:00:00.000Z", "America/New_York");
      expect(result).toBe("10:00");
    });
  });

  describe("utcToClubLocalDate", () => {
    it("should convert UTC to Kyiv local date correctly", () => {
      const result = utcToClubLocalDate("2026-01-06T08:00:00.000Z", "Europe/Kyiv");
      expect(result).toBe("2026-01-06");
    });

    it("should handle date boundary correctly (next day in local timezone)", () => {
      // 22:00 UTC on Jan 6 = 00:00 Kyiv on Jan 7
      const result = utcToClubLocalDate("2026-01-06T22:00:00.000Z", "Europe/Kyiv");
      expect(result).toBe("2026-01-07");
    });

    it("should handle date boundary correctly (previous day in local timezone)", () => {
      // 00:00 UTC on Jan 6 = 02:00 Kyiv on Jan 6 (still same day)
      const result = utcToClubLocalDate("2026-01-06T00:00:00.000Z", "Europe/Kyiv");
      expect(result).toBe("2026-01-06");
    });
  });

  describe("getTodayInClubTimezone", () => {
    it("should return today's date in YYYY-MM-DD format", () => {
      const result = getTodayInClubTimezone("Europe/Kyiv");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle different timezones", () => {
      const kyivToday = getTodayInClubTimezone("Europe/Kyiv");
      const nyToday = getTodayInClubTimezone("America/New_York");
      
      // Both should be valid dates
      expect(kyivToday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nyToday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // They might be different dates depending on current time
      // Just verify format is correct
    });
  });

  describe("getCurrentTimeInClubTimezone", () => {
    it("should return current time in HH:MM format", () => {
      const result = getCurrentTimeInClubTimezone("Europe/Kyiv");
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should handle different timezones", () => {
      const kyivTime = getCurrentTimeInClubTimezone("Europe/Kyiv");
      const nyTime = getCurrentTimeInClubTimezone("America/New_York");
      
      // Both should be valid times
      expect(kyivTime).toMatch(/^\d{2}:\d{2}$/);
      expect(nyTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe("Round-trip conversion", () => {
    it("should convert local -> UTC -> local correctly", () => {
      const originalDate = "2026-01-06";
      const originalTime = "14:30";
      const timezone = "Europe/Kyiv";
      
      // Convert to UTC
      const utcISO = clubLocalToUTC(originalDate, originalTime, timezone);
      
      // Convert back to local
      const localTime = utcToClubLocalTime(utcISO, timezone);
      const localDate = utcToClubLocalDate(utcISO, timezone);
      
      expect(localDate).toBe(originalDate);
      expect(localTime).toBe(originalTime);
    });

    it("should handle midnight boundary in round-trip", () => {
      const originalDate = "2026-01-06";
      const originalTime = "00:30";
      const timezone = "Europe/Kyiv";
      
      // Convert to UTC
      const utcISO = clubLocalToUTC(originalDate, originalTime, timezone);
      
      // Convert back to local
      const localTime = utcToClubLocalTime(utcISO, timezone);
      const localDate = utcToClubLocalDate(utcISO, timezone);
      
      expect(localDate).toBe(originalDate);
      expect(localTime).toBe(originalTime);
    });
  });
});
