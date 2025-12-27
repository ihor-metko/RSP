/**
 * Type definitions for club statistics
 */

/**
 * Daily statistics for club occupancy
 */
export interface ClubDailyStatistics {
  id: string;
  clubId: string;
  date: string; // ISO date string
  bookedSlots: number;
  totalSlots: number;
  occupancyPercentage: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Monthly statistics for club occupancy
 */
export interface ClubMonthlyStatistics {
  id: string;
  clubId: string;
  month: number; // 1-12
  year: number;
  averageOccupancy: number;
  previousMonthOccupancy: number | null;
  occupancyChangePercent: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating daily statistics
 */
export interface CreateDailyStatisticsPayload {
  clubId: string;
  date: string; // ISO date string
  bookedSlots: number;
  totalSlots: number;
}

/**
 * Payload for creating monthly statistics
 */
export interface CreateMonthlyStatisticsPayload {
  clubId: string;
  month: number; // 1-12
  year: number;
  averageOccupancy: number;
  previousMonthOccupancy?: number | null;
}

/**
 * Payload for updating daily statistics
 */
export interface UpdateDailyStatisticsPayload {
  bookedSlots?: number;
  totalSlots?: number;
}

/**
 * Payload for updating monthly statistics
 */
export interface UpdateMonthlyStatisticsPayload {
  averageOccupancy?: number;
  previousMonthOccupancy?: number | null;
}
