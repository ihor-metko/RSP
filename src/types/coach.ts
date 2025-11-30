/**
 * Type definitions for Coach Availability
 */

/**
 * Day of week constants (0-6, Sunday to Saturday)
 */
export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Coach Weekly Availability Slot
 */
export interface CoachWeeklyAvailabilitySlot {
  id: string;
  coachId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "HH:mm" format
  endTime: string;   // "HH:mm" format
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a new availability slot
 */
export interface CreateAvailabilitySlotRequest {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string;
}

/**
 * Request body for updating an availability slot
 */
export interface UpdateAvailabilitySlotRequest {
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  note?: string | null;
}

/**
 * Response for availability endpoints
 */
export interface AvailabilityResponse {
  slots: CoachWeeklyAvailabilitySlot[];
}

/**
 * Coach Time Off entry
 */
export interface CoachTimeOffEntry {
  id: string;
  coachId: string;
  date: string;       // "YYYY-MM-DD" format
  startTime?: string | null; // "HH:mm" format, null for full-day off
  endTime?: string | null;   // "HH:mm" format, null for full-day off
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request body for creating a new time off entry
 */
export interface CreateTimeOffRequest {
  date: string;         // "YYYY-MM-DD" format
  startTime?: string;   // "HH:mm" format, optional for full-day off
  endTime?: string;     // "HH:mm" format, optional for full-day off
  reason?: string;
}

/**
 * Request body for updating a time off entry
 */
export interface UpdateTimeOffRequest {
  date?: string;         // "YYYY-MM-DD" format
  startTime?: string | null;   // "HH:mm" format
  endTime?: string | null;     // "HH:mm" format
  reason?: string | null;
}

/**
 * Response for time off endpoints
 */
export interface TimeOffResponse {
  timeOffs: CoachTimeOffEntry[];
}
