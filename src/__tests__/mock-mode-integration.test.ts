/**
 * @jest-environment node
 */
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
// Integration tests for mock mode API endpoints
import { mockGetBookings, mockGetClubs, mockCreateBooking } from "@/services/mockApiHandlers";
import { initializeMockData, getMockUsers, getMockCourts } from "@/services/mockDb";

describe("Mock Mode Integration Tests", () => {
  beforeEach(() => {
    initializeMockData();
  });

  describe("Bookings API", () => {
    it("should return paginated bookings for root admin", async () => {
      const result = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          page: 1,
          perPage: 10,
        },
      });

      expect(result.bookings).toBeDefined();
      expect(Array.isArray(result.bookings)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.perPage).toBe(10);
      expect(result.totalPages).toBeGreaterThanOrEqual(1);
    });

    it("should filter bookings by club for club admin", async () => {
      const result = await mockGetBookings({
        adminType: "club_admin",
        managedIds: ["club-1"],
        filters: {
          page: 1,
          perPage: 10,
        },
      });

      // All bookings should be for courts in club-1
      result.bookings.forEach((booking) => {
        expect(booking.clubId).toBe("club-1");
      });
    });

    it("should filter bookings by organization for org admin", async () => {
      const result = await mockGetBookings({
        adminType: "organization_admin",
        managedIds: ["org-1"],
        filters: {
          page: 1,
          perPage: 10,
        },
      });

      // All bookings should be for clubs in org-1
      result.bookings.forEach((booking) => {
        expect(["club-1", "club-2"]).toContain(booking.clubId);
      });
    });

    it("should filter bookings by date range", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const result = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          dateFrom: dateStr,
          dateTo: dateStr,
          page: 1,
          perPage: 10,
        },
      });

      result.bookings.forEach((booking) => {
        const bookingDate = new Date(booking.start).toISOString().split("T")[0];
        expect(bookingDate).toBe(dateStr);
      });
    });

    it("should filter bookings by status", async () => {
      const result = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          status: "paid",
          page: 1,
          perPage: 10,
        },
      });

      result.bookings.forEach((booking) => {
        expect(booking.status).toBe("paid");
      });
    });

    it("should create a new booking", async () => {
      const users = getMockUsers();
      const courts = getMockCourts();

      const newBooking = await mockCreateBooking({
        userId: users[0].id,
        courtId: courts[0].id,
        start: new Date("2025-02-01T10:00:00Z"),
        end: new Date("2025-02-01T11:00:00Z"),
        price: 5000,
        status: "paid",
      });

      expect(newBooking).toBeDefined();
      expect(newBooking.id).toBeTruthy();
      expect(newBooking.userId).toBe(users[0].id);
      expect(newBooking.courtId).toBe(courts[0].id);
      expect(newBooking.status).toBe("paid");
    });
  });

  describe("Clubs API", () => {
    it("should return all clubs for root admin", async () => {
      const clubs = await mockGetClubs({
        adminType: "root_admin",
        managedIds: [],
      });

      expect(Array.isArray(clubs)).toBe(true);
      expect(clubs.length).toBeGreaterThan(0);
      expect(clubs[0]).toHaveProperty("id");
      expect(clubs[0]).toHaveProperty("name");
      expect(clubs[0]).toHaveProperty("courtCount");
      expect(clubs[0]).toHaveProperty("bookingCount");
    });

    it("should return only managed clubs for club admin", async () => {
      const clubs = await mockGetClubs({
        adminType: "club_admin",
        managedIds: ["club-3"],
      });

      expect(clubs.length).toBe(1);
      expect(clubs[0].id).toBe("club-3");
    });

    it("should return clubs in managed organizations for org admin", async () => {
      const clubs = await mockGetClubs({
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      // org-1 has club-1 and club-2
      expect(clubs.length).toBe(2);
      expect(clubs.every((c) => c.organization?.id === "org-1")).toBe(true);
    });

    it("should include court counts in club data", async () => {
      const clubs = await mockGetClubs({
        adminType: "root_admin",
        managedIds: [],
      });

      const clubWithCourts = clubs.find((c) => c.courtCount > 0);
      expect(clubWithCourts).toBeDefined();
      expect(clubWithCourts!.indoorCount + clubWithCourts!.outdoorCount).toBe(
        clubWithCourts!.courtCount
      );
    });
  });

  describe("Available Courts", () => {
    it("should identify available courts correctly", async () => {
      // This test simulates the available courts logic
      const courts = getMockCourts().filter((c) => c.clubId === "club-1");
      expect(courts.length).toBeGreaterThan(0);

      // Check that courts have the necessary properties
      courts.forEach((court) => {
        expect(court).toHaveProperty("id");
        expect(court).toHaveProperty("name");
        expect(court).toHaveProperty("indoor");
        expect(court).toHaveProperty("defaultPriceCents");
      });
    });
  });

  describe("Role-Based Access", () => {
    it("should respect club admin boundaries", async () => {
      const result = await mockGetBookings({
        adminType: "club_admin",
        managedIds: ["club-1"],
        filters: {
          clubId: "club-2", // Try to access different club
          page: 1,
          perPage: 10,
        },
      });

      // Should return empty as club admin can't access club-2
      expect(result.bookings.length).toBe(0);
    });

    it("should allow root admin to access all data", async () => {
      const bookings = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          page: 1,
          perPage: 100,
        },
      });

      const clubs = await mockGetClubs({
        adminType: "root_admin",
        managedIds: [],
      });

      expect(bookings.total).toBeGreaterThan(0);
      expect(clubs.length).toBeGreaterThan(0);
    });

    it("should restrict org admin to their organizations", async () => {
      // Org admin for org-2 should only see club-3
      const clubs = await mockGetClubs({
        adminType: "organization_admin",
        managedIds: ["org-2"],
      });

      expect(clubs.length).toBe(1);
      expect(clubs[0].id).toBe("club-3");
      expect(clubs[0].organization?.id).toBe("org-2");
    });
  });

  describe("Booking Scenarios", () => {
    it("should support past, present, and future bookings", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pastBookings = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          dateTo: yesterday.toISOString().split("T")[0],
          page: 1,
          perPage: 100,
        },
      });

      const futureBookings = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          dateFrom: tomorrow.toISOString().split("T")[0],
          page: 1,
          perPage: 100,
        },
      });

      expect(pastBookings.total).toBeGreaterThan(0);
      expect(futureBookings.total).toBeGreaterThan(0);
    });

    it("should support different booking statuses", async () => {
      const allBookings = await mockGetBookings({
        adminType: "root_admin",
        managedIds: [],
        filters: {
          page: 1,
          perPage: 100,
        },
      });

      const statuses = new Set(allBookings.bookings.map((b) => b.status));
      expect(statuses.size).toBeGreaterThan(1); // Should have multiple statuses
    });
  });
});
