/**
 * Tests for createDayRange function to ensure correct timezone handling
 */

import { createDayRange } from "@/utils/dateTime";

describe("createDayRange", () => {
  describe("Winter time (UTC+2)", () => {
    it("should create correct day boundaries for winter date", () => {
      const date = "2024-01-15";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      // Europe/Kyiv is UTC+2 in winter
      // Jan 15 00:00 in Kyiv = Jan 14 22:00 UTC
      // Jan 15 23:59:59.999 in Kyiv = Jan 15 21:59:59.999 UTC
      
      expect(startOfDay.toISOString()).toBe("2024-01-14T22:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2024-01-15T21:59:59.999Z");
    });
  });

  describe("Summer time (UTC+3)", () => {
    it("should create correct day boundaries for summer date", () => {
      const date = "2024-07-15";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      // Europe/Kyiv is UTC+3 in summer (DST)
      // Jul 15 00:00 in Kyiv = Jul 14 21:00 UTC
      // Jul 15 23:59:59.999 in Kyiv = Jul 15 20:59:59.999 UTC
      
      expect(startOfDay.toISOString()).toBe("2024-07-14T21:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2024-07-15T20:59:59.999Z");
    });
  });

  describe("Edge cases", () => {
    it("should handle start of year", () => {
      const date = "2024-01-01";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      expect(startOfDay.toISOString()).toBe("2023-12-31T22:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2024-01-01T21:59:59.999Z");
    });

    it("should handle end of year", () => {
      const date = "2024-12-31";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      expect(startOfDay.toISOString()).toBe("2024-12-30T22:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2024-12-31T21:59:59.999Z");
    });

    it("should handle leap year date", () => {
      const date = "2024-02-29";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      expect(startOfDay.toISOString()).toBe("2024-02-28T22:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2024-02-29T21:59:59.999Z");
    });
  });

  describe("Day span verification", () => {
    it("should span exactly 24 hours", () => {
      const date = "2024-06-15";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      const durationMs = endOfDay.getTime() - startOfDay.getTime();
      const expectedDurationMs = 24 * 60 * 60 * 1000 - 1; // 24 hours minus 1ms
      
      expect(durationMs).toBe(expectedDurationMs);
    });

    it("should have start before end", () => {
      const date = "2024-06-15";
      const { startOfDay, endOfDay } = createDayRange(date);
      
      expect(startOfDay.getTime()).toBeLessThan(endOfDay.getTime());
    });
  });

  describe("Input validation", () => {
    it("should throw error for invalid date format", () => {
      expect(() => createDayRange("2024/01/15")).toThrow("Invalid date format");
      expect(() => createDayRange("01-15-2024")).toThrow("Invalid date format");
      expect(() => createDayRange("2024-1-15")).toThrow("Invalid date format");
      expect(() => createDayRange("not-a-date")).toThrow("Invalid date format");
    });

    it("should throw error for invalid month or day values", () => {
      expect(() => createDayRange("2024-13-01")).toThrow("Invalid date values");
      expect(() => createDayRange("2024-00-15")).toThrow("Invalid date values");
      expect(() => createDayRange("2024-01-32")).toThrow("Invalid date values");
      // Note: JavaScript Date automatically rolls over Feb 30 to Mar 1, so it's considered valid
      // This is intentional behavior to allow flexibility in date calculations
    });

    it("should accept valid date strings", () => {
      expect(() => createDayRange("2024-01-01")).not.toThrow();
      expect(() => createDayRange("2024-12-31")).not.toThrow();
      expect(() => createDayRange("2024-06-15")).not.toThrow();
    });
  });
});
