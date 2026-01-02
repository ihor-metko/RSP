/**
 * @jest-environment node
 * 
 * Tests for centralized date formatting utilities
 */

import {
  formatDateShort,
  formatDateLong,
  formatDateWithWeekday,
  formatTime,
  formatDateTime,
  formatDateTimeFull,
  formatRelativeTime,
  formatDateRange,
} from "@/utils/date";

describe("Date Formatting Utilities", () => {
  const testDate = new Date("2024-04-15T14:30:00Z");
  const testDateString = "2024-04-15T14:30:00Z";

  describe("formatDateShort", () => {
    it("should format date in short format for English locale", () => {
      const result = formatDateShort(testDate, "en");
      expect(result).toMatch(/Apr 15/);
    });

    it("should format date in short format for Ukrainian locale", () => {
      const result = formatDateShort(testDate, "uk");
      expect(result).toMatch(/15/);
    });

    it("should accept string date input", () => {
      const result = formatDateShort(testDateString, "en");
      expect(result).toMatch(/Apr 15/);
    });
  });

  describe("formatDateLong", () => {
    it("should format date in long format for English locale", () => {
      const result = formatDateLong(testDate, "en");
      expect(result).toMatch(/April 15/);
      expect(result).toMatch(/2024/);
    });

    it("should format date in long format for Ukrainian locale", () => {
      const result = formatDateLong(testDate, "uk");
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it("should accept string date input", () => {
      const result = formatDateLong(testDateString, "en");
      expect(result).toMatch(/2024/);
    });
  });

  describe("formatDateWithWeekday", () => {
    it("should include weekday in English locale", () => {
      const result = formatDateWithWeekday(testDate, "en");
      expect(result).toMatch(/Mon/);
      expect(result).toMatch(/Apr/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it("should include weekday in Ukrainian locale", () => {
      const result = formatDateWithWeekday(testDate, "uk");
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });
  });

  describe("formatTime", () => {
    it("should format time in 24-hour format by default", () => {
      const result = formatTime(testDate, "en");
      expect(result).toMatch(/:/);
    });

    it("should format time in 12-hour format when specified", () => {
      const result = formatTime(testDate, "en", false);
      expect(result).toMatch(/:/);
      // Should include AM/PM indicator
      expect(result.toLowerCase()).toMatch(/am|pm/);
    });

    it("should accept string date input", () => {
      const result = formatTime(testDateString, "en");
      expect(result).toMatch(/:/);
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time together", () => {
      const result = formatDateTime(testDate, "en");
      expect(result).toMatch(/Apr/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/:/);
    });

    it("should work with string input", () => {
      const result = formatDateTime(testDateString, "en");
      expect(result).toMatch(/2024/);
    });
  });

  describe("formatDateTimeFull", () => {
    it("should format full date and time with weekday", () => {
      const result = formatDateTimeFull(testDate, "en");
      expect(result).toMatch(/Monday/);
      expect(result).toMatch(/April/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
      expect(result).toMatch(/:/);
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      // Mock current time for consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-04-15T14:30:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return 'now' for recent dates (English)", () => {
      const recent = new Date("2024-04-15T14:29:30Z"); // 30 seconds ago
      const result = formatRelativeTime(recent, "en");
      expect(result.toLowerCase()).toContain("now");
    });

    it("should return relative time for recent dates (Ukrainian)", () => {
      const recent = new Date("2024-04-15T14:29:30Z"); // 30 seconds ago
      const result = formatRelativeTime(recent, "uk");
      // Ukrainian locale should return something with "зараз" or similar
      expect(result).toBeTruthy();
    });

    it("should return minutes ago for recent past (English)", () => {
      const past = new Date("2024-04-15T14:00:00Z"); // 30 minutes ago
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("30");
      expect(result.toLowerCase()).toContain("minute");
    });

    it("should return minutes ago for recent past (Ukrainian)", () => {
      const past = new Date("2024-04-15T14:00:00Z"); // 30 minutes ago
      const result = formatRelativeTime(past, "uk");
      expect(result).toContain("30");
    });

    it("should return hours ago (English)", () => {
      const past = new Date("2024-04-15T12:00:00Z"); // 2.5 hours ago
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("2");
      expect(result.toLowerCase()).toContain("hour");
    });

    it("should return hours ago (Ukrainian)", () => {
      const past = new Date("2024-04-15T12:00:00Z"); // 2.5 hours ago
      const result = formatRelativeTime(past, "uk");
      expect(result).toContain("2");
    });

    it("should return days ago (English)", () => {
      const past = new Date("2024-04-13T14:30:00Z"); // 2 days ago
      const result = formatRelativeTime(past, "en");
      expect(result).toContain("2");
      expect(result.toLowerCase()).toContain("day");
    });

    it("should return days ago (Ukrainian)", () => {
      const past = new Date("2024-04-13T14:30:00Z"); // 2 days ago
      const result = formatRelativeTime(past, "uk");
      // Ukrainian locale may use special words like "позавчора" (day before yesterday)
      // or "2 дні тому" depending on the exact number
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return formatted date for dates older than 7 days", () => {
      const past = new Date("2024-04-01T14:30:00Z"); // 14 days ago
      const result = formatRelativeTime(past, "en");
      expect(result).toMatch(/Apr/);
      expect(result).toMatch(/1/);
    });

    it("should handle future dates (in X time) - minutes", () => {
      const future = new Date("2024-04-15T15:00:00Z"); // in 30 minutes
      const result = formatRelativeTime(future, "en");
      expect(result).toContain("30");
      expect(result.toLowerCase()).toContain("minute");
    });

    it("should handle future dates (in X time) - Ukrainian", () => {
      const future = new Date("2024-04-15T15:00:00Z"); // in 30 minutes
      const result = formatRelativeTime(future, "uk");
      expect(result).toContain("30");
    });
  });

  describe("formatDateRange", () => {
    it("should format date range", () => {
      const start = new Date("2024-04-15T00:00:00Z");
      const end = new Date("2024-04-22T00:00:00Z");
      const result = formatDateRange(start, end, "en");
      expect(result).toMatch(/Apr 15/);
      expect(result).toMatch(/Apr 22/);
      expect(result).toMatch(/-/);
    });

    it("should accept string inputs", () => {
      const start = "2024-04-15T00:00:00Z";
      const end = "2024-04-22T00:00:00Z";
      const result = formatDateRange(start, end, "en");
      expect(result).toMatch(/-/);
    });
  });
});
