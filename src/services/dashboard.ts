/**
 * Dashboard Service
 * 
 * Centralized service for dashboard data access and aggregation.
 * This service provides reusable functions for fetching dashboard metrics
 * that can be used by both SSR and client-side code.
 * 
 * All data fetching should go through this service to ensure consistency
 * and avoid duplication.
 */

import type { UnifiedDashboardResponse } from "@/app/api/admin/unified-dashboard/route";

/**
 * Dashboard metrics for a single entity (org or club)
 */
export interface DashboardMetrics {
  clubsCount?: number;
  courtsCount: number;
  bookingsToday: number;
  activeBookings: number;
  pastBookings: number;
  clubAdminsCount?: number;
}

/**
 * Fetch unified dashboard data from API
 * 
 * This function fetches role-appropriate dashboard data:
 * - Root Admin: Platform-wide statistics
 * - Organization Admin: Metrics for all managed organizations
 * - Club Admin: Metrics for all managed clubs
 * 
 * @returns Promise<UnifiedDashboardResponse> Dashboard data based on user role
 * @throws Error if fetch fails or user is not authorized
 */
export async function fetchUnifiedDashboard(): Promise<UnifiedDashboardResponse> {
  const response = await fetch("/api/admin/unified-dashboard", {
    cache: "no-store", // Always fetch fresh data for SSR
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized");
    }
    const data = await response.json().catch(() => ({ error: "Failed to fetch dashboard" }));
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Aggregate metrics from multiple organizations
 * 
 * @param organizations Array of organization dashboard data
 * @returns Aggregated metrics across all organizations
 */
export function aggregateOrgMetrics(
  organizations: Array<{
    clubsCount: number;
    courtsCount: number;
    bookingsToday: number;
    activeBookings: number;
    pastBookings: number;
    clubAdminsCount: number;
  }>
): DashboardMetrics {
  return organizations.reduce(
    (acc, org) => ({
      clubsCount: (acc.clubsCount || 0) + org.clubsCount,
      courtsCount: acc.courtsCount + org.courtsCount,
      bookingsToday: acc.bookingsToday + org.bookingsToday,
      activeBookings: acc.activeBookings + org.activeBookings,
      pastBookings: acc.pastBookings + org.pastBookings,
      clubAdminsCount: (acc.clubAdminsCount || 0) + org.clubAdminsCount,
    }),
    {
      clubsCount: 0,
      courtsCount: 0,
      bookingsToday: 0,
      activeBookings: 0,
      pastBookings: 0,
      clubAdminsCount: 0,
    }
  );
}

/**
 * Aggregate metrics from multiple clubs
 * 
 * @param clubs Array of club dashboard data
 * @returns Aggregated metrics across all clubs
 */
export function aggregateClubMetrics(
  clubs: Array<{
    courtsCount: number;
    bookingsToday: number;
    activeBookings: number;
    pastBookings: number;
  }>
): Omit<DashboardMetrics, "clubsCount" | "clubAdminsCount"> {
  return clubs.reduce(
    (acc, club) => ({
      courtsCount: acc.courtsCount + club.courtsCount,
      bookingsToday: acc.bookingsToday + club.bookingsToday,
      activeBookings: acc.activeBookings + club.activeBookings,
      pastBookings: acc.pastBookings + club.pastBookings,
    }),
    {
      courtsCount: 0,
      bookingsToday: 0,
      activeBookings: 0,
      pastBookings: 0,
    }
  );
}
