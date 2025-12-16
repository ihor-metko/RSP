/**
 * @jest-environment node
 */

// Mock Prisma with membership and clubMembership - using inline jest.fn()
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { MembershipRole, ClubMembershipRole } from "@/constants/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { 
  requireRole, 
  requireRootAdmin, 
  requireAuth,
  requireOrganizationAdmin,
  requireClubOwner,
  requireClubAdmin,
  requireAnyAdmin
} from "@/lib/requireRole";

// Get typed mock references
const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMembershipFindUnique = prisma.membership.findUnique as jest.MockedFunction<typeof prisma.membership.findUnique>;
const mockClubMembershipFindUnique = prisma.clubMembership.findUnique as jest.MockedFunction<typeof prisma.clubMembership.findUnique>;
const mockMembershipFindMany = prisma.membership.findMany as jest.MockedFunction<typeof prisma.membership.findMany>;
const mockClubMembershipFindMany = prisma.clubMembership.findMany as jest.MockedFunction<typeof prisma.clubMembership.findMany>;

describe("requireRole universal role-based access control", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requireRole with organization context", () => {
    it("should return 401 Unauthorized when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        const data = await result.response.json();
        expect(result.response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      }
    });

    it("should return 401 Unauthorized when session has no user", async () => {
      mockAuth.mockResolvedValue({ user: null });

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        const data = await result.response.json();
        expect(result.response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      }
    });

    it("should automatically authorize root admin users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("admin-123");
        expect(result.isRoot).toBe(true);
        expect(result.userRole).toBe("root_admin");
      }
      // Should not check membership for root admins
      expect(mockMembershipFindUnique).not.toHaveBeenCalled();
    });

    it("should return 403 when user has no membership in organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindUnique.mockResolvedValue(null);

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        const data = await result.response.json();
        expect(result.response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      }
    });

    it("should return 403 when user role is not in allowed roles", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindUnique.mockResolvedValue({
        role: MembershipRole.MEMBER,
      });

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        const data = await result.response.json();
        expect(result.response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      }
    });

    it("should authorize organization admin for admin-only routes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindUnique.mockResolvedValue({
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN],
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-123");
        expect(result.isRoot).toBe(false);
        expect(result.userRole).toBe(MembershipRole.ORGANIZATION_ADMIN);
      }
    });

    it("should authorize organization member for member routes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindUnique.mockResolvedValue({
        role: MembershipRole.MEMBER,
      });

      const result = await requireRole({
        contextType: "organization",
        contextId: "org-123",
        allowedRoles: [MembershipRole.ORGANIZATION_ADMIN, MembershipRole.MEMBER],
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-123");
        expect(result.userRole).toBe(MembershipRole.MEMBER);
      }
    });
  });

  describe("requireRole with club context", () => {
    it("should automatically authorize root admin for club routes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const result = await requireRole({
        contextType: "club",
        contextId: "club-123",
        allowedRoles: [ClubMembershipRole.CLUB_ADMIN],
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("admin-123");
        expect(result.isRoot).toBe(true);
        expect(result.userRole).toBe("root_admin");
      }
      // Should not check club membership for root admins
      expect(mockClubMembershipFindUnique).not.toHaveBeenCalled();
    });

    it("should return 403 when user has no club membership", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue(null);

      const result = await requireRole({
        contextType: "club",
        contextId: "club-123",
        allowedRoles: [ClubMembershipRole.CLUB_ADMIN],
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        const data = await result.response.json();
        expect(result.response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      }
    });

    it("should return 403 when club member tries to access admin-only routes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.MEMBER,
      });

      const result = await requireRole({
        contextType: "club",
        contextId: "club-123",
        allowedRoles: [ClubMembershipRole.CLUB_ADMIN],
      });

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        const data = await result.response.json();
        expect(result.response.status).toBe(403);
        expect(data.error).toBe("Forbidden");
      }
    });

    it("should authorize club admin for admin routes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.CLUB_ADMIN,
      });

      const result = await requireRole({
        contextType: "club",
        contextId: "club-123",
        allowedRoles: [ClubMembershipRole.CLUB_ADMIN],
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-123");
        expect(result.isRoot).toBe(false);
        expect(result.userRole).toBe(ClubMembershipRole.CLUB_ADMIN);
      }
    });

    it("should authorize club member for member routes", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.MEMBER,
      });

      const result = await requireRole({
        contextType: "club",
        contextId: "club-123",
        allowedRoles: [ClubMembershipRole.CLUB_ADMIN, ClubMembershipRole.MEMBER],
      });

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-123");
        expect(result.userRole).toBe(ClubMembershipRole.MEMBER);
      }
    });
  });

  describe("requireRootAdmin", () => {
    it("should return 401 when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin", {
        method: "GET",
      });

      const result = await requireRootAdmin(request);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost:3000/api/admin", {
        method: "GET",
      });

      const result = await requireRootAdmin(request);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
      }
    });

    it("should authorize root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin", {
        method: "GET",
      });

      const result = await requireRootAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("admin-123");
      }
    });
  });

  describe("requireAuth", () => {
    it("should return 401 when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/test", {
        method: "GET",
      });

      const result = await requireAuth(request);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should authorize any authenticated user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "GET",
      });

      const result = await requireAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-123");
        expect(result.isRoot).toBe(false);
      }
    });

    it("should return isRoot status for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/test", {
        method: "GET",
      });

      const result = await requireAuth(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("admin-123");
        expect(result.isRoot).toBe(true);
      }
    });
  });

  describe("requireOrganizationAdmin helper", () => {
    it("should check organization admin role by default", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindUnique.mockResolvedValue({
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const result = await requireOrganizationAdmin("org-123");

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userRole).toBe(MembershipRole.ORGANIZATION_ADMIN);
      }
      expect(mockMembershipFindUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: "user-123",
            organizationId: "org-123",
          },
        },
        select: { role: true },
      });
    });

    it("should support custom allowed roles", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindUnique.mockResolvedValue({
        role: MembershipRole.MEMBER,
      });

      const result = await requireOrganizationAdmin("org-123", [
        MembershipRole.ORGANIZATION_ADMIN,
        MembershipRole.MEMBER,
      ]);

      expect(result.authorized).toBe(true);
    });
  });

  describe("requireClubAdmin helper", () => {
    it("should check club admin role by default", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.CLUB_ADMIN,
      });

      const result = await requireClubAdmin("club-123");

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userRole).toBe(ClubMembershipRole.CLUB_ADMIN);
      }
      expect(mockClubMembershipFindUnique).toHaveBeenCalledWith({
        where: {
          userId_clubId: {
            userId: "user-123",
            clubId: "club-123",
          },
        },
        select: { role: true },
      });
    });

    it("should support custom allowed roles", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.MEMBER,
      });

      const result = await requireClubAdmin("club-123", [
        ClubMembershipRole.CLUB_ADMIN,
        ClubMembershipRole.MEMBER,
      ]);

      expect(result.authorized).toBe(true);
    });
  });

  describe("requireClubOwner helper", () => {
    it("should check club owner role by default", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.CLUB_OWNER,
      });

      const result = await requireClubOwner("club-123");

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userRole).toBe(ClubMembershipRole.CLUB_OWNER);
      }
    });

    it("should support custom allowed roles", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockClubMembershipFindUnique.mockResolvedValue({
        role: ClubMembershipRole.CLUB_OWNER,
      });

      const result = await requireClubOwner("club-123", [
        ClubMembershipRole.CLUB_OWNER,
        ClubMembershipRole.CLUB_ADMIN,
      ]);

      expect(result.authorized).toBe(true);
    });
  });

  describe("requireAnyAdmin", () => {
    it("should return 401 when no session exists", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
        const data = await result.response.json();
        expect(data.error).toBe("Unauthorized");
      }
    });

    it("should authorize root admin users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("admin-123");
        expect(result.isRoot).toBe(true);
        expect(result.adminType).toBe("root_admin");
        expect(result.managedIds).toEqual([]);
      }
      // Should not query memberships for root admins
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
      expect(mockClubMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should authorize organization admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-2" },
      ] as never[]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("org-admin-123");
        expect(result.isRoot).toBe(false);
        expect(result.adminType).toBe("organization_admin");
        expect(result.managedIds).toEqual(["org-1", "org-2"]);
      }
    });

    it("should authorize club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      // First call checks for CLUB_OWNER (should return empty)
      // Second call checks for CLUB_ADMIN (should return data)
      mockClubMembershipFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { clubId: "club-1" },
        ] as never[]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("club-admin-123");
        expect(result.isRoot).toBe(false);
        expect(result.adminType).toBe("club_admin");
        expect(result.managedIds).toEqual(["club-1"]);
      }
    });

    it("should authorize club owners", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-owner-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      // First call checks for CLUB_OWNER (should return data)
      mockClubMembershipFindMany.mockResolvedValueOnce([
        { clubId: "club-1" },
      ] as never[]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("club-owner-123");
        expect(result.isRoot).toBe(false);
        expect(result.adminType).toBe("club_owner");
        expect(result.managedIds).toEqual(["club-1"]);
      }
    });

    it("should return 403 for non-admin users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "regular-user-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
        const data = await result.response.json();
        expect(data.error).toBe("Forbidden");
      }
    });

    it("should prioritize organization admin over club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "dual-admin-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1" },
      ] as never[]);
      // This should not be checked since user is an org admin
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1" },
      ] as never[]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.adminType).toBe("organization_admin");
        expect(result.managedIds).toEqual(["org-1"]);
      }
      // Should not query club memberships once org admin is found
      expect(mockClubMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should query for ORGANIZATION_ADMIN role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      await requireAnyAdmin(request);

      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          role: MembershipRole.ORGANIZATION_ADMIN,
        },
        select: {
          organizationId: true,
        },
      });
    });

    it("should query for CLUB_OWNER then CLUB_ADMIN role when not an organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      await requireAnyAdmin(request);

      // Should check for CLUB_OWNER first
      expect(mockClubMembershipFindMany).toHaveBeenNthCalledWith(1, {
        where: {
          userId: "user-123",
          role: ClubMembershipRole.CLUB_OWNER,
        },
        select: {
          clubId: true,
        },
      });

      // Then check for CLUB_ADMIN
      expect(mockClubMembershipFindMany).toHaveBeenNthCalledWith(2, {
        where: {
          userId: "user-123",
          role: ClubMembershipRole.CLUB_ADMIN,
        },
        select: {
          clubId: true,
        },
      });
    });

    it("should prioritize club owner over club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "dual-club-admin-123", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      // First call checks for CLUB_OWNER (should return data)
      // Second call should not be made since club owner is found
      mockClubMembershipFindMany.mockResolvedValueOnce([
        { clubId: "club-1" },
      ] as never[]);

      const request = new Request("http://localhost:3000/api/admin/dashboard", {
        method: "GET",
      });

      const result = await requireAnyAdmin(request);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.adminType).toBe("club_owner");
        expect(result.managedIds).toEqual(["club-1"]);
      }
      // Should only be called once for CLUB_OWNER, not twice
      expect(mockClubMembershipFindMany).toHaveBeenCalledTimes(1);
    });
  });
});
