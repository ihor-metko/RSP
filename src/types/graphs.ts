/**
 * Types for dashboard graph data
 */

/**
 * Time range options for graph data
 */
export type TimeRange = "week" | "month";

/**
 * Data point for booking trends graph
 */
export interface BookingTrendDataPoint {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Number of bookings on this date */
  bookings: number;
  /** Optional label for the date (e.g., "Mon", "Jan 15") */
  label?: string;
}

/**
 * Data point for active users graph
 */
export interface ActiveUsersDataPoint {
  /** Date string in YYYY-MM-DD format */
  date: string;
  /** Number of active users on this date */
  users: number;
  /** Optional label for the date (e.g., "Mon", "Jan 15") */
  label?: string;
}

/**
 * Response from the dashboard graphs API
 */
export interface DashboardGraphsResponse {
  /** Booking trends data points */
  bookingTrends: BookingTrendDataPoint[];
  /** Active users data points */
  activeUsers: ActiveUsersDataPoint[];
  /** Time range of the data */
  timeRange: TimeRange;
}
