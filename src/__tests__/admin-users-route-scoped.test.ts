/**
 * @jest-environment node
 * 
 * Tests for /api/admin/users endpoint - Role-based access control
 * 
 * This test suite verifies that the admin users simple list endpoint properly
 * enforces role-scoped access control:
 * - Root Admin: Returns all users (no scope filtering)
 * - Organization Admin: Returns only users from clubs in their organization(s)
 * - Club Admin/Owner: Returns only users from their specific club(s)
 * - Regular Users: Returns 403 Forbidden
 * 
 * The endpoint is used for user selection in admin workflows (e.g., quick booking wizard).
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
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

import { GET } from "../app/api/admin/users/route";
import { prisma } from "@/lib/prisma";

describe("Admin Users Simple API - Role-Based Access", () => {
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
          memberships: [],
        },
        {
          id: "user-2",
          name: "User Two",
          email: "user2@test.com",
          memberships: [],
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      
      // Verify no scope filter was applied for root admin
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [{ isRoot: false }],
          }),
        })
      );
    });

    it("should support search query for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users?q=john", {
        method: "GET",
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isRoot: false },
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { name: { contains: "john", mode: "insensitive" } },
                  { email: { contains: "john", mode: "insensitive" } },
                ]),
              }),
            ]),
          }),
        })
      );
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

      // Mock users who are members of clubs in this organization
      const mockUsers = [
        {
          id: "user-1",
          name: "Org User",
          email: "orguser@test.com",
          memberships: [],
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      
      // Verify scope filter was applied for organization admin
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isRoot: false },
              expect.objectContaining({
                clubMemberships: {
                  some: {
                    club: {
                      organizationId: { in: ["org-1"] },
                    },
                  },
                },
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
          memberships: [],
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      
      // Verify scope filter was applied for club admin
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isRoot: false },
              expect.objectContaining({
                clubMemberships: {
                  some: {
                    clubId: { in: ["club-1"] },
                  },
                },
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

      // Mock requireAnyAdmin to return club admin status with multiple clubs
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      const mockClubMemberships = [
        { clubId: "club-1" },
        { clubId: "club-2" },
      ];
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue(mockClubMemberships);

      // Mock users from multiple clubs
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Verify scope filter includes both clubs
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { isRoot: false },
              expect.objectContaining({
                clubMemberships: {
                  some: {
                    clubId: { in: ["club-1", "club-2"] },
                  },
                },
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

      const request = new Request("http://localhost:3000/api/admin/users", {
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

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
