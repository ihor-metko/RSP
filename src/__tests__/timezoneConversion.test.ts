/**
 * @jest-environment node
 */
import {
  toUtcFromClubTime,
  toClubTimeFromUtc,
  getCurrentDateInClubTimezone,
  getCurrentTimeInClubTimezone,
  formatDateInClubTimezone,
  toUtcISOString,
  isInPastInClubTimezone,
  isTodayInClubTimezone,
  addMinutesInClubTimezone,
} from "@/utils/timezoneConversion";

describe("Timezone Conversion Utilities", () => {
  describe("toUtcFromClubTime", () => {
    it("should convert club local time to UTC correctly for Europe/Kyiv", () => {
      // Europe/Kyiv is UTC+2 in winter (standard time)
      // 10:00 in Kyiv = 08:00 UTC (in January)
      const result = toUtcFromClubTime("2026-01-06", "10:00", "Europe/Kyiv");
      
      // Check the UTC time
      expect(result.getUTCHours()).toBe(8);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.toISOString()).toBe("2026-01-06T08:00:00.000Z");
    });

    it("should convert club local time to UTC correctly for America/New_York", () => {
      // America/New_York is UTC-5 in winter (standard time)
      // 10:00 in New York = 15:00 UTC (in January)
      const result = toUtcFromClubTime("2026-01-06", "10:00", "America/New_York");
      
      expect(result.getUTCHours()).toBe(15);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it("should convert club local time to UTC correctly for Asia/Tokyo", () => {
      // Asia/Tokyo is UTC+9
      // 10:00 in Tokyo = 01:00 UTC
      const result = toUtcFromClubTime("2026-01-06", "10:00", "Asia/Tokyo");
      
      expect(result.getUTCHours()).toBe(1);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it("should handle midnight correctly", () => {
      // 00:00 in Kyiv (UTC+2) = 22:00 previous day UTC
      const result = toUtcFromClubTime("2026-01-06", "00:00", "Europe/Kyiv");
      
      expect(result.toISOString()).toBe("2026-01-05T22:00:00.000Z");
    });

    it("should handle end of day correctly", () => {
      // 23:30 in Kyiv (UTC+2) = 21:30 UTC
      const result = toUtcFromClubTime("2026-01-06", "23:30", "Europe/Kyiv");
      
      expect(result.toISOString()).toBe("2026-01-06T21:30:00.000Z");
    });

    it("should use default timezone when null is provided", () => {
      const result = toUtcFromClubTime("2026-01-06", "10:00", null);
      
      // Should use Europe/Kyiv as default
      expect(result.toISOString()).toBe("2026-01-06T08:00:00.000Z");
    });

    it("should use default timezone when undefined is provided", () => {
      const result = toUtcFromClubTime("2026-01-06", "10:00", undefined);
      
      // Should use Europe/Kyiv as default
      expect(result.toISOString()).toBe("2026-01-06T08:00:00.000Z");
    });

    it("should throw error for invalid date format", () => {
      expect(() => {
        toUtcFromClubTime("2026/01/06", "10:00", "Europe/Kyiv");
      }).toThrow("Invalid date format");
    });

    it("should throw error for invalid time format", () => {
      expect(() => {
        toUtcFromClubTime("2026-01-06", "25:00", "Europe/Kyiv");
      }).toThrow("Invalid time format");
    });
  });

  describe("toClubTimeFromUtc", () => {
    it("should convert UTC to club local time correctly for Europe/Kyiv", () => {
      const utcDate = new Date("2026-01-06T08:00:00.000Z");
      const result = toClubTimeFromUtc(utcDate, "Europe/Kyiv");
      
      expect(result.date).toBe("2026-01-06");
      expect(result.time).toBe("10:00");
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(0);
    });

    it("should convert UTC to club local time correctly for America/New_York", () => {
      const utcDate = new Date("2026-01-06T15:00:00.000Z");
      const result = toClubTimeFromUtc(utcDate, "America/New_York");
      
      expect(result.date).toBe("2026-01-06");
      expect(result.time).toBe("10:00");
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(0);
    });

    it("should convert UTC to club local time correctly for Asia/Tokyo", () => {
      const utcDate = new Date("2026-01-06T01:00:00.000Z");
      const result = toClubTimeFromUtc(utcDate, "Asia/Tokyo");
      
      expect(result.date).toBe("2026-01-06");
      expect(result.time).toBe("10:00");
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(0);
    });

    it("should handle date boundary crossing (UTC midnight -> next day in timezone)", () => {
      // 22:00 UTC = 00:00 next day in Kyiv (UTC+2)
      const utcDate = new Date("2026-01-05T22:00:00.000Z");
      const result = toClubTimeFromUtc(utcDate, "Europe/Kyiv");
      
      expect(result.date).toBe("2026-01-06");
      expect(result.time).toBe("00:00");
    });

    it("should handle date boundary crossing (club midnight -> previous day UTC)", () => {
      // 22:00 previous day UTC = 00:00 in Kyiv
      const utcDate = new Date("2026-01-05T22:00:00.000Z");
      const result = toClubTimeFromUtc(utcDate, "Europe/Kyiv");
      
      expect(result.date).toBe("2026-01-06");
      expect(result.time).toBe("00:00");
    });

    it("should accept ISO string as input", () => {
      const result = toClubTimeFromUtc("2026-01-06T08:00:00.000Z", "Europe/Kyiv");
      
      expect(result.date).toBe("2026-01-06");
      expect(result.time).toBe("10:00");
    });

    it("should throw error for invalid date", () => {
      expect(() => {
        toClubTimeFromUtc("invalid-date", "Europe/Kyiv");
      }).toThrow("Invalid date");
    });
  });

  describe("toUtcISOString", () => {
    it("should return ISO 8601 UTC string", () => {
      const result = toUtcISOString("2026-01-06", "10:00", "Europe/Kyiv");
      
      expect(result).toBe("2026-01-06T08:00:00.000Z");
      expect(result.endsWith("Z")).toBe(true);
    });

    it("should be compatible with backend UTC validation", () => {
      const result = toUtcISOString("2026-01-06", "10:00", "Europe/Kyiv");
      
      // Should be parseable as a valid UTC date
      const parsed = new Date(result);
      expect(isNaN(parsed.getTime())).toBe(false);
      expect(parsed.toISOString()).toBe(result);
    });
  });

  describe("isTodayInClubTimezone", () => {
    it("should correctly identify today in club timezone", () => {
      // Get current date in club timezone
      const today = getCurrentDateInClubTimezone("Europe/Kyiv");
      
      expect(isTodayInClubTimezone(today, "Europe/Kyiv")).toBe(true);
    });

    it("should correctly identify non-today dates", () => {
      expect(isTodayInClubTimezone("2025-01-01", "Europe/Kyiv")).toBe(false);
      expect(isTodayInClubTimezone("2027-01-01", "Europe/Kyiv")).toBe(false);
    });
  });

  describe("addMinutesInClubTimezone", () => {
    it("should add minutes correctly within same day", () => {
      const result = addMinutesInClubTimezone("2026-01-06", "10:00", 90, "Europe/Kyiv");
      
      const clubTime = toClubTimeFromUtc(result, "Europe/Kyiv");
      expect(clubTime.date).toBe("2026-01-06");
      expect(clubTime.time).toBe("11:30");
    });

    it("should handle crossing day boundary", () => {
      const result = addMinutesInClubTimezone("2026-01-06", "23:30", 60, "Europe/Kyiv");
      
      const clubTime = toClubTimeFromUtc(result, "Europe/Kyiv");
      expect(clubTime.date).toBe("2026-01-07");
      expect(clubTime.time).toBe("00:30");
    });

    it("should return UTC Date object", () => {
      const result = addMinutesInClubTimezone("2026-01-06", "10:00", 60, "Europe/Kyiv");
      
      expect(result).toBeInstanceOf(Date);
      // 10:00 Kyiv + 60 min = 11:00 Kyiv = 09:00 UTC
      expect(result.toISOString()).toBe("2026-01-06T09:00:00.000Z");
    });
  });

  describe("formatDateInClubTimezone", () => {
    it("should format date in club timezone", () => {
      const utcDate = new Date("2026-01-06T08:00:00.000Z");
      
      const result = formatDateInClubTimezone(
        utcDate,
        "Europe/Kyiv",
        { dateStyle: 'short', timeStyle: 'short' }
      );
      
      // Should include club local time (10:00), not UTC time (08:00)
      expect(result).toContain("10:00");
    });

    it("should accept ISO string as input", () => {
      const result = formatDateInClubTimezone(
        "2026-01-06T08:00:00.000Z",
        "Europe/Kyiv",
        { hour: '2-digit', minute: '2-digit', hour12: false }
      );
      
      expect(result).toContain("10:00");
    });
  });

  describe("Round-trip conversion", () => {
    it("should maintain consistency when converting to UTC and back", () => {
      const originalDate = "2026-01-06";
      const originalTime = "10:00";
      const timezone = "Europe/Kyiv";
      
      // Convert to UTC
      const utcDate = toUtcFromClubTime(originalDate, originalTime, timezone);
      
      // Convert back to club time
      const clubTime = toClubTimeFromUtc(utcDate, timezone);
      
      expect(clubTime.date).toBe(originalDate);
      expect(clubTime.time).toBe(originalTime);
    });

    it("should work with different timezones", () => {
      const timezones = ["Europe/Kyiv", "America/New_York", "Asia/Tokyo", "UTC"];
      
      timezones.forEach(timezone => {
        const originalDate = "2026-01-06";
        const originalTime = "14:30";
        
        const utcDate = toUtcFromClubTime(originalDate, originalTime, timezone);
        const clubTime = toClubTimeFromUtc(utcDate, timezone);
        
        expect(clubTime.date).toBe(originalDate);
        expect(clubTime.time).toBe(originalTime);
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle February 29 (leap year)", () => {
      const result = toUtcFromClubTime("2024-02-29", "10:00", "Europe/Kyiv");
      expect(result.getUTCDate()).toBe(29);
      expect(result.getUTCMonth()).toBe(1); // February (0-indexed)
    });

    it("should handle single-digit hours in time", () => {
      const result = toUtcFromClubTime("2026-01-06", "9:00", "Europe/Kyiv");
      expect(result.toISOString()).toBe("2026-01-06T07:00:00.000Z");
    });

    it("should handle single-digit minutes in time", () => {
      const result = toUtcFromClubTime("2026-01-06", "10:05", "Europe/Kyiv");
      expect(result.getUTCMinutes()).toBe(5);
    });
  });
});
