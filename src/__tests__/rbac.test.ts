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
    },
    clubMembership: {
      findUnique: jest.fn(),
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
  requireClubAdmin 
} from "@/lib/requireRole";

// Get typed mock references
const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMembershipFindUnique = prisma.membership.findUnique as jest.MockedFunction<typeof prisma.membership.findUnique>;
const mockClubMembershipFindUnique = prisma.clubMembership.findUnique as jest.MockedFunction<typeof prisma.clubMembership.findUnique>;

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
});
