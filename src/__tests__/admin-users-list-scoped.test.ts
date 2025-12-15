/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    club: {
      findMany: jest.fn(),
    },
    booking: {
      groupBy: jest.fn(),
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

import { GET } from "../app/api/admin/users/list/route";
import { prisma } from "@/lib/prisma";

describe("Admin Users List API - Role-Based Access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Root Admin Access", () => {
    it("should return all users for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin", isRoot: true },
      });

      const mockUsers = [
        {
          id: "user-1",
          name: "User One",
          email: "user1@test.com",
          isRoot: false,
          blocked: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          memberships: [],
          clubMemberships: [],
          bookings: [],
          _count: { bookings: 5 },
        },
        {
          id: "user-2",
          name: "User Two",
          email: "user2@test.com",
          isRoot: false,
          blocked: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          memberships: [],
          clubMemberships: [],
          bookings: [],
          _count: { bookings: 3 },
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValue(2);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.pagination.totalCount).toBe(2);
    });
  });

  describe("Organization Admin Access", () => {
    it("should return only users from clubs in their organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin", isRoot: false },
      });

      // Mock requireAnyAdmin to return organization admin status
      const mockOrgMemberships = [
        { organizationId: "org-1" },
      ];
      (prisma.membership.findMany as jest.Mock).mockResolvedValue(mockOrgMemberships);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      // Mock users who are members of clubs in the organization
      const mockUsers = [
        {
          id: "user-1",
          name: "Club Member One",
          email: "member1@test.com",
          isRoot: false,
          blocked: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          memberships: [],
          clubMemberships: [{ role: "MEMBER", club: { id: "club-1", name: "Club 1" } }],
          bookings: [],
          _count: { bookings: 2 },
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValue(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      
      // Verify that the scope filter was applied via nested clubMemberships query
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                clubMemberships: expect.objectContaining({
                  some: expect.objectContaining({
                    club: expect.objectContaining({
                      organizationId: expect.objectContaining({ in: ["org-1"] }),
                    }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });

    it("should return empty list when organization has no clubs", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin", isRoot: false },
      });

      const mockOrgMemberships = [
        { organizationId: "org-1" },
      ];
      (prisma.membership.findMany as jest.Mock).mockResolvedValue(mockOrgMemberships);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      // Organization has no clubs, so the nested query will find no users
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(0);
    });

    it("should allow searching within scoped users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin", isRoot: false },
      });

      const mockOrgMemberships = [
        { organizationId: "org-1" },
      ];
      (prisma.membership.findMany as jest.Mock).mockResolvedValue(mockOrgMemberships);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/users/list?search=john",
        { method: "GET" }
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Verify search was applied along with scope filter
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ name: expect.objectContaining({ contains: "john" }) }),
                  expect.objectContaining({ email: expect.objectContaining({ contains: "john" }) }),
                ]),
              }),
              expect.objectContaining({
                clubMemberships: expect.objectContaining({
                  some: expect.anything(),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("Club Admin Access", () => {
    it("should return only users from their specific club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin", isRoot: false },
      });

      // Mock requireAnyAdmin to return club admin status
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      const mockClubMemberships = [
        { clubId: "club-1" },
      ];
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue(mockClubMemberships);

      // Mock users who are members of this club
      const mockUsers = [
        {
          id: "user-1",
          name: "Club Member",
          email: "member@test.com",
          isRoot: false,
          blocked: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          memberships: [],
          clubMemberships: [{ role: "MEMBER", club: { id: "club-1", name: "Club 1" } }],
          bookings: [],
          _count: { bookings: 1 },
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValue(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      
      // Verify scope filter was applied for club admin
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                clubMemberships: expect.objectContaining({
                  some: expect.objectContaining({
                    clubId: expect.objectContaining({ in: ["club-1"] }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });

    it("should support multiple clubs for club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin", isRoot: false },
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      const mockClubMemberships = [
        { clubId: "club-1" },
        { clubId: "club-2" },
      ];
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue(mockClubMemberships);

      const mockUsers = [
        {
          id: "user-1",
          name: "User in Club 1",
          email: "user1@test.com",
          isRoot: false,
          blocked: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          memberships: [],
          clubMemberships: [{ role: "MEMBER", club: { id: "club-1", name: "Club 1" } }],
          bookings: [],
          _count: { bookings: 0 },
        },
        {
          id: "user-2",
          name: "User in Club 2",
          email: "user2@test.com",
          isRoot: false,
          blocked: false,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          memberships: [],
          clubMemberships: [{ role: "MEMBER", club: { id: "club-2", name: "Club 2" } }],
          bookings: [],
          _count: { bookings: 0 },
        },
      ];

      (prisma.user.count as jest.Mock).mockResolvedValue(2);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      
      // Verify scope filter includes both clubs
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                clubMemberships: expect.objectContaining({
                  some: expect.objectContaining({
                    clubId: expect.objectContaining({ in: ["club-1", "club-2"] }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not an admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "regular-user", isRoot: false },
      });

      // Mock requireAnyAdmin to return no admin memberships
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users/list", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Pagination", () => {
    it("should support pagination for scoped results", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin", isRoot: false },
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([{ clubId: "club-1" }]);

      (prisma.user.count as jest.Mock).mockResolvedValue(50);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/users/list?page=2&pageSize=10",
        { method: "GET" }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination).toEqual({
        page: 2,
        pageSize: 10,
        totalCount: 50,
        totalPages: 5,
      });
      
      // Verify skip and take were applied correctly
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });
});
