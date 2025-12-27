/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findUnique: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  requireRootAdmin,
  requireOrganizationAccess,
  requireOrganizationAdmin,
  requireClubAccess,
  requireClubAdmin,
} from "@/lib/permissions/guards";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMembershipFindUnique = prisma.membership.findUnique as jest.MockedFunction<
  typeof prisma.membership.findUnique
>;
const mockClubMembershipFindUnique = prisma.clubMembership.findUnique as jest.MockedFunction<
  typeof prisma.clubMembership.findUnique
>;
const mockClubFindUnique = prisma.club.findUnique as jest.MockedFunction<
  typeof prisma.club.findUnique
>;

describe("Permission Guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requireRootAdmin", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireRootAdmin();

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return 403 when not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);

      const result = await requireRootAdmin();

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
      }
    });

    it("should return authorized for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: true },
      } as any);

      const result = await requireRootAdmin();

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-1");
        expect(result.isRoot).toBe(true);
      }
    });
  });

  describe("requireOrganizationAccess", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireOrganizationAccess("org-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return authorized for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: true },
      } as any);

      const result = await requireOrganizationAccess("org-1");

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-1");
        expect(result.isRoot).toBe(true);
      }
    });

    it("should return authorized for organization member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
        isPrimaryOwner: false,
      } as any);

      const result = await requireOrganizationAccess("org-1");

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe("user-1");
        expect(result.isRoot).toBe(false);
      }
    });

    it("should return 403 when not a member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);

      const result = await requireOrganizationAccess("org-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
      }
    });
  });

  describe("requireOrganizationAdmin", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireOrganizationAdmin("org-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return authorized for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: true },
      } as any);

      const result = await requireOrganizationAdmin("org-1");

      expect(result.authorized).toBe(true);
    });

    it("should return authorized for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await requireOrganizationAdmin("org-1");

      expect(result.authorized).toBe(true);
    });

    it("should return 403 for regular member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
        isPrimaryOwner: false,
      } as any);

      const result = await requireOrganizationAdmin("org-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
      }
    });
  });

  describe("requireClubAccess", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireClubAccess("club-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return authorized for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: true },
      } as any);

      const result = await requireClubAccess("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return authorized for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await requireClubAccess("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return authorized for club member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
      } as any);

      const result = await requireClubAccess("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return 403 when not a member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue(null);

      const result = await requireClubAccess("club-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
      }
    });
  });

  describe("requireClubAdmin", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await requireClubAdmin("club-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(401);
      }
    });

    it("should return authorized for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: true },
      } as any);

      const result = await requireClubAdmin("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return authorized for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await requireClubAdmin("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return authorized for club owner", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_OWNER",
      } as any);

      const result = await requireClubAdmin("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return authorized for club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_ADMIN",
      } as any);

      const result = await requireClubAdmin("club-1");

      expect(result.authorized).toBe(true);
    });

    it("should return 403 for regular member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      } as any);
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
      } as any);

      const result = await requireClubAdmin("club-1");

      expect(result.authorized).toBe(false);
      if (!result.authorized) {
        expect(result.response.status).toBe(403);
      }
    });
  });
});
