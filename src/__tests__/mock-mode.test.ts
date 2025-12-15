/**
 * @jest-environment node
 */
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import {
  initializeMockData,
  getMockUsers,
  getMockClubs,
  getMockCourts,
  getMockBookings,
  getMockOrganizations,
  createMockBooking,
  cancelMockBooking,
  createMockCourt,
  findUserById,
  findClubById,
  isMockMode,
} from "@/services/mockDb";
import { SportType } from "@/constants/sports";

describe("Mock Data Mode", () => {
  beforeEach(() => {
    // Reset mock data before each test
    initializeMockData();
  });

  describe("isMockMode", () => {
    it("should return false by default", () => {
      expect(isMockMode()).toBe(false);
    });

    it("should return true when USE_MOCK_DATA is set", async () => {
      const originalEnv = process.env.USE_MOCK_DATA;
      process.env.USE_MOCK_DATA = "true";
      
      // Need to re-import to pick up env change
      jest.resetModules();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { isMockMode: isMockModeReloaded } = require("@/services/mockDb");
      
      expect(isMockModeReloaded()).toBe(true);
      
      // Restore
      process.env.USE_MOCK_DATA = originalEnv;
    });
  });

  describe("Mock Data Initialization", () => {
    it("should initialize users", () => {
      const users = getMockUsers();
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty("id");
      expect(users[0]).toHaveProperty("email");
      expect(users[0]).toHaveProperty("name");
    });

    it("should initialize organizations", () => {
      const orgs = getMockOrganizations();
      expect(orgs.length).toBeGreaterThan(0);
      expect(orgs[0]).toHaveProperty("id");
      expect(orgs[0]).toHaveProperty("name");
      expect(orgs[0]).toHaveProperty("slug");
    });

    it("should initialize clubs", () => {
      const clubs = getMockClubs();
      expect(clubs.length).toBeGreaterThan(0);
      expect(clubs[0]).toHaveProperty("id");
      expect(clubs[0]).toHaveProperty("name");
      expect(clubs[0]).toHaveProperty("location");
    });

    it("should initialize courts", () => {
      const courts = getMockCourts();
      expect(courts.length).toBeGreaterThan(0);
      expect(courts[0]).toHaveProperty("id");
      expect(courts[0]).toHaveProperty("name");
      expect(courts[0]).toHaveProperty("clubId");
    });

    it("should initialize bookings", () => {
      const bookings = getMockBookings();
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0]).toHaveProperty("id");
      expect(bookings[0]).toHaveProperty("courtId");
      expect(bookings[0]).toHaveProperty("userId");
      expect(bookings[0]).toHaveProperty("start");
      expect(bookings[0]).toHaveProperty("end");
    });
  });

  describe("Mock Data Relationships", () => {
    it("should have clubs with valid organizationIds", () => {
      const clubs = getMockClubs();
      const orgs = getMockOrganizations();
      const orgIds = orgs.map((o) => o.id);

      const clubsWithOrgs = clubs.filter((c) => c.organizationId);
      clubsWithOrgs.forEach((club) => {
        expect(orgIds).toContain(club.organizationId);
      });
    });

    it("should have courts with valid clubIds", () => {
      const courts = getMockCourts();
      const clubs = getMockClubs();
      const clubIds = clubs.map((c) => c.id);

      courts.forEach((court) => {
        expect(clubIds).toContain(court.clubId);
      });
    });

    it("should have bookings with valid courtIds and userIds", () => {
      const bookings = getMockBookings();
      const courts = getMockCourts();
      const users = getMockUsers();
      const courtIds = courts.map((c) => c.id);
      const userIds = users.map((u) => u.id);

      bookings.forEach((booking) => {
        expect(courtIds).toContain(booking.courtId);
        expect(userIds).toContain(booking.userId);
      });
    });
  });

  describe("CRUD Helpers", () => {
    it("should find user by id", () => {
      const users = getMockUsers();
      const user = findUserById(users[0].id);
      expect(user).toBeDefined();
      expect(user?.id).toBe(users[0].id);
    });

    it("should return undefined for non-existent user", () => {
      const user = findUserById("non-existent-id");
      expect(user).toBeUndefined();
    });

    it("should find club by id", () => {
      const clubs = getMockClubs();
      const club = findClubById(clubs[0].id);
      expect(club).toBeDefined();
      expect(club?.id).toBe(clubs[0].id);
    });

    it("should create a new booking", () => {
      const initialBookings = getMockBookings();
      const courts = getMockCourts();
      const users = getMockUsers();

      const newBooking = createMockBooking({
        courtId: courts[0].id,
        userId: users[0].id,
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        price: 5000,
        status: "pending",
      });

      expect(newBooking).toBeDefined();
      expect(newBooking.id).toBeTruthy();
      expect(newBooking.courtId).toBe(courts[0].id);
      expect(newBooking.userId).toBe(users[0].id);

      const updatedBookings = getMockBookings();
      expect(updatedBookings.length).toBe(initialBookings.length + 1);
    });

    it("should cancel a booking", () => {
      const bookings = getMockBookings();
      const bookingToCancel = bookings.find((b) => b.status !== "cancelled");
      expect(bookingToCancel).toBeDefined();

      const result = cancelMockBooking(bookingToCancel!.id);
      expect(result).toBe(true);

      const updatedBookings = getMockBookings();
      const cancelledBooking = updatedBookings.find((b) => b.id === bookingToCancel!.id);
      expect(cancelledBooking?.status).toBe("cancelled");
    });

    it("should return false when cancelling non-existent booking", () => {
      const result = cancelMockBooking("non-existent-id");
      expect(result).toBe(false);
    });

    it("should create a new court", () => {
      const clubs = getMockClubs();
      const initialCourts = getMockCourts();

      const newCourt = createMockCourt({
        clubId: clubs[0].id,
        name: "Test Court",
        slug: "test-court",
        type: "padel",
        surface: "artificial_grass",
        indoor: true,
        sportType: SportType.PADEL,
        defaultPriceCents: 5000,
      });

      expect(newCourt).toBeDefined();
      expect(newCourt.id).toBeTruthy();
      expect(newCourt.clubId).toBe(clubs[0].id);
      expect(newCourt.name).toBe("Test Court");
      expect(newCourt.indoor).toBe(true);
      expect(newCourt.sportType).toBe(SportType.PADEL);

      const updatedCourts = getMockCourts();
      expect(updatedCourts.length).toBe(initialCourts.length + 1);
    });
  });

  describe("Mock Data Diversity", () => {
    it("should have users with different roles", () => {
      const users = getMockUsers();
      const hasRoot = users.some((u) => u.isRoot);
      const hasNonRoot = users.some((u) => !u.isRoot);
      expect(hasRoot).toBe(true);
      expect(hasNonRoot).toBe(true);
    });

    it("should have bookings with different statuses", () => {
      const bookings = getMockBookings();
      const statuses = new Set(bookings.map((b) => b.status));
      expect(statuses.size).toBeGreaterThan(1);
      expect(statuses.has("paid") || statuses.has("pending") || statuses.has("cancelled")).toBe(
        true
      );
    });

    it("should have courts with different indoor/outdoor types", () => {
      const courts = getMockCourts();
      const hasIndoor = courts.some((c) => c.indoor);
      const hasOutdoor = courts.some((c) => !c.indoor);
      expect(hasIndoor).toBe(true);
      expect(hasOutdoor).toBe(true);
    });

    it("should have an archived organization", () => {
      const orgs = getMockOrganizations();
      const hasArchived = orgs.some((o) => o.archivedAt !== null);
      expect(hasArchived).toBe(true);
    });
  });

  describe("Mock Data for Edge Cases", () => {
    it("should have bookings in past, present, and future", () => {
      const bookings = getMockBookings();
      const now = new Date();

      const pastBookings = bookings.filter((b) => b.end < now);
      const futureBookings = bookings.filter((b) => b.start > now);

      expect(pastBookings.length).toBeGreaterThan(0);
      expect(futureBookings.length).toBeGreaterThan(0);
    });

    it("should support pagination scenarios", () => {
      const clubs = getMockClubs();
      expect(clubs.length).toBeGreaterThanOrEqual(3);
    });
  });
});
