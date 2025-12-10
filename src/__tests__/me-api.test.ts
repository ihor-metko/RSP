/**
 * @jest-environment node
 */

// Mock Prisma with membership and clubMembership
jest.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/me/route";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMembershipFindMany = prisma.membership.findMany as jest.MockedFunction<typeof prisma.membership.findMany>;
const mockClubMembershipFindMany = prisma.clubMembership.findMany as jest.MockedFunction<typeof prisma.clubMembership.findMany>;

describe("/api/me endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/me", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return user info with admin status for regular user", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          email: "user@example.com",
          name: "Test User",
          isRoot: false,
        },
        expires: new Date().toISOString(),
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("user-123");
      expect(data.email).toBe("user@example.com");
      expect(data.name).toBe("Test User");
      expect(data.isRoot).toBe(false);
      expect(data.adminStatus).toEqual({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });
      expect(data.memberships).toEqual([]);
      expect(data.clubMemberships).toEqual([]);
    });

    it("should return admin status for root admin without querying memberships", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-123",
          email: "admin@example.com",
          name: "Root Admin",
          isRoot: true,
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("admin-123");
      expect(data.email).toBe("admin@example.com");
      expect(data.name).toBe("Root Admin");
      expect(data.isRoot).toBe(true);
      expect(data.adminStatus).toEqual({
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      });
      // Should not query memberships for root admin
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
      expect(mockClubMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should return organization admin status with memberships", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "org-admin-123",
          email: "orgadmin@example.com",
          name: "Org Admin",
          isRoot: false,
        },
        expires: new Date().toISOString(),
      });
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1", role: "ORGANIZATION_ADMIN", isPrimaryOwner: true },
        { organizationId: "org-2", role: "ORGANIZATION_ADMIN", isPrimaryOwner: false },
      ] as never[]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("org-admin-123");
      expect(data.adminStatus).toEqual({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1", "org-2"],
        isPrimaryOwner: true,
      });
      expect(data.memberships).toHaveLength(2);
      expect(data.memberships[0]).toEqual({
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      });
    });

    it("should return club admin status with club memberships", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "club-admin-123",
          email: "clubadmin@example.com",
          name: "Club Admin",
          isRoot: false,
        },
        expires: new Date().toISOString(),
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1", role: "CLUB_ADMIN", club: { id: "club-1", name: "Test Club" } },
      ] as never[]);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("club-admin-123");
      expect(data.adminStatus).toEqual({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
        assignedClub: {
          id: "club-1",
          name: "Test Club",
        },
      });
      expect(data.clubMemberships).toHaveLength(1);
      expect(data.clubMemberships[0]).toEqual({
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });
    });

    it("should handle missing optional fields", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-456",
          email: null,
          name: null,
        },
        expires: new Date().toISOString(),
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.userId).toBe("user-456");
      expect(data.email).toBeNull();
      expect(data.name).toBeNull();
      expect(data.isRoot).toBe(false);
      expect(data.adminStatus.isAdmin).toBe(false);
    });
  });
});
