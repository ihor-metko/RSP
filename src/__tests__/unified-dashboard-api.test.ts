/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    club: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    court: {
      count: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    clubMembership: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { GET } from "@/app/api/admin/unified-dashboard/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("Unified Dashboard API", () => {
  const mockRequest = new NextRequest("http://localhost:3000/api/admin/unified-dashboard");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/unified-dashboard", () => {
    it("should return 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not an admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      });
      // No memberships
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return platform statistics for root admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });
      (prisma.organization.count as jest.Mock).mockResolvedValue(3);
      (prisma.club.count as jest.Mock).mockResolvedValue(5);
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(20) // activeBookingsCount
        .mockResolvedValueOnce(50); // pastBookingsCount

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("root_admin");
      expect(data.isRoot).toBe(true);
      expect(data.platformStats).toEqual({
        totalOrganizations: 3,
        totalClubs: 5,
        activeBookingsCount: 20,
        pastBookingsCount: 50,
      });
    });

    it("should return aggregated stats for organization admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "org-admin-1", isRoot: false },
      });
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-2" },
      ]);
      
      // Mock aggregated counts for all organizations
      (prisma.club.count as jest.Mock).mockResolvedValue(5); // Total clubs across both orgs
      (prisma.court.count as jest.Mock).mockResolvedValue(10); // Total courts across both orgs
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(3) // bookingsToday
        .mockResolvedValueOnce(8) // activeBookings
        .mockResolvedValueOnce(15); // pastBookings

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("organization_admin");
      expect(data.isRoot).toBe(false);
      expect(data.stats).toEqual({
        clubsCount: 5,
        courtsCount: 10,
        bookingsToday: 3,
        activeBookings: 8,
        pastBookings: 15,
      });
    });

    it("should return aggregated stats for club admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "club-admin-1", isRoot: false },
      });
      // No organization memberships
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      // No club owner memberships
      (prisma.clubMembership.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // First call for CLUB_OWNER
        .mockResolvedValueOnce([   // Second call for CLUB_ADMIN
          { clubId: "club-1" },
          { clubId: "club-2" },
        ]);
      
      // Mock aggregated counts for all clubs
      (prisma.court.count as jest.Mock).mockResolvedValue(6); // Total courts across both clubs
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(5) // bookingsToday
        .mockResolvedValueOnce(12) // activeBookings
        .mockResolvedValueOnce(20); // pastBookings

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("club_admin");
      expect(data.isRoot).toBe(false);
      expect(data.stats).toEqual({
        courtsCount: 6,
        bookingsToday: 5,
        activeBookings: 12,
        pastBookings: 20,
      });
    });

    it("should handle database errors gracefully", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });
      (prisma.organization.count as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return aggregated stats for organization admin even if some orgs are deleted", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "org-admin-1", isRoot: false },
      });
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-deleted" }, // This org might be deleted but counts still work
      ]);
      
      // Aggregated counts still work even if specific orgs are deleted
      (prisma.club.count as jest.Mock).mockResolvedValue(2);
      (prisma.court.count as jest.Mock).mockResolvedValue(4);
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(3) // bookingsToday
        .mockResolvedValueOnce(6) // activeBookings
        .mockResolvedValueOnce(10); // pastBookings

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toEqual({
        clubsCount: 2,
        courtsCount: 4,
        bookingsToday: 3,
        activeBookings: 6,
        pastBookings: 10,
      });
    });

    it("should return aggregated stats for club admin even if some clubs are deleted", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "club-admin-1", isRoot: false },
      });
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // First call for CLUB_OWNER
        .mockResolvedValueOnce([   // Second call for CLUB_ADMIN
          { clubId: "club-1" },
          { clubId: "club-deleted" }, // This club might be deleted but counts still work
        ]);
      
      // Aggregated counts still work even if specific clubs are deleted
      (prisma.court.count as jest.Mock).mockResolvedValue(3);
      (prisma.booking.count as jest.Mock)
        .mockResolvedValueOnce(5) // bookingsToday
        .mockResolvedValueOnce(8) // activeBookings
        .mockResolvedValueOnce(12); // pastBookings

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toEqual({
        courtsCount: 3,
        bookingsToday: 5,
        activeBookings: 8,
        pastBookings: 12,
      });
    });
  });
});
