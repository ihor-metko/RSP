/**
 * @jest-environment node
 * 
 * Tests for centralized date formatting utilities
 */

import {
  formatDateShort,
  formatDateLong,
  formatDateMedium,
  formatDateWithWeekday,
  formatDateTime,
  formatDateTimeLong,
  formatTime,
  formatWeekday,
  formatWeekdayShort,
  formatDateNoYear,
  formatDateSimple,
} from '@/utils/date';

describe('Date Formatting Utilities', () => {
  // Test date: April 2, 2024, 14:30:00 UTC
  const testDate = new Date('2024-04-02T14:30:00Z');
  const testDateString = '2024-04-02T14:30:00Z';

  describe('formatDateShort', () => {
    it('should format date in English short format', () => {
      const result = formatDateShort(testDate, 'en');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('apr');
    });

    it('should format date in Ukrainian short format', () => {
      const result = formatDateShort(testDate, 'uk');
      expect(result).toContain('2');
      // Ukrainian month abbreviation for April
      expect(result.toLowerCase()).toContain('кві');
    });

    it('should accept string input', () => {
      const result = formatDateShort(testDateString, 'en');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('apr');
    });

    it('should accept Date object input', () => {
      const result = formatDateShort(testDate, 'en');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('apr');
    });
  });

  describe('formatDateLong', () => {
    it('should format date in English long format', () => {
      const result = formatDateLong(testDate, 'en');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('april');
    });

    it('should format date in Ukrainian long format', () => {
      const result = formatDateLong(testDate, 'uk');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      // Ukrainian month name for April
      expect(result.toLowerCase()).toContain('кві');
    });

    it('should accept string input', () => {
      const result = formatDateLong(testDateString, 'en');
      expect(result).toContain('2024');
    });
  });

  describe('formatDateMedium', () => {
    it('should format date in English medium format', () => {
      const result = formatDateMedium(testDate, 'en');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('apr');
    });

    it('should format date in Ukrainian medium format', () => {
      const result = formatDateMedium(testDate, 'uk');
      expect(result).toContain('2024');
      expect(result).toContain('2');
    });
  });

  describe('formatDateWithWeekday', () => {
    it('should format date with weekday in English', () => {
      const result = formatDateWithWeekday(testDate, 'en');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('tue'); // April 2, 2024 is a Tuesday
    });

    it('should format date with weekday in Ukrainian', () => {
      const result = formatDateWithWeekday(testDate, 'uk');
      expect(result).toContain('2');
      // Ukrainian abbreviation for Tuesday
      expect(result.toLowerCase()).toContain('вт');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time in English', () => {
      const result = formatDateTime(testDate, 'en');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      // Time component (adjusted for timezone)
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should format date and time in Ukrainian', () => {
      const result = formatDateTime(testDate, 'uk');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should accept string input', () => {
      const result = formatDateTime(testDateString, 'en');
      expect(result).toContain('2024');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatDateTimeLong', () => {
    it('should format date and time with long month name in English', () => {
      const result = formatDateTimeLong(testDate, 'en');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('april');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should format date and time with long month name in Ukrainian', () => {
      const result = formatDateTimeLong(testDate, 'uk');
      expect(result).toContain('2024');
      expect(result).toContain('2');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatTime', () => {
    it('should format time only in English', () => {
      const result = formatTime(testDate, 'en');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should format time only in Ukrainian', () => {
      const result = formatTime(testDate, 'uk');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should accept string input', () => {
      const result = formatTime(testDateString, 'en');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should use 24-hour format', () => {
      const afternoonDate = new Date('2024-04-02T22:30:00Z');
      const result = formatTime(afternoonDate, 'en');
      // Should not contain AM/PM
      expect(result).not.toMatch(/am|pm/i);
    });
  });

  describe('formatWeekday', () => {
    it('should format weekday in English', () => {
      const result = formatWeekday(testDate, 'en');
      expect(result.toLowerCase()).toContain('tue');
    });

    it('should format weekday in Ukrainian', () => {
      const result = formatWeekday(testDate, 'uk');
      // Ukrainian for Tuesday
      expect(result.toLowerCase()).toContain('вів');
    });
  });

  describe('formatWeekdayShort', () => {
    it('should format short weekday in English', () => {
      const result = formatWeekdayShort(testDate, 'en');
      expect(result.toLowerCase()).toContain('tue');
    });

    it('should format short weekday in Ukrainian', () => {
      const result = formatWeekdayShort(testDate, 'uk');
      expect(result.toLowerCase()).toContain('вт');
    });
  });

  describe('formatDateNoYear', () => {
    it('should format date without year in English', () => {
      const result = formatDateNoYear(testDate, 'en');
      expect(result).not.toContain('2024');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('apr');
    });

    it('should format date without year in Ukrainian', () => {
      const result = formatDateNoYear(testDate, 'uk');
      expect(result).not.toContain('2024');
      expect(result).toContain('2');
    });
  });

  describe('formatDateSimple', () => {
    it('should format date in simple format for English', () => {
      const result = formatDateSimple(testDate, 'en');
      // Should contain date components
      expect(result).toContain('2');
      expect(result).toContain('2024');
    });

    it('should format date in simple format for Ukrainian', () => {
      const result = formatDateSimple(testDate, 'uk');
      expect(result).toContain('2');
      expect(result).toContain('2024');
    });
  });

  describe('Edge cases', () => {
    it('should handle beginning of year', () => {
      const newYearDate = new Date('2024-01-01T12:00:00Z');
      const result = formatDateShort(newYearDate, 'en');
      expect(result).toContain('1');
      expect(result.toLowerCase()).toContain('jan');
    });

    it('should handle end of year', () => {
      const newYearEve = new Date('2024-12-31T23:59:59Z');
      const result = formatDateShort(newYearEve, 'en');
      expect(result).toContain('31');
      expect(result.toLowerCase()).toContain('dec');
    });

    it('should handle leap year date', () => {
      const leapDay = new Date('2024-02-29T12:00:00Z');
      const result = formatDateShort(leapDay, 'en');
      expect(result).toContain('29');
      expect(result.toLowerCase()).toContain('feb');
    });

    it('should handle midnight', () => {
      const midnight = new Date('2024-04-02T00:00:00Z');
      const result = formatTime(midnight, 'en');
      // Time will vary based on timezone, just check it's a valid time format
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should handle different date string formats', () => {
      const isoDate = '2024-04-02';
      const result = formatDateShort(isoDate, 'en');
      expect(result).toContain('2');
      expect(result.toLowerCase()).toContain('apr');
    });
  });
});
