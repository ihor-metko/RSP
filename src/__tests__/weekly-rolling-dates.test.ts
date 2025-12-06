/**
 * @jest-environment node
 * 
 * Tests for the rolling 7-day and calendar week date generation logic
 */

describe("Rolling 7-day window generation", () => {
  /**
   * Helper to get today's date in the platform timezone (Europe/Kyiv)
   */
  function getTodayInTimezone(): Date {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Kyiv",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(new Date());
    return new Date(todayStr);
  }

  /**
   * Get dates starting from a given date for a specified number of days
   */
  function getDates(startDate: Date, numDays: number): string[] {
    const dates: string[] = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  }

  /**
   * Get the start date for calendar mode (Monday of current week)
   */
  function getCalendarWeekStart(today: Date): Date {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  describe("Rolling mode - today + next 6 days", () => {
    it("should generate 7 dates starting from today", () => {
      const today = new Date(2025, 11, 6); // Dec 6, 2025 (Saturday)
      const dates = getDates(today, 7);
      
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe("2025-12-06"); // Saturday
      expect(dates[1]).toBe("2025-12-07"); // Sunday
      expect(dates[2]).toBe("2025-12-08"); // Monday
      expect(dates[6]).toBe("2025-12-12"); // Friday
    });

    it("should handle end of month correctly", () => {
      const today = new Date(2025, 11, 28); // Dec 28, 2025
      const dates = getDates(today, 7);
      
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe("2025-12-28");
      expect(dates[3]).toBe("2025-12-31"); // Dec 31
      expect(dates[4]).toBe("2026-01-01"); // Jan 1 (next year!)
      expect(dates[6]).toBe("2026-01-03");
    });

    it("should handle leap year February correctly", () => {
      const today = new Date(2024, 1, 27); // Feb 27, 2024 (leap year)
      const dates = getDates(today, 7);
      
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe("2024-02-27");
      expect(dates[2]).toBe("2024-02-29"); // Leap day
      expect(dates[3]).toBe("2024-03-01");
    });

    it("should handle non-leap year February correctly", () => {
      const today = new Date(2025, 1, 26); // Feb 26, 2025 (non-leap year)
      const dates = getDates(today, 7);
      
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe("2025-02-26");
      expect(dates[2]).toBe("2025-02-28"); // Last day of Feb
      expect(dates[3]).toBe("2025-03-01"); // First day of March
    });
  });

  describe("Calendar mode - Monday to Sunday", () => {
    it("should return correct Monday for a Wednesday", () => {
      const wednesday = new Date(2025, 11, 10); // Dec 10, 2025 (Wednesday)
      const monday = getCalendarWeekStart(wednesday);
      
      expect(monday.toISOString().split("T")[0]).toBe("2025-12-08"); // Monday
    });

    it("should return same day when input is Monday", () => {
      const monday = new Date(2025, 11, 8); // Dec 8, 2025 (Monday)
      const result = getCalendarWeekStart(monday);
      
      expect(result.toISOString().split("T")[0]).toBe("2025-12-08");
    });

    it("should return previous Monday when input is Sunday", () => {
      const sunday = new Date(2025, 11, 7); // Dec 7, 2025 (Sunday)
      const monday = getCalendarWeekStart(sunday);
      
      expect(monday.toISOString().split("T")[0]).toBe("2025-12-01"); // Previous Monday
    });

    it("should generate Mon-Sun week from Monday", () => {
      const monday = new Date(2025, 11, 8); // Dec 8, 2025 (Monday)
      const dates = getDates(monday, 7);
      
      expect(dates[0]).toBe("2025-12-08"); // Monday
      expect(dates[6]).toBe("2025-12-14"); // Sunday
    });

    it("should handle week spanning year boundary", () => {
      const monday = new Date(2025, 11, 29); // Dec 29, 2025 (Monday)
      const dates = getDates(monday, 7);
      
      expect(dates[0]).toBe("2025-12-29"); // Monday
      expect(dates[2]).toBe("2025-12-31"); // Wednesday (last day of year)
      expect(dates[3]).toBe("2026-01-01"); // Thursday (new year)
      expect(dates[6]).toBe("2026-01-04"); // Sunday
    });
  });

  describe("Timezone handling", () => {
    it("getTodayInTimezone should return a valid date string", () => {
      const today = getTodayInTimezone();
      const dateStr = today.toISOString().split("T")[0];
      
      // Should match YYYY-MM-DD format
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("Navigation (prev/next) behavior", () => {
    it("should shift by 7 days backward for prev week", () => {
      const startDate = new Date(2025, 11, 6); // Dec 6, 2025
      const prevStart = new Date(startDate);
      prevStart.setDate(prevStart.getDate() - 7);
      
      expect(prevStart.toISOString().split("T")[0]).toBe("2025-11-29"); // Nov 29
    });

    it("should shift by 7 days forward for next week", () => {
      const startDate = new Date(2025, 11, 6); // Dec 6, 2025
      const nextStart = new Date(startDate);
      nextStart.setDate(nextStart.getDate() + 7);
      
      expect(nextStart.toISOString().split("T")[0]).toBe("2025-12-13"); // Dec 13
    });
  });
});
