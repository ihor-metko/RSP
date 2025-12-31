/**
 * Dashboard Service
 *
 * Centralized service for dashboard data access.
 * This service provides reusable functions for fetching dashboard metrics
 * that can be used by both SSR and client-side code.
 *
 * All data fetching should go through this service to ensure consistency
 * and avoid duplication.
 */

import type { UnifiedDashboardResponse } from "@/app/api/admin/dashboard/route";

/**
 * Fetch unified dashboard data from API
 *
 * This function fetches role-appropriate dashboard data:
 * - Root Admin: Platform-wide statistics
 * - Organization Admin: Aggregated stats for all managed organizations
 * - Club Admin/Owner: Aggregated stats for all managed clubs
 *
 * @returns Promise<UnifiedDashboardResponse> Dashboard data based on user role
 * @throws Error if fetch fails or user is not authorized
 */
export async function fetchUnifiedDashboard(): Promise<UnifiedDashboardResponse> {
  const response = await fetch("/api/admin/dashboard", {
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
