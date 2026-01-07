/**
 * @jest-environment node
 */
import {
  getRolling7Days,
  getCalendarWeekDays,
  isPastDay,
  getTodayStr,
} from "@/utils/dateTime";

describe("Date helper functions for weekly availability", () => {
  describe("getRolling7Days", () => {
    it("should return 7 consecutive days starting from given date", () => {
      const startDate = new Date("2024-01-15"); // Monday
      const days = getRolling7Days(startDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-15");
      expect(days[1]).toBe("2024-01-16");
      expect(days[2]).toBe("2024-01-17");
      expect(days[3]).toBe("2024-01-18");
      expect(days[4]).toBe("2024-01-19");
      expect(days[5]).toBe("2024-01-20");
      expect(days[6]).toBe("2024-01-21");
    });

    it("should start from today when no date provided", () => {
      const days = getRolling7Days();

      expect(days).toHaveLength(7);
      // First day should be today
      const todayStr = getTodayStr();
      expect(days[0]).toBe(todayStr);
    });

    it("should work when starting from middle of week", () => {
      const startDate = new Date("2024-01-17"); // Wednesday
      const days = getRolling7Days(startDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-17"); // Wed
      expect(days[1]).toBe("2024-01-18"); // Thu
      expect(days[2]).toBe("2024-01-19"); // Fri
      expect(days[3]).toBe("2024-01-20"); // Sat
      expect(days[4]).toBe("2024-01-21"); // Sun
      expect(days[5]).toBe("2024-01-22"); // Mon (next week)
      expect(days[6]).toBe("2024-01-23"); // Tue
    });

    it("should handle month boundaries correctly", () => {
      const startDate = new Date("2024-01-29"); // Monday
      const days = getRolling7Days(startDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-29");
      expect(days[1]).toBe("2024-01-30");
      expect(days[2]).toBe("2024-01-31");
      expect(days[3]).toBe("2024-02-01"); // Next month
      expect(days[4]).toBe("2024-02-02");
      expect(days[5]).toBe("2024-02-03");
      expect(days[6]).toBe("2024-02-04");
    });

    it("should handle year boundaries correctly", () => {
      const startDate = new Date("2024-12-29"); // Sunday
      const days = getRolling7Days(startDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-12-29");
      expect(days[3]).toBe("2025-01-01"); // New year
      expect(days[6]).toBe("2025-01-04");
    });
  });

  describe("getCalendarWeekDays", () => {
    it("should return Monday-Sunday for a week containing given date", () => {
      const refDate = new Date("2024-01-17"); // Wednesday
      const days = getCalendarWeekDays(refDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-15"); // Monday
      expect(days[1]).toBe("2024-01-16"); // Tuesday
      expect(days[2]).toBe("2024-01-17"); // Wednesday (ref date)
      expect(days[3]).toBe("2024-01-18"); // Thursday
      expect(days[4]).toBe("2024-01-19"); // Friday
      expect(days[5]).toBe("2024-01-20"); // Saturday
      expect(days[6]).toBe("2024-01-21"); // Sunday
    });

    it("should start from Monday when given a Sunday", () => {
      const refDate = new Date("2024-01-21"); // Sunday
      const days = getCalendarWeekDays(refDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-15"); // Monday (previous week's Monday)
      expect(days[6]).toBe("2024-01-21"); // Sunday (ref date)
    });

    it("should start from same day when given a Monday", () => {
      const refDate = new Date("2024-01-15"); // Monday
      const days = getCalendarWeekDays(refDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-15"); // Monday (ref date)
      expect(days[6]).toBe("2024-01-21"); // Sunday
    });

    it("should return current week when no date provided", () => {
      const days = getCalendarWeekDays();

      expect(days).toHaveLength(7);
      // Should start with a Monday
      const firstDay = new Date(days[0]);
      expect(firstDay.getDay()).toBe(1); // Monday
    });

    it("should handle month boundaries", () => {
      const refDate = new Date("2024-02-01"); // Thursday
      const days = getCalendarWeekDays(refDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-01-29"); // Monday (prev month)
      expect(days[6]).toBe("2024-02-04"); // Sunday
    });

    it("should handle year boundaries", () => {
      const refDate = new Date("2025-01-01"); // Wednesday
      const days = getCalendarWeekDays(refDate);

      expect(days).toHaveLength(7);
      expect(days[0]).toBe("2024-12-30"); // Monday (prev year)
      expect(days[6]).toBe("2025-01-05"); // Sunday
    });
  });

  describe("isPastDay", () => {
    it("should return true for dates before today", () => {
      const todayStr = getTodayStr();
      const yesterday = new Date(todayStr);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      expect(isPastDay(yesterdayStr)).toBe(true);
    });

    it("should return false for today", () => {
      const todayStr = getTodayStr();
      expect(isPastDay(todayStr)).toBe(false);
    });

    it("should return false for future dates", () => {
      const todayStr = getTodayStr();
      const tomorrow = new Date(todayStr);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      expect(isPastDay(tomorrowStr)).toBe(false);
    });

    it("should work with dates far in the past", () => {
      expect(isPastDay("2020-01-01")).toBe(true);
    });

    it("should work with dates far in the future", () => {
      expect(isPastDay("2030-12-31")).toBe(false);
    });

    it("should use string comparison correctly", () => {
      // These tests verify that lexicographic comparison works correctly
      // for YYYY-MM-DD format
      expect(isPastDay("2024-01-01")).toBe(true); // Definitely past
      expect(isPastDay("2099-12-31")).toBe(false); // Definitely future
    });
  });

  describe("Integration: Rolling vs Calendar modes", () => {
    it("should demonstrate difference between rolling and calendar modes on Tuesday", () => {
      const tuesday = new Date("2024-01-16"); // Tuesday
      
      const rollingDays = getRolling7Days(tuesday);
      const calendarDays = getCalendarWeekDays(tuesday);

      // Rolling starts from Tuesday
      expect(rollingDays[0]).toBe("2024-01-16"); // Tue
      expect(rollingDays[1]).toBe("2024-01-17"); // Wed
      expect(rollingDays[6]).toBe("2024-01-22"); // Mon (next week)

      // Calendar starts from Monday of same week
      expect(calendarDays[0]).toBe("2024-01-15"); // Mon (this week)
      expect(calendarDays[1]).toBe("2024-01-16"); // Tue (ref date)
      expect(calendarDays[6]).toBe("2024-01-21"); // Sun (this week)
    });

    it("should show that rolling never includes past days when starting from today", () => {
      const rollingDays = getRolling7Days(); // No param = starts from today
      const todayStr = getTodayStr();

      // First day should be today
      expect(rollingDays[0]).toBe(todayStr);
      
      // All days should be today or future
      rollingDays.forEach(day => {
        expect(isPastDay(day)).toBe(false);
      });
    });

    it("should show that calendar mode may include past days when today is mid-week", () => {
      // Simulate today being Wednesday
      const wednesday = new Date("2024-01-17");
      const calendarDays = getCalendarWeekDays(wednesday);
      
      // Calendar starts from Monday
      expect(calendarDays[0]).toBe("2024-01-15"); // Mon
      expect(calendarDays[1]).toBe("2024-01-16"); // Tue
      expect(calendarDays[2]).toBe("2024-01-17"); // Wed (today)
      
      // Mon and Tue would be past days if today is Wednesday
      // (This is where UI blocking becomes important in calendar mode)
    });
  });
});
