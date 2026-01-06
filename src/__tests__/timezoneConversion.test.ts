/**
 * @jest-environment node
 */
import {
  convertLocalToUTC,
  convertUTCToLocal,
  convertLocalDateTimeToUTC,
  formatUTCToLocal,
  getLocalDateString,
  getLocalTimeString,
  getTodayInClubTimezone,
  getCurrentTimeInClubTimezone,
} from '@/utils/timezoneConversion';

describe('Timezone Conversion Utilities', () => {
  describe('convertLocalDateTimeToUTC', () => {
    it('should convert Kyiv local time to UTC correctly (UTC+2 standard time)', () => {
      // January 6, 2026 at 10:00 in Kyiv (UTC+2 in winter)
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '10:00', 'Europe/Kyiv');
      
      // Should be 08:00 UTC (10:00 - 2 hours)
      expect(utcISO).toBe('2026-01-06T08:00:00.000Z');
    });

    it('should convert Kyiv local time to UTC correctly (UTC+3 DST)', () => {
      // July 6, 2026 at 10:00 in Kyiv (UTC+3 in summer due to DST)
      const utcISO = convertLocalDateTimeToUTC('2026-07-06', '10:00', 'Europe/Kyiv');
      
      // Should be 07:00 UTC (10:00 - 3 hours)
      expect(utcISO).toBe('2026-07-06T07:00:00.000Z');
    });

    it('should handle midnight correctly', () => {
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '00:00', 'Europe/Kyiv');
      
      // Midnight in Kyiv (UTC+2) is 22:00 previous day UTC
      expect(utcISO).toBe('2026-01-05T22:00:00.000Z');
    });

    it('should handle end of day correctly', () => {
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '23:59', 'Europe/Kyiv');
      
      // 23:59 in Kyiv (UTC+2) is 21:59 UTC
      expect(utcISO).toBe('2026-01-06T21:59:00.000Z');
    });

    it('should use default timezone when null is provided', () => {
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '10:00', null);
      
      // Should use DEFAULT_CLUB_TIMEZONE (Europe/Kyiv)
      expect(utcISO).toBe('2026-01-06T08:00:00.000Z');
    });

    it('should use default timezone when undefined is provided', () => {
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '10:00', undefined);
      
      // Should use DEFAULT_CLUB_TIMEZONE (Europe/Kyiv)
      expect(utcISO).toBe('2026-01-06T08:00:00.000Z');
    });

    it('should work with different timezones', () => {
      // New York is UTC-5 in winter
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '10:00', 'America/New_York');
      
      // Should be 15:00 UTC (10:00 + 5 hours)
      expect(utcISO).toBe('2026-01-06T15:00:00.000Z');
    });

    it('should work with Tokyo timezone', () => {
      // Tokyo is UTC+9
      const utcISO = convertLocalDateTimeToUTC('2026-01-06', '10:00', 'Asia/Tokyo');
      
      // Should be 01:00 UTC (10:00 - 9 hours)
      expect(utcISO).toBe('2026-01-06T01:00:00.000Z');
    });
  });

  describe('convertLocalToUTC', () => {
    it('should convert local Date to UTC Date', () => {
      // Create a date representing Jan 6, 2026 10:00 in local terms
      const localDate = new Date(2026, 0, 6, 10, 0, 0);
      const utcDate = convertLocalToUTC(localDate, 'Europe/Kyiv');
      
      // Should be 08:00 UTC
      expect(utcDate.toISOString()).toBe('2026-01-06T08:00:00.000Z');
    });
  });

  describe('convertUTCToLocal', () => {
    it('should convert UTC Date to local Date in Kyiv timezone', () => {
      const utcDate = new Date('2026-01-06T08:00:00.000Z');
      const localDate = convertUTCToLocal(utcDate, 'Europe/Kyiv');
      
      // The returned date should represent 10:00 in Kyiv
      // When we get the hours in the "local" representation, it should be 10
      const localDateStr = localDate.toISOString();
      // After conversion, the Date object's UTC values represent the local time
      expect(localDate.getUTCHours()).toBe(10);
      expect(localDate.getUTCMinutes()).toBe(0);
    });
  });

  describe('formatUTCToLocal', () => {
    it('should format UTC datetime to local time string', () => {
      const utcDate = new Date('2026-01-06T08:00:00.000Z');
      const formatted = formatUTCToLocal(utcDate, 'Europe/Kyiv', 'yyyy-MM-dd HH:mm');
      
      expect(formatted).toBe('2026-01-06 10:00');
    });

    it('should work with ISO string input', () => {
      const formatted = formatUTCToLocal('2026-01-06T08:00:00.000Z', 'Europe/Kyiv', 'yyyy-MM-dd HH:mm');
      
      expect(formatted).toBe('2026-01-06 10:00');
    });

    it('should use default format pattern when not specified', () => {
      const formatted = formatUTCToLocal('2026-01-06T08:00:00.000Z', 'Europe/Kyiv');
      
      expect(formatted).toBe('2026-01-06 10:00');
    });

    it('should support custom format patterns', () => {
      const formatted = formatUTCToLocal('2026-01-06T08:00:00.000Z', 'Europe/Kyiv', 'HH:mm');
      
      expect(formatted).toBe('10:00');
    });
  });

  describe('getLocalDateString', () => {
    it('should extract date string in local timezone', () => {
      const dateStr = getLocalDateString('2026-01-06T08:00:00.000Z', 'Europe/Kyiv');
      
      expect(dateStr).toBe('2026-01-06');
    });

    it('should handle date boundary correctly (midnight UTC becomes previous day in earlier timezone)', () => {
      // 22:00 UTC on Jan 5 is 00:00 Jan 6 in Kyiv (UTC+2)
      const dateStr = getLocalDateString('2026-01-05T22:00:00.000Z', 'Europe/Kyiv');
      
      expect(dateStr).toBe('2026-01-06');
    });

    it('should handle date boundary correctly (late night local becomes next day in UTC)', () => {
      // 21:59 UTC on Jan 6 is 23:59 Jan 6 in Kyiv (UTC+2)
      const dateStr = getLocalDateString('2026-01-06T21:59:00.000Z', 'Europe/Kyiv');
      
      expect(dateStr).toBe('2026-01-06');
    });
  });

  describe('getLocalTimeString', () => {
    it('should extract time string in local timezone', () => {
      const timeStr = getLocalTimeString('2026-01-06T08:00:00.000Z', 'Europe/Kyiv');
      
      expect(timeStr).toBe('10:00');
    });

    it('should handle midnight UTC correctly', () => {
      // 00:00 UTC is 02:00 in Kyiv (UTC+2)
      const timeStr = getLocalTimeString('2026-01-06T00:00:00.000Z', 'Europe/Kyiv');
      
      expect(timeStr).toBe('02:00');
    });

    it('should handle end of day correctly', () => {
      // 21:59 UTC is 23:59 in Kyiv (UTC+2)
      const timeStr = getLocalTimeString('2026-01-06T21:59:00.000Z', 'Europe/Kyiv');
      
      expect(timeStr).toBe('23:59');
    });
  });

  describe('getTodayInClubTimezone', () => {
    it('should return today\'s date in club timezone format', () => {
      const todayStr = getTodayInClubTimezone('Europe/Kyiv');
      
      // Should be in YYYY-MM-DD format
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should use default timezone when null is provided', () => {
      const todayStr = getTodayInClubTimezone(null);
      
      // Should be in YYYY-MM-DD format
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getCurrentTimeInClubTimezone', () => {
    it('should return current time as Date object in club timezone', () => {
      const currentTime = getCurrentTimeInClubTimezone('Europe/Kyiv');
      
      // Should be a valid Date object
      expect(currentTime).toBeInstanceOf(Date);
      expect(currentTime.getTime()).toBeGreaterThan(0);
    });
  });

  describe('DST handling', () => {
    it('should correctly handle DST transition in spring (Kyiv switches from UTC+2 to UTC+3)', () => {
      // Last Sunday of March 2026 - DST starts
      // Before DST: UTC+2
      const beforeDST = convertLocalDateTimeToUTC('2026-03-28', '10:00', 'Europe/Kyiv');
      expect(beforeDST).toBe('2026-03-28T08:00:00.000Z'); // UTC+2
      
      // After DST: UTC+3
      const afterDST = convertLocalDateTimeToUTC('2026-03-30', '10:00', 'Europe/Kyiv');
      expect(afterDST).toBe('2026-03-30T07:00:00.000Z'); // UTC+3
    });

    it('should correctly handle DST transition in fall (Kyiv switches from UTC+3 to UTC+2)', () => {
      // Last Sunday of October 2026 - DST ends
      // Before DST ends: UTC+3
      const beforeDST = convertLocalDateTimeToUTC('2026-10-24', '10:00', 'Europe/Kyiv');
      expect(beforeDST).toBe('2026-10-24T07:00:00.000Z'); // UTC+3
      
      // After DST ends: UTC+2
      const afterDST = convertLocalDateTimeToUTC('2026-10-26', '10:00', 'Europe/Kyiv');
      expect(afterDST).toBe('2026-10-26T08:00:00.000Z'); // UTC+2
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain time accuracy in round-trip conversions', () => {
      const originalDate = '2026-01-06';
      const originalTime = '14:30';
      const timezone = 'Europe/Kyiv';
      
      // Local -> UTC -> Local
      const utcISO = convertLocalDateTimeToUTC(originalDate, originalTime, timezone);
      const localDate = getLocalDateString(utcISO, timezone);
      const localTime = getLocalTimeString(utcISO, timezone);
      
      expect(localDate).toBe(originalDate);
      expect(localTime).toBe(originalTime);
    });

    it('should handle round-trip for multiple timezones', () => {
      const testCases = [
        { date: '2026-01-06', time: '10:00', timezone: 'Europe/Kyiv' },
        { date: '2026-01-06', time: '10:00', timezone: 'America/New_York' },
        { date: '2026-01-06', time: '10:00', timezone: 'Asia/Tokyo' },
        { date: '2026-01-06', time: '10:00', timezone: 'UTC' },
      ];
      
      testCases.forEach(({ date, time, timezone }) => {
        const utcISO = convertLocalDateTimeToUTC(date, time, timezone);
        const localDate = getLocalDateString(utcISO, timezone);
        const localTime = getLocalTimeString(utcISO, timezone);
        
        expect(localDate).toBe(date);
        expect(localTime).toBe(time);
      });
    });
  });
});
