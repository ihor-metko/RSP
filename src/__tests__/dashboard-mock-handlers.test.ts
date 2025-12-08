/**
 * @jest-environment node
 */
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// Integration tests for dashboard mock mode API handlers
import {
  mockGetUnifiedDashboard,
  mockGetRegisteredUsers,
  mockGetDashboardGraphs,
} from "@/services/mockApiHandlers";
import { initializeMockData } from "@/services/mockDb";

describe("Dashboard Mock Handlers", () => {
  beforeEach(() => {
    initializeMockData();
  });

  describe("Unified Dashboard", () => {
    it("should return platform statistics for root admin", async () => {
      const result = await mockGetUnifiedDashboard({
        adminType: "root_admin",
        managedIds: [],
      });

      expect(result.adminType).toBe("root_admin");
      expect(result.isRoot).toBe(true);
      expect(result.platformStats).toBeDefined();
      expect(result.platformStats?.totalOrganizations).toBeGreaterThan(0);
      expect(result.platformStats?.totalClubs).toBeGreaterThan(0);
      expect(result.platformStats?.totalUsers).toBeGreaterThan(0);
      expect(result.platformStats?.activeBookings).toBeGreaterThanOrEqual(0);
      expect(result.platformStats?.activeBookingsCount).toBeGreaterThanOrEqual(0);
      expect(result.platformStats?.pastBookingsCount).toBeGreaterThanOrEqual(0);
    });

    it("should return organization metrics for org admin", async () => {
      const result = await mockGetUnifiedDashboard({
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      expect(result.adminType).toBe("organization_admin");
      expect(result.isRoot).toBe(false);
      expect(result.organizations).toBeDefined();
      expect(Array.isArray(result.organizations)).toBe(true);
      expect(result.organizations!.length).toBe(1);

      const org = result.organizations![0];
      expect(org.id).toBe("org-1");
      expect(org.name).toBeTruthy();
      expect(org.slug).toBeTruthy();
      expect(org.clubsCount).toBeGreaterThanOrEqual(0);
      expect(org.courtsCount).toBeGreaterThanOrEqual(0);
      expect(org.bookingsToday).toBeGreaterThanOrEqual(0);
      expect(org.clubAdminsCount).toBeGreaterThanOrEqual(0);
      expect(org.activeBookings).toBeGreaterThanOrEqual(0);
      expect(org.pastBookings).toBeGreaterThanOrEqual(0);
    });

    it("should return club metrics for club admin", async () => {
      const result = await mockGetUnifiedDashboard({
        adminType: "club_admin",
        managedIds: ["club-1"],
      });

      expect(result.adminType).toBe("club_admin");
      expect(result.isRoot).toBe(false);
      expect(result.clubs).toBeDefined();
      expect(Array.isArray(result.clubs)).toBe(true);
      expect(result.clubs!.length).toBe(1);

      const club = result.clubs![0];
      expect(club.id).toBe("club-1");
      expect(club.name).toBeTruthy();
      expect(club.slug).toBeTruthy();
      expect(club.courtsCount).toBeGreaterThanOrEqual(0);
      expect(club.bookingsToday).toBeGreaterThanOrEqual(0);
      expect(club.activeBookings).toBeGreaterThanOrEqual(0);
      expect(club.pastBookings).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple organizations for org admin", async () => {
      const result = await mockGetUnifiedDashboard({
        adminType: "organization_admin",
        managedIds: ["org-1", "org-2"],
      });

      expect(result.organizations).toBeDefined();
      expect(result.organizations!.length).toBe(2);
      const orgIds = result.organizations!.map(o => o.id);
      expect(orgIds).toContain("org-1");
      expect(orgIds).toContain("org-2");
    });

    it("should handle multiple clubs for club admin", async () => {
      const result = await mockGetUnifiedDashboard({
        adminType: "club_admin",
        managedIds: ["club-1", "club-2"],
      });

      expect(result.clubs).toBeDefined();
      expect(result.clubs!.length).toBe(2);
      const clubIds = result.clubs!.map(c => c.id);
      expect(clubIds).toContain("club-1");
      expect(clubIds).toContain("club-2");
    });

    it("should not return archived organizations in count", async () => {
      const result = await mockGetUnifiedDashboard({
        adminType: "root_admin",
        managedIds: [],
      });

      // There are 3 orgs total, but 1 is archived
      expect(result.platformStats?.totalOrganizations).toBe(2);
    });
  });

  describe("Registered Users", () => {
    it("should return total users excluding admins", async () => {
      const result = await mockGetRegisteredUsers();

      expect(result.totalUsers).toBeDefined();
      expect(typeof result.totalUsers).toBe("number");
      expect(result.totalUsers).toBeGreaterThanOrEqual(0);
      // Should exclude root admin (user-1), org admin (user-2), club admin (user-3)
      // So we should have 2 regular users (user-4, user-5)
      expect(result.totalUsers).toBe(2);
    });

    it("should return 30 days of trend data", async () => {
      const result = await mockGetRegisteredUsers();

      expect(result.trend).toBeDefined();
      expect(Array.isArray(result.trend)).toBe(true);
      expect(result.trend.length).toBe(30);

      result.trend.forEach((point) => {
        expect(point.date).toBeTruthy();
        expect(typeof point.count).toBe("number");
        expect(point.count).toBeGreaterThanOrEqual(0);
        // Validate date format (YYYY-MM-DD)
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it("should return trend data in chronological order", async () => {
      const result = await mockGetRegisteredUsers();

      for (let i = 1; i < result.trend.length; i++) {
        const prevDate = new Date(result.trend[i - 1].date);
        const currDate = new Date(result.trend[i].date);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });
  });

  describe("Dashboard Graphs", () => {
    it("should return booking trends and active users for week", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "root_admin",
        managedIds: [],
        timeRange: "week",
      });

      expect(result.timeRange).toBe("week");
      expect(result.bookingTrends).toBeDefined();
      expect(Array.isArray(result.bookingTrends)).toBe(true);
      expect(result.bookingTrends.length).toBe(7);
      expect(result.activeUsers).toBeDefined();
      expect(Array.isArray(result.activeUsers)).toBe(true);
      expect(result.activeUsers.length).toBe(7);
    });

    it("should return booking trends and active users for month", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "root_admin",
        managedIds: [],
        timeRange: "month",
      });

      expect(result.timeRange).toBe("month");
      expect(result.bookingTrends.length).toBe(30);
      expect(result.activeUsers.length).toBe(30);
    });

    it("should format booking trends data correctly", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "root_admin",
        managedIds: [],
        timeRange: "week",
      });

      result.bookingTrends.forEach((point) => {
        expect(point.date).toBeTruthy();
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.bookings).toBe("number");
        expect(point.bookings).toBeGreaterThanOrEqual(0);
        expect(point.label).toBeTruthy();
      });
    });

    it("should format active users data correctly", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "root_admin",
        managedIds: [],
        timeRange: "week",
      });

      result.activeUsers.forEach((point) => {
        expect(point.date).toBeTruthy();
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.users).toBe("number");
        expect(point.users).toBeGreaterThanOrEqual(0);
        expect(point.label).toBeTruthy();
      });
    });

    it("should use short day names for week view", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "root_admin",
        managedIds: [],
        timeRange: "week",
      });

      // Labels should be day names like "Mon", "Tue", etc.
      const validDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      result.bookingTrends.forEach((point) => {
        expect(validDayNames).toContain(point.label);
      });
    });

    it("should filter data for organization admin", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "organization_admin",
        managedIds: ["org-1"],
        timeRange: "week",
      });

      expect(result.bookingTrends).toBeDefined();
      expect(result.activeUsers).toBeDefined();
      // Data should be filtered to org-1 bookings only
      expect(Array.isArray(result.bookingTrends)).toBe(true);
      expect(Array.isArray(result.activeUsers)).toBe(true);
    });

    it("should filter data for club admin", async () => {
      const result = await mockGetDashboardGraphs({
        adminType: "club_admin",
        managedIds: ["club-1"],
        timeRange: "week",
      });

      expect(result.bookingTrends).toBeDefined();
      expect(result.activeUsers).toBeDefined();
      // Data should be filtered to club-1 bookings only
      expect(Array.isArray(result.bookingTrends)).toBe(true);
      expect(Array.isArray(result.activeUsers)).toBe(true);
    });
  });
});
