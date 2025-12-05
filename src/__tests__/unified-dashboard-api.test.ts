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
      (prisma.user.count as jest.Mock).mockResolvedValue(100);
      (prisma.booking.count as jest.Mock).mockResolvedValue(25);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("root_admin");
      expect(data.isRoot).toBe(true);
      expect(data.platformStats).toEqual({
        totalOrganizations: 3,
        totalClubs: 5,
        totalUsers: 100,
        activeBookings: 25,
      });
    });

    it("should return organization data for organization admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "org-admin-1", isRoot: false },
      });
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-2" },
      ]);
      
      // First org
      (prisma.organization.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "org-1", name: "Org 1", slug: "org-1" })
        .mockResolvedValueOnce({ id: "org-2", name: "Org 2", slug: "org-2" });
      
      (prisma.club.count as jest.Mock).mockResolvedValue(2);
      (prisma.court.count as jest.Mock).mockResolvedValue(4);
      (prisma.booking.count as jest.Mock).mockResolvedValue(3);
      (prisma.clubMembership.count as jest.Mock).mockResolvedValue(1);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("organization_admin");
      expect(data.isRoot).toBe(false);
      expect(data.organizations).toHaveLength(2);
      expect(data.organizations[0]).toEqual({
        id: "org-1",
        name: "Org 1",
        slug: "org-1",
        clubsCount: 2,
        courtsCount: 4,
        bookingsToday: 3,
        clubAdminsCount: 1,
      });
    });

    it("should return club data for club admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "club-admin-1", isRoot: false },
      });
      // No organization memberships
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      // Has club memberships
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { clubId: "club-1" },
      ]);
      
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Club 1",
        slug: "club-1",
        organizationId: "org-1",
        organization: { name: "Org 1" },
      });
      
      (prisma.court.count as jest.Mock).mockResolvedValue(3);
      (prisma.booking.count as jest.Mock).mockResolvedValue(5);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("club_admin");
      expect(data.isRoot).toBe(false);
      expect(data.clubs).toHaveLength(1);
      expect(data.clubs[0]).toEqual({
        id: "club-1",
        name: "Club 1",
        slug: "club-1",
        organizationId: "org-1",
        organizationName: "Org 1",
        courtsCount: 3,
        bookingsToday: 5,
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

    it("should filter out organizations that no longer exist", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "org-admin-1", isRoot: false },
      });
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-deleted" },
      ]);
      
      // First org exists, second does not
      (prisma.organization.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "org-1", name: "Org 1", slug: "org-1" })
        .mockResolvedValueOnce(null);
      
      (prisma.club.count as jest.Mock).mockResolvedValue(2);
      (prisma.court.count as jest.Mock).mockResolvedValue(4);
      (prisma.booking.count as jest.Mock).mockResolvedValue(3);
      (prisma.clubMembership.count as jest.Mock).mockResolvedValue(1);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.organizations).toHaveLength(1);
      expect(data.organizations[0].id).toBe("org-1");
    });

    it("should filter out clubs that no longer exist", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "club-admin-1", isRoot: false },
      });
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { clubId: "club-1" },
        { clubId: "club-deleted" },
      ]);
      
      (prisma.club.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: "club-1",
          name: "Club 1",
          slug: "club-1",
          organizationId: "org-1",
          organization: { name: "Org 1" },
        })
        .mockResolvedValueOnce(null);
      
      (prisma.court.count as jest.Mock).mockResolvedValue(3);
      (prisma.booking.count as jest.Mock).mockResolvedValue(5);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.clubs).toHaveLength(1);
      expect(data.clubs[0].id).toBe("club-1");
    });
  });
});
