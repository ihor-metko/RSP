/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findMany: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "@/app/api/admin/courts/route";
import { prisma } from "@/lib/prisma";

describe("Admin Courts API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/courts", () => {
    it("should return 401 for unauthenticated users", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          isRoot: false,
        },
      });
      // No organization or club memberships with admin role
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return all courts for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });

      const mockCourts = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          defaultPriceCents: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
          club: {
            id: "club-1",
            name: "Club 1",
            organizationId: "org-1",
            organization: {
              id: "org-1",
              name: "Org 1",
            },
          },
          _count: {
            bookings: 10,
          },
        },
        {
          id: "court-2",
          name: "Court 2",
          slug: null,
          type: null,
          surface: null,
          indoor: false,
          defaultPriceCents: 4000,
          createdAt: new Date(),
          updatedAt: new Date(),
          club: {
            id: "club-2",
            name: "Club 2",
            organizationId: "org-2",
            organization: {
              id: "org-2",
              name: "Org 2",
            },
          },
          _count: {
            bookings: 5,
          },
        },
      ];

      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Court 1");
      expect(data[0].club.name).toBe("Club 1");
      expect(data[0].organization.name).toBe("Org 1");
      expect(data[0].bookingCount).toBe(10);
      // Root admin should see all courts (no where clause)
      expect(prisma.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it("should return only organization courts for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "org-admin-user",
          isRoot: false,
        },
      });

      // Mock organization admin membership
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-1" },
      ]);

      const mockCourts = [
        {
          id: "court-1",
          name: "Org Court",
          slug: "org-court",
          type: "padel",
          surface: "artificial",
          indoor: true,
          defaultPriceCents: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
          club: {
            id: "club-1",
            name: "Org Club",
            organizationId: "org-1",
            organization: {
              id: "org-1",
              name: "My Org",
            },
          },
          _count: {
            bookings: 3,
          },
        },
      ];

      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Org Court");
      // Org admin should only see courts in their organization's clubs
      expect(prisma.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            club: {
              organizationId: {
                in: ["org-1"],
              },
            },
          },
        })
      );
    });

    it("should return only club courts for club admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "club-admin-user",
          isRoot: false,
        },
      });

      // No organization admin membership
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      // Club admin membership
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { clubId: "club-1" },
      ]);

      const mockCourts = [
        {
          id: "court-1",
          name: "My Club Court",
          slug: "my-court",
          type: "padel",
          surface: "grass",
          indoor: false,
          defaultPriceCents: 3500,
          createdAt: new Date(),
          updatedAt: new Date(),
          club: {
            id: "club-1",
            name: "My Club",
            organizationId: null,
            organization: null,
          },
          _count: {
            bookings: 1,
          },
        },
      ];

      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("My Club Court");
      expect(data[0].organization).toBeNull();
      // Club admin should only see courts in their managed clubs
      expect(prisma.court.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clubId: {
              in: ["club-1"],
            },
          },
        })
      );
    });

    it("should return empty array when no courts found", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });

      (prisma.court.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it("should return 500 on database error", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });

      (prisma.court.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost:3000/api/admin/courts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
