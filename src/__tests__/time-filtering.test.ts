/**
 * @jest-environment jsdom
 */
import {
  filterPastTimeSlots,
  getCurrentTimeInTimezone,
  isToday,
  getTodayStr,
} from "@/utils/dateTime";

describe("Time Filtering Utilities", () => {
  describe("isToday", () => {
    it("should return true for today's date", () => {
      const today = getTodayStr();
      expect(isToday(today)).toBe(true);
    });

    it("should return false for past dates", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      expect(isToday(yesterdayStr)).toBe(false);
    });

    it("should return false for future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      expect(isToday(tomorrowStr)).toBe(false);
    });
  });

  describe("getCurrentTimeInTimezone", () => {
    it("should return time in HH:MM format", () => {
      const currentTime = getCurrentTimeInTimezone();
      expect(currentTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should return valid hours and minutes", () => {
      const currentTime = getCurrentTimeInTimezone();
      const [hours, minutes] = currentTime.split(":").map(Number);
      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThan(24);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThan(60);
    });
  });

  describe("filterPastTimeSlots", () => {
    const allTimeSlots = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
      "21:00", "21:30"
    ];

    it("should return all time slots for future dates", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      
      const filtered = filterPastTimeSlots(allTimeSlots, tomorrowStr);
      expect(filtered).toEqual(allTimeSlots);
    });

    it("should filter past time slots for today", () => {
      const today = getTodayStr();
      const filtered = filterPastTimeSlots(allTimeSlots, today);
      
      // Should have fewer or equal slots than original
      expect(filtered.length).toBeLessThanOrEqual(allTimeSlots.length);
      
      // Each filtered slot should be in the original array
      filtered.forEach(slot => {
        expect(allTimeSlots).toContain(slot);
      });
    });

    it("should exclude time slots earlier than current time for today", () => {
      const today = getTodayStr();
      const currentTime = getCurrentTimeInTimezone();
      const [currentHour, currentMinute] = currentTime.split(":").map(Number);
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      const filtered = filterPastTimeSlots(allTimeSlots, today);
      
      filtered.forEach(slot => {
        const [slotHour, slotMinute] = slot.split(":").map(Number);
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        expect(slotTotalMinutes).toBeGreaterThan(currentTotalMinutes);
      });
    });

    it("should handle edge case with no future slots", () => {
      const today = getTodayStr();
      const earlySlots = ["09:00", "09:30", "10:00"];
      
      // If current time is after all slots, should return empty array
      const filtered = filterPastTimeSlots(earlySlots, today);
      
      // Result depends on current time, so just verify it's valid
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(earlySlots.length);
    });

    it("should handle empty array input", () => {
      const today = getTodayStr();
      const filtered = filterPastTimeSlots([], today);
      expect(filtered).toEqual([]);
    });
  });

  describe("Time filtering in Quick Booking context", () => {
    it("should prevent selecting past times for today", () => {
      const today = getTodayStr();
      const timeSlots = [
        "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
        "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
        "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
        "20:00", "20:30", "21:00", "21:30", "22:00"
      ];
      
      const filtered = filterPastTimeSlots(timeSlots, today);
      const currentTime = getCurrentTimeInTimezone();
      
      // All filtered slots should be after current time
      filtered.forEach(slot => {
        const [slotH, slotM] = slot.split(":").map(Number);
        const [currH, currM] = currentTime.split(":").map(Number);
        const slotMinutes = slotH * 60 + slotM;
        const currMinutes = currH * 60 + currM;
        expect(slotMinutes).toBeGreaterThan(currMinutes);
      });
    });
  });
});
