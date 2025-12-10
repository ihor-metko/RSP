/**
 * Tests for sport-specific availability calculations
 * Ensures that availability logic works correctly for different sport types
 */

import {
  SportType,
  getSportConfig,
  PADEL_CONFIG,
  TENNIS_CONFIG,
  SQUASH_CONFIG,
} from "@/constants/sports";

describe("Sport-Specific Availability", () => {
  describe("Slot Duration Validation", () => {
    it("should use correct default slot duration for Padel", () => {
      const config = getSportConfig(SportType.PADEL);
      expect(config.defaultSlotDuration).toBe(90);
      expect(config.availableSlotDurations).toContain(90);
    });

    it("should use correct default slot duration for Tennis", () => {
      const config = getSportConfig(SportType.TENNIS);
      expect(config.defaultSlotDuration).toBe(60);
      expect(config.availableSlotDurations).toContain(60);
    });

    it("should use correct default slot duration for Squash", () => {
      const config = getSportConfig(SportType.SQUASH);
      expect(config.defaultSlotDuration).toBe(45);
      expect(config.availableSlotDurations).toContain(45);
    });

    it("should validate slot durations against available options", () => {
      const padelConfig = getSportConfig(SportType.PADEL);
      const validDurations = [60, 90, 120];
      
      validDurations.forEach((duration) => {
        expect(padelConfig.availableSlotDurations).toContain(duration);
      });
    });
  });

  describe("Booking Duration Limits", () => {
    it("should respect minimum booking duration for each sport", () => {
      const sports = [
        { type: SportType.PADEL, minDuration: 60 },
        { type: SportType.TENNIS, minDuration: 60 },
        { type: SportType.SQUASH, minDuration: 45 },
        { type: SportType.PICKLEBALL, minDuration: 60 },
        { type: SportType.BADMINTON, minDuration: 60 },
      ];

      sports.forEach(({ type, minDuration }) => {
        const config = getSportConfig(type);
        expect(config.minBookingDuration).toBe(minDuration);
      });
    });

    it("should respect maximum booking duration for each sport", () => {
      const sports = [
        { type: SportType.PADEL, maxDuration: 180 },
        { type: SportType.TENNIS, maxDuration: 180 },
        { type: SportType.SQUASH, maxDuration: 90 },
      ];

      sports.forEach(({ type, maxDuration }) => {
        const config = getSportConfig(type);
        expect(config.maxBookingDuration).toBe(maxDuration);
      });
    });

    it("should validate booking duration is within min/max range", () => {
      const config = getSportConfig(SportType.PADEL);
      const testDuration = 90;

      expect(testDuration).toBeGreaterThanOrEqual(config.minBookingDuration);
      expect(testDuration).toBeLessThanOrEqual(config.maxBookingDuration);
    });
  });

  describe("Advance Booking Rules", () => {
    it("should have correct advance booking settings for Padel", () => {
      expect(PADEL_CONFIG.maxAdvanceBookingDays).toBe(30);
      expect(PADEL_CONFIG.requiresAdvanceBooking).toBe(false);
    });

    it("should have correct advance booking settings for Tennis", () => {
      expect(TENNIS_CONFIG.maxAdvanceBookingDays).toBe(30);
      expect(TENNIS_CONFIG.requiresAdvanceBooking).toBe(false);
    });

    it("should allow same-day bookings for sports without advance requirement", () => {
      const config = getSportConfig(SportType.PADEL);
      expect(config.requiresAdvanceBooking).toBe(false);
    });

    it("should respect maximum advance booking days for all sports", () => {
      const sports = Object.values(SportType);
      
      sports.forEach((sportType) => {
        const config = getSportConfig(sportType);
        expect(config.maxAdvanceBookingDays).toBeGreaterThan(0);
        expect(config.maxAdvanceBookingDays).toBeLessThanOrEqual(365); // Sanity check
      });
    });
  });

  describe("Legacy Padel Functionality", () => {
    it("should maintain Padel as the default sport type", () => {
      const config = getSportConfig(SportType.PADEL);
      expect(config.type).toBe(SportType.PADEL);
      expect(config.name).toBe("Padel");
    });

    it("should preserve Padel configuration values", () => {
      expect(PADEL_CONFIG.defaultSlotDuration).toBe(90);
      expect(PADEL_CONFIG.minPlayers).toBe(2);
      expect(PADEL_CONFIG.maxPlayers).toBe(4);
      expect(PADEL_CONFIG.typicalPlayers).toBe(4);
      expect(PADEL_CONFIG.coachingAvailable).toBe(true);
    });

    it("should include all Padel surface types", () => {
      const expectedSurfaces = ["Glass", "Concrete", "Artificial Grass"];
      expectedSurfaces.forEach((surface) => {
        expect(PADEL_CONFIG.defaultSurfaceTypes).toContain(surface);
      });
    });
  });

  describe("Player Count Validation", () => {
    it("should have correct player limits for Padel (doubles sport)", () => {
      const config = getSportConfig(SportType.PADEL);
      expect(config.minPlayers).toBe(2);
      expect(config.maxPlayers).toBe(4);
      expect(config.typicalPlayers).toBe(4); // Doubles is typical
    });

    it("should have correct player limits for Tennis", () => {
      const config = getSportConfig(SportType.TENNIS);
      expect(config.minPlayers).toBe(2);
      expect(config.maxPlayers).toBe(4);
      expect(config.typicalPlayers).toBe(2); // Singles is typical
    });

    it("should have correct player limits for Squash (singles only)", () => {
      const config = getSportConfig(SportType.SQUASH);
      expect(config.minPlayers).toBe(2);
      expect(config.maxPlayers).toBe(2);
      expect(config.typicalPlayers).toBe(2);
    });

    it("should validate player count is within limits", () => {
      const config = getSportConfig(SportType.PADEL);
      const testPlayerCount = 4;

      expect(testPlayerCount).toBeGreaterThanOrEqual(config.minPlayers);
      expect(testPlayerCount).toBeLessThanOrEqual(config.maxPlayers);
    });
  });
});
