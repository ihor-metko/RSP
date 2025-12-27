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

import { prisma } from "@/lib/prisma";
import {
  isRootAdmin,
  getOrganizationRole,
  getClubRole,
  canAccessOrganization,
  canManageOrganization,
  canInviteToOrganization,
  canAccessClub,
  canManageClub,
  canInviteToClub,
} from "@/lib/permissions";

const mockMembershipFindUnique = prisma.membership.findUnique as jest.MockedFunction<
  typeof prisma.membership.findUnique
>;
const mockClubMembershipFindUnique = prisma.clubMembership.findUnique as jest.MockedFunction<
  typeof prisma.clubMembership.findUnique
>;
const mockClubFindUnique = prisma.club.findUnique as jest.MockedFunction<
  typeof prisma.club.findUnique
>;

describe("Centralized Permission System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isRootAdmin", () => {
    it("should return true for root admin user", () => {
      const user = { id: "user-1", isRoot: true };
      expect(isRootAdmin(user)).toBe(true);
    });

    it("should return false for non-root user", () => {
      const user = { id: "user-1", isRoot: false };
      expect(isRootAdmin(user)).toBe(false);
    });

    it("should return false when isRoot is undefined", () => {
      const user = { id: "user-1" };
      expect(isRootAdmin(user)).toBe(false);
    });
  });

  describe("getOrganizationRole", () => {
    it("should return organization role for member", async () => {
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await getOrganizationRole("user-1", "org-1");

      expect(result).toEqual({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      });
      expect(mockMembershipFindUnique).toHaveBeenCalledWith({
        where: {
          userId_organizationId: {
            userId: "user-1",
            organizationId: "org-1",
          },
        },
        select: {
          role: true,
          isPrimaryOwner: true,
        },
      });
    });

    it("should return null when user is not a member", async () => {
      mockMembershipFindUnique.mockResolvedValue(null);

      const result = await getOrganizationRole("user-1", "org-1");

      expect(result).toBeNull();
    });

    it("should return isPrimaryOwner=true for organization owner", async () => {
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      } as any);

      const result = await getOrganizationRole("user-1", "org-1");

      expect(result).toEqual({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      });
    });
  });

  describe("getClubRole", () => {
    it("should return club role for member", async () => {
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_ADMIN",
      } as any);

      const result = await getClubRole("user-1", "club-1");

      expect(result).toEqual({
        role: "CLUB_ADMIN",
      });
      expect(mockClubMembershipFindUnique).toHaveBeenCalledWith({
        where: {
          userId_clubId: {
            userId: "user-1",
            clubId: "club-1",
          },
        },
        select: {
          role: true,
        },
      });
    });

    it("should return null when user is not a member", async () => {
      mockClubMembershipFindUnique.mockResolvedValue(null);

      const result = await getClubRole("user-1", "club-1");

      expect(result).toBeNull();
    });
  });

  describe("canAccessOrganization", () => {
    it("should return true for root admin", async () => {
      const user = { id: "user-1", isRoot: true };

      const result = await canAccessOrganization(user, "org-1");

      expect(result).toBe(true);
      // Should not query database for root admin
      expect(mockMembershipFindUnique).not.toHaveBeenCalled();
    });

    it("should return true for organization member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
        isPrimaryOwner: false,
      } as any);

      const result = await canAccessOrganization(user, "org-1");

      expect(result).toBe(true);
    });

    it("should return false for non-member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue(null);

      const result = await canAccessOrganization(user, "org-1");

      expect(result).toBe(false);
    });
  });

  describe("canManageOrganization", () => {
    it("should return true for root admin", async () => {
      const user = { id: "user-1", isRoot: true };

      const result = await canManageOrganization(user, "org-1");

      expect(result).toBe(true);
    });

    it("should return true for organization admin", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await canManageOrganization(user, "org-1");

      expect(result).toBe(true);
    });

    it("should return false for regular member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
        isPrimaryOwner: false,
      } as any);

      const result = await canManageOrganization(user, "org-1");

      expect(result).toBe(false);
    });
  });

  describe("canInviteToOrganization", () => {
    it("should return true for root admin inviting any role", async () => {
      const user = { id: "user-1", isRoot: true };

      const resultOwner = await canInviteToOrganization(user, "org-1", "ORGANIZATION_OWNER");
      const resultAdmin = await canInviteToOrganization(user, "org-1", "ORGANIZATION_ADMIN");

      expect(resultOwner).toBe(true);
      expect(resultAdmin).toBe(true);
    });

    it("should return false for non-organization role", async () => {
      const user = { id: "user-1", isRoot: false };

      const result = await canInviteToOrganization(user, "org-1", "CLUB_ADMIN");

      expect(result).toBe(false);
    });

    it("should return true for primary owner inviting owners", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      } as any);

      const result = await canInviteToOrganization(user, "org-1", "ORGANIZATION_OWNER");

      expect(result).toBe(true);
    });

    it("should return false for non-primary owner inviting owners", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await canInviteToOrganization(user, "org-1", "ORGANIZATION_OWNER");

      expect(result).toBe(false);
    });

    it("should return true for organization admin inviting admins", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await canInviteToOrganization(user, "org-1", "ORGANIZATION_ADMIN");

      expect(result).toBe(true);
    });

    it("should return false for regular member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
        isPrimaryOwner: false,
      } as any);

      const result = await canInviteToOrganization(user, "org-1", "ORGANIZATION_ADMIN");

      expect(result).toBe(false);
    });
  });

  describe("canAccessClub", () => {
    it("should return true for root admin", async () => {
      const user = { id: "user-1", isRoot: true };

      const result = await canAccessClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return true for organization admin of club's organization", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await canAccessClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return true for club member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
      } as any);

      const result = await canAccessClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return false for non-member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue(null);

      const result = await canAccessClub(user, "club-1");

      expect(result).toBe(false);
    });
  });

  describe("canManageClub", () => {
    it("should return true for root admin", async () => {
      const user = { id: "user-1", isRoot: true };

      const result = await canManageClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return true for organization admin", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const result = await canManageClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return true for club owner", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_OWNER",
      } as any);

      const result = await canManageClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return true for club admin", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_ADMIN",
      } as any);

      const result = await canManageClub(user, "club-1");

      expect(result).toBe(true);
    });

    it("should return false for regular member", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "MEMBER",
      } as any);

      const result = await canManageClub(user, "club-1");

      expect(result).toBe(false);
    });
  });

  describe("canInviteToClub", () => {
    it("should return true for root admin", async () => {
      const user = { id: "user-1", isRoot: true };

      const result = await canInviteToClub(user, "club-1", "CLUB_ADMIN");

      expect(result).toBe(true);
    });

    it("should return false for non-club role", async () => {
      const user = { id: "user-1", isRoot: false };

      const result = await canInviteToClub(user, "club-1", "ORGANIZATION_ADMIN");

      expect(result).toBe(false);
    });

    it("should return true for organization admin inviting club roles", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: false,
      } as any);

      const resultOwner = await canInviteToClub(user, "club-1", "CLUB_OWNER");
      const resultAdmin = await canInviteToClub(user, "club-1", "CLUB_ADMIN");

      expect(resultOwner).toBe(true);
      expect(resultAdmin).toBe(true);
    });

    it("should return true for club owner inviting club admin", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_OWNER",
      } as any);

      const result = await canInviteToClub(user, "club-1", "CLUB_ADMIN");

      expect(result).toBe(true);
    });

    it("should return false for club owner inviting club owner", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_OWNER",
      } as any);

      const result = await canInviteToClub(user, "club-1", "CLUB_OWNER");

      expect(result).toBe(false);
    });

    it("should return false for club admin", async () => {
      const user = { id: "user-1", isRoot: false };
      mockClubFindUnique.mockResolvedValue({
        organizationId: "org-1",
      } as any);
      mockMembershipFindUnique.mockResolvedValue(null);
      mockClubMembershipFindUnique.mockResolvedValue({
        role: "CLUB_ADMIN",
      } as any);

      const result = await canInviteToClub(user, "club-1", "CLUB_ADMIN");

      expect(result).toBe(false);
    });
  });
});
