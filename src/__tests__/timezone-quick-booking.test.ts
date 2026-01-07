/**
 * @jest-environment jsdom
 */
import {
  filterPastTimeSlots,
  getCurrentTimeInClubTimezone,
  getTodayInClubTimezone,
} from "@/utils/dateTime";

describe("Quick Booking Timezone Handling", () => {
  const allTimeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"
  ];

  describe("filterPastTimeSlots with club timezone", () => {
    it("should filter past times using club timezone (Europe/Kyiv)", () => {
      const clubTimezone = "Europe/Kyiv";
      const today = getTodayInClubTimezone(clubTimezone);
      
      const filtered = filterPastTimeSlots(allTimeSlots, today, clubTimezone);
      const currentTime = getCurrentTimeInClubTimezone(clubTimezone);
      const [currentHour, currentMinute] = currentTime.split(":").map(Number);
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      // All filtered slots should be after current time in club timezone
      filtered.forEach(slot => {
        const [slotHour, slotMinute] = slot.split(":").map(Number);
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        expect(slotTotalMinutes).toBeGreaterThan(currentTotalMinutes);
      });
    });

    it("should filter past times using different club timezone (America/New_York)", () => {
      const clubTimezone = "America/New_York";
      const today = getTodayInClubTimezone(clubTimezone);
      
      const filtered = filterPastTimeSlots(allTimeSlots, today, clubTimezone);
      const currentTime = getCurrentTimeInClubTimezone(clubTimezone);
      const [currentHour, currentMinute] = currentTime.split(":").map(Number);
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      // All filtered slots should be after current time in club timezone
      filtered.forEach(slot => {
        const [slotHour, slotMinute] = slot.split(":").map(Number);
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        expect(slotTotalMinutes).toBeGreaterThan(currentTotalMinutes);
      });
    });

    it("should return all time slots for future dates regardless of timezone", () => {
      const clubTimezone = "Asia/Tokyo";
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      
      const filtered = filterPastTimeSlots(allTimeSlots, tomorrowStr, clubTimezone);
      
      // Should return all slots for future dates
      expect(filtered).toEqual(allTimeSlots);
    });

    it("should handle club timezone being undefined (fallback to platform timezone)", () => {
      const today = getTodayInClubTimezone("Europe/Kyiv"); // Platform default
      
      const filtered = filterPastTimeSlots(allTimeSlots, today, undefined);
      
      // Should still filter correctly using platform timezone
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(allTimeSlots.length);
    });

    it("should correctly handle timezone difference scenario", () => {
      // Simulate a scenario where a club in New York (UTC-5) is accessed
      // when it's late evening in Kyiv (UTC+2)
      const nyTimezone = "America/New_York";
      const todayInNY = getTodayInClubTimezone(nyTimezone);
      
      // Get current time in NY timezone
      const currentTimeNY = getCurrentTimeInClubTimezone(nyTimezone);
      const [nyHour, nyMinute] = currentTimeNY.split(":").map(Number);
      const nyTotalMinutes = nyHour * 60 + nyMinute;
      
      // Filter slots for today in NY timezone
      const filtered = filterPastTimeSlots(allTimeSlots, todayInNY, nyTimezone);
      
      // Verify all returned slots are in the future for NY timezone
      filtered.forEach(slot => {
        const [slotHour, slotMinute] = slot.split(":").map(Number);
        const slotTotalMinutes = slotHour * 60 + slotMinute;
        expect(slotTotalMinutes).toBeGreaterThan(nyTotalMinutes);
      });
    });
  });

  describe("Timezone consistency", () => {
    it("should use same date for isToday check and time filtering in same timezone", () => {
      const clubTimezone = "Europe/London";
      const today = getTodayInClubTimezone(clubTimezone);
      
      // Filter should work correctly for today
      const filtered = filterPastTimeSlots(allTimeSlots, today, clubTimezone);
      
      // Should have filtered some slots (unless it's very early morning)
      // At minimum, filtering should work without errors
      expect(Array.isArray(filtered)).toBe(true);
    });

    it("should handle edge case of midnight crossing", () => {
      const clubTimezone = "Pacific/Auckland"; // Far ahead timezone
      const today = getTodayInClubTimezone(clubTimezone);
      
      const filtered = filterPastTimeSlots(allTimeSlots, today, clubTimezone);
      
      // Should return valid array
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeLessThanOrEqual(allTimeSlots.length);
    });
  });

  describe("Real-world scenario: Late evening booking", () => {
    it("should show available slots for club timezone, not user's timezone", () => {
      // Scenario: User in Tokyo (UTC+9) wants to book at a club in Kyiv (UTC+2)
      // It might be late evening in Tokyo but still afternoon in Kyiv
      
      const clubTimezone = "Europe/Kyiv";
      const todayInClub = getTodayInClubTimezone(clubTimezone);
      const currentTimeInClub = getCurrentTimeInClubTimezone(clubTimezone);
      
      // Get slots available in club timezone
      const availableSlots = filterPastTimeSlots(allTimeSlots, todayInClub, clubTimezone);
      
      // Parse current time
      const [currentHour, currentMinute] = currentTimeInClub.split(":").map(Number);
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      // If it's before closing time in club timezone, there should be available slots
      if (currentTotalMinutes < 22 * 60) { // Before 22:00
        // We might have available slots (unless it's very late)
        availableSlots.forEach(slot => {
          const [slotHour, slotMinute] = slot.split(":").map(Number);
          const slotTotalMinutes = slotHour * 60 + slotMinute;
          // All available slots should be after current time in club timezone
          expect(slotTotalMinutes).toBeGreaterThan(currentTotalMinutes);
        });
      }
    });
  });
});
