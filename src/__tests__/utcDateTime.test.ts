/**
 * @jest-environment node
 */
import {
  isValidUTCString,
  isValidDateString,
  isValidTimeString,
  createUTCDate,
  doUTCRangesOverlap,
  getUTCDateString,
  getUTCTimeString,
  getUTCDayBounds,
  addMinutesUTC,
  getDurationMinutes,
  isValidUTCRange,
  getTodayUTC,
} from "@/utils/utcDateTime";

describe("UTC DateTime Utilities", () => {
  describe("isValidUTCString", () => {
    it("should validate correct UTC ISO strings", () => {
      expect(isValidUTCString("2026-01-06T10:00:00.000Z")).toBe(true);
      expect(isValidUTCString("2026-01-06T10:00:00Z")).toBe(true);
      expect(isValidUTCString("2026-12-31T23:59:59.999Z")).toBe(true);
    });

    it("should reject non-UTC strings", () => {
      expect(isValidUTCString("2026-01-06T10:00:00")).toBe(false);
      expect(isValidUTCString("2026-01-06T10:00:00+02:00")).toBe(false);
      expect(isValidUTCString("2026-01-06T10:00:00.000")).toBe(false);
    });

    it("should reject invalid dates", () => {
      expect(isValidUTCString("2026-13-01T10:00:00.000Z")).toBe(false);
      expect(isValidUTCString("2026-01-32T10:00:00.000Z")).toBe(false);
      expect(isValidUTCString("invalid")).toBe(false);
    });
  });

  describe("isValidDateString", () => {
    it("should validate correct date strings", () => {
      expect(isValidDateString("2026-01-06")).toBe(true);
      expect(isValidDateString("2026-12-31")).toBe(true);
      expect(isValidDateString("2025-02-28")).toBe(true);
    });

    it("should reject invalid date strings", () => {
      expect(isValidDateString("2026-13-01")).toBe(false);
      expect(isValidDateString("2026-01-32")).toBe(false);
      expect(isValidDateString("26-01-06")).toBe(false);
      expect(isValidDateString("2026/01/06")).toBe(false);
    });
  });

  describe("isValidTimeString", () => {
    it("should validate correct time strings", () => {
      expect(isValidTimeString("10:00")).toBe(true);
      expect(isValidTimeString("23:59")).toBe(true);
      expect(isValidTimeString("00:00")).toBe(true);
      expect(isValidTimeString("9:30")).toBe(true);
    });

    it("should reject invalid time strings", () => {
      expect(isValidTimeString("24:00")).toBe(false);
      expect(isValidTimeString("10:60")).toBe(false);
      expect(isValidTimeString("10")).toBe(false);
      expect(isValidTimeString("10:00:00")).toBe(false);
    });
  });

  describe("createUTCDate", () => {
    it("should create correct UTC dates", () => {
      const date = createUTCDate("2026-01-06", "10:00");
      expect(date.toISOString()).toBe("2026-01-06T10:00:00.000Z");
    });

    it("should throw on invalid inputs", () => {
      expect(() => createUTCDate("invalid", "10:00")).toThrow();
      expect(() => createUTCDate("2026-01-06", "invalid")).toThrow();
    });
  });

  describe("doUTCRangesOverlap", () => {
    it("should detect overlapping ranges", () => {
      const start1 = new Date("2026-01-06T10:00:00.000Z");
      const end1 = new Date("2026-01-06T11:00:00.000Z");
      const start2 = new Date("2026-01-06T10:30:00.000Z");
      const end2 = new Date("2026-01-06T11:30:00.000Z");

      expect(doUTCRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it("should detect non-overlapping ranges", () => {
      const start1 = new Date("2026-01-06T10:00:00.000Z");
      const end1 = new Date("2026-01-06T11:00:00.000Z");
      const start2 = new Date("2026-01-06T11:00:00.000Z");
      const end2 = new Date("2026-01-06T12:00:00.000Z");

      expect(doUTCRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it("should handle contained ranges", () => {
      const start1 = new Date("2026-01-06T10:00:00.000Z");
      const end1 = new Date("2026-01-06T12:00:00.000Z");
      const start2 = new Date("2026-01-06T10:30:00.000Z");
      const end2 = new Date("2026-01-06T11:00:00.000Z");

      expect(doUTCRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it("should handle edge-touching ranges correctly", () => {
      const start1 = new Date("2026-01-06T10:00:00.000Z");
      const end1 = new Date("2026-01-06T11:00:00.000Z");
      const start2 = new Date("2026-01-06T11:00:00.000Z");
      const end2 = new Date("2026-01-06T12:00:00.000Z");

      // Ranges that touch at endpoints should NOT overlap
      expect(doUTCRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });
  });

  describe("getUTCDateString", () => {
    it("should extract date string from UTC date", () => {
      const date = new Date("2026-01-06T10:30:45.123Z");
      expect(getUTCDateString(date)).toBe("2026-01-06");
    });
  });

  describe("getUTCTimeString", () => {
    it("should extract time string from UTC date", () => {
      const date = new Date("2026-01-06T10:30:45.123Z");
      expect(getUTCTimeString(date)).toBe("10:30");
    });
  });

  describe("getUTCDayBounds", () => {
    it("should return start and end of day in UTC", () => {
      const { startOfDay, endOfDay } = getUTCDayBounds("2026-01-06");

      expect(startOfDay.toISOString()).toBe("2026-01-06T00:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2026-01-06T23:59:59.999Z");
    });

    it("should throw on invalid date", () => {
      expect(() => getUTCDayBounds("invalid")).toThrow();
    });
  });

  describe("addMinutesUTC", () => {
    it("should add minutes correctly", () => {
      const date = new Date("2026-01-06T10:00:00.000Z");
      const result = addMinutesUTC(date, 30);

      expect(result.toISOString()).toBe("2026-01-06T10:30:00.000Z");
    });

    it("should handle hour boundaries", () => {
      const date = new Date("2026-01-06T10:45:00.000Z");
      const result = addMinutesUTC(date, 30);

      expect(result.toISOString()).toBe("2026-01-06T11:15:00.000Z");
    });

    it("should handle negative minutes", () => {
      const date = new Date("2026-01-06T10:30:00.000Z");
      const result = addMinutesUTC(date, -30);

      expect(result.toISOString()).toBe("2026-01-06T10:00:00.000Z");
    });
  });

  describe("getDurationMinutes", () => {
    it("should calculate duration correctly", () => {
      const start = new Date("2026-01-06T10:00:00.000Z");
      const end = new Date("2026-01-06T11:30:00.000Z");

      expect(getDurationMinutes(start, end)).toBe(90);
    });
  });

  describe("isValidUTCRange", () => {
    it("should validate that end is after start", () => {
      const start = new Date("2026-01-06T10:00:00.000Z");
      const end = new Date("2026-01-06T11:00:00.000Z");

      expect(isValidUTCRange(start, end)).toBe(true);
    });

    it("should reject invalid ranges", () => {
      const start = new Date("2026-01-06T11:00:00.000Z");
      const end = new Date("2026-01-06T10:00:00.000Z");

      expect(isValidUTCRange(start, end)).toBe(false);
    });

    it("should reject equal start and end", () => {
      const start = new Date("2026-01-06T10:00:00.000Z");
      const end = new Date("2026-01-06T10:00:00.000Z");

      expect(isValidUTCRange(start, end)).toBe(false);
    });
  });

  describe("getTodayUTC", () => {
    it("should return today's date in YYYY-MM-DD format", () => {
      const today = getTodayUTC();
      const regex = /^\d{4}-\d{2}-\d{2}$/;

      expect(regex.test(today)).toBe(true);
    });
  });
});
