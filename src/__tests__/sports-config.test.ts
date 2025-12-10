/**
 * Tests for sport configuration
 */

import {
  SportType,
  getSportConfig,
  getAllSports,
  getSportName,
  isSupportedSport,
  DEFAULT_SPORT_TYPE,
  PADEL_CONFIG,
} from "@/constants/sports";

describe("Sport Configuration", () => {
  describe("SportType enum", () => {
    it("should have all expected sport types", () => {
      expect(SportType.PADEL).toBe("PADEL");
      expect(SportType.TENNIS).toBe("TENNIS");
      expect(SportType.PICKLEBALL).toBe("PICKLEBALL");
      expect(SportType.SQUASH).toBe("SQUASH");
      expect(SportType.BADMINTON).toBe("BADMINTON");
    });
  });

  describe("getSportConfig", () => {
    it("should return correct config for Padel", () => {
      const config = getSportConfig(SportType.PADEL);
      expect(config.type).toBe(SportType.PADEL);
      expect(config.name).toBe("Padel");
      expect(config.defaultSlotDuration).toBe(90);
      expect(config.minPlayers).toBe(2);
      expect(config.maxPlayers).toBe(4);
    });

    it("should return correct config for Tennis", () => {
      const config = getSportConfig(SportType.TENNIS);
      expect(config.type).toBe(SportType.TENNIS);
      expect(config.name).toBe("Tennis");
      expect(config.defaultSlotDuration).toBe(60);
    });

    it("should return correct config for all sports", () => {
      Object.values(SportType).forEach((sportType) => {
        const config = getSportConfig(sportType);
        expect(config).toBeDefined();
        expect(config.type).toBe(sportType);
        expect(config.name).toBeTruthy();
        expect(config.defaultSlotDuration).toBeGreaterThan(0);
        expect(config.minPlayers).toBeGreaterThan(0);
        expect(config.maxPlayers).toBeGreaterThanOrEqual(config.minPlayers);
      });
    });
  });

  describe("getAllSports", () => {
    it("should return all sport configurations", () => {
      const sports = getAllSports();
      expect(sports).toHaveLength(5);
      expect(sports.map((s) => s.type)).toContain(SportType.PADEL);
      expect(sports.map((s) => s.type)).toContain(SportType.TENNIS);
      expect(sports.map((s) => s.type)).toContain(SportType.PICKLEBALL);
      expect(sports.map((s) => s.type)).toContain(SportType.SQUASH);
      expect(sports.map((s) => s.type)).toContain(SportType.BADMINTON);
    });
  });

  describe("getSportName", () => {
    it("should return correct names for all sports", () => {
      expect(getSportName(SportType.PADEL)).toBe("Padel");
      expect(getSportName(SportType.TENNIS)).toBe("Tennis");
      expect(getSportName(SportType.PICKLEBALL)).toBe("Pickleball");
      expect(getSportName(SportType.SQUASH)).toBe("Squash");
      expect(getSportName(SportType.BADMINTON)).toBe("Badminton");
    });

    it("should return the sport type for unknown sports", () => {
      const unknownSport = "UNKNOWN" as SportType;
      expect(getSportName(unknownSport)).toBe("UNKNOWN");
    });
  });

  describe("isSupportedSport", () => {
    it("should return true for valid sport types", () => {
      expect(isSupportedSport("PADEL")).toBe(true);
      expect(isSupportedSport("TENNIS")).toBe(true);
      expect(isSupportedSport("PICKLEBALL")).toBe(true);
      expect(isSupportedSport("SQUASH")).toBe(true);
      expect(isSupportedSport("BADMINTON")).toBe(true);
    });

    it("should return false for invalid sport types", () => {
      expect(isSupportedSport("FOOTBALL")).toBe(false);
      expect(isSupportedSport("basketball")).toBe(false);
      expect(isSupportedSport("")).toBe(false);
      expect(isSupportedSport(123)).toBe(false);
    });
  });

  describe("DEFAULT_SPORT_TYPE", () => {
    it("should be PADEL", () => {
      expect(DEFAULT_SPORT_TYPE).toBe(SportType.PADEL);
    });
  });

  describe("PADEL_CONFIG", () => {
    it("should have proper Padel configuration", () => {
      expect(PADEL_CONFIG.type).toBe(SportType.PADEL);
      expect(PADEL_CONFIG.name).toBe("Padel");
      expect(PADEL_CONFIG.defaultSlotDuration).toBe(90);
      expect(PADEL_CONFIG.availableSlotDurations).toContain(60);
      expect(PADEL_CONFIG.availableSlotDurations).toContain(90);
      expect(PADEL_CONFIG.availableSlotDurations).toContain(120);
      expect(PADEL_CONFIG.minPlayers).toBe(2);
      expect(PADEL_CONFIG.maxPlayers).toBe(4);
      expect(PADEL_CONFIG.typicalPlayers).toBe(4);
      expect(PADEL_CONFIG.coachingAvailable).toBe(true);
      expect(PADEL_CONFIG.requiresAdvanceBooking).toBe(false);
      expect(PADEL_CONFIG.maxAdvanceBookingDays).toBe(30);
      expect(PADEL_CONFIG.minBookingDuration).toBe(60);
      expect(PADEL_CONFIG.maxBookingDuration).toBe(180);
      expect(PADEL_CONFIG.defaultSurfaceTypes).toContain("Glass");
    });
  });

  describe("Sport configurations validity", () => {
    it("should have valid booking durations for all sports", () => {
      getAllSports().forEach((sport) => {
        expect(sport.minBookingDuration).toBeGreaterThan(0);
        expect(sport.maxBookingDuration).toBeGreaterThanOrEqual(
          sport.minBookingDuration
        );
        expect(sport.defaultSlotDuration).toBeGreaterThanOrEqual(
          sport.minBookingDuration
        );
        expect(sport.defaultSlotDuration).toBeLessThanOrEqual(
          sport.maxBookingDuration
        );
      });
    });

    it("should have valid player counts for all sports", () => {
      getAllSports().forEach((sport) => {
        expect(sport.minPlayers).toBeGreaterThan(0);
        expect(sport.maxPlayers).toBeGreaterThanOrEqual(sport.minPlayers);
        expect(sport.typicalPlayers).toBeGreaterThanOrEqual(sport.minPlayers);
        expect(sport.typicalPlayers).toBeLessThanOrEqual(sport.maxPlayers);
      });
    });

    it("should have valid advance booking settings for all sports", () => {
      getAllSports().forEach((sport) => {
        expect(sport.maxAdvanceBookingDays).toBeGreaterThan(0);
        expect(typeof sport.requiresAdvanceBooking).toBe("boolean");
      });
    });

    it("should have at least one available slot duration for all sports", () => {
      getAllSports().forEach((sport) => {
        expect(sport.availableSlotDurations.length).toBeGreaterThan(0);
        expect(sport.availableSlotDurations).toContain(
          sport.defaultSlotDuration
        );
      });
    });

    it("should have surface types defined for all sports", () => {
      getAllSports().forEach((sport) => {
        expect(sport.defaultSurfaceTypes).toBeDefined();
        expect(Array.isArray(sport.defaultSurfaceTypes)).toBe(true);
        expect(sport.defaultSurfaceTypes.length).toBeGreaterThan(0);
      });
    });
  });
});
