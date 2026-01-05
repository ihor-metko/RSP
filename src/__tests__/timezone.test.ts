/**
 * @jest-environment node
 */
import {
  DEFAULT_CLUB_TIMEZONE,
  PLATFORM_TIMEZONE,
  isValidIANATimezone,
  getClubTimezone,
} from "@/constants/timezone";

describe("Timezone Constants", () => {
  describe("DEFAULT_CLUB_TIMEZONE", () => {
    it("should be set to Europe/Kyiv", () => {
      expect(DEFAULT_CLUB_TIMEZONE).toBe("Europe/Kyiv");
    });

    it("should be a valid IANA timezone", () => {
      expect(isValidIANATimezone(DEFAULT_CLUB_TIMEZONE)).toBe(true);
    });
  });

  describe("PLATFORM_TIMEZONE", () => {
    it("should match DEFAULT_CLUB_TIMEZONE for backward compatibility", () => {
      expect(PLATFORM_TIMEZONE).toBe(DEFAULT_CLUB_TIMEZONE);
    });
  });

  describe("isValidIANATimezone", () => {
    it("should validate correct IANA timezones", () => {
      expect(isValidIANATimezone("Europe/Kyiv")).toBe(true);
      expect(isValidIANATimezone("America/New_York")).toBe(true);
      expect(isValidIANATimezone("Asia/Tokyo")).toBe(true);
      expect(isValidIANATimezone("UTC")).toBe(true);
    });

    it("should reject invalid timezones", () => {
      expect(isValidIANATimezone("Invalid/Timezone")).toBe(false);
      expect(isValidIANATimezone("UTC+2")).toBe(false);
      expect(isValidIANATimezone("GMT+2")).toBe(false);
      expect(isValidIANATimezone("")).toBe(false);
    });
  });

  describe("getClubTimezone", () => {
    it("should return club timezone if valid", () => {
      expect(getClubTimezone("America/New_York")).toBe("America/New_York");
      expect(getClubTimezone("Asia/Tokyo")).toBe("Asia/Tokyo");
    });

    it("should return default for null/undefined", () => {
      expect(getClubTimezone(null)).toBe(DEFAULT_CLUB_TIMEZONE);
      expect(getClubTimezone(undefined)).toBe(DEFAULT_CLUB_TIMEZONE);
    });

    it("should return default for invalid timezone", () => {
      // Set NODE_ENV to development to enable logging
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(getClubTimezone("Invalid/Timezone")).toBe(DEFAULT_CLUB_TIMEZONE);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid club timezone")
      );
      
      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it("should return default for offset-based timezones", () => {
      // Set NODE_ENV to development to enable logging
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(getClubTimezone("UTC+2")).toBe(DEFAULT_CLUB_TIMEZONE);
      expect(getClubTimezone("GMT+2")).toBe(DEFAULT_CLUB_TIMEZONE);
      
      consoleWarnSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
