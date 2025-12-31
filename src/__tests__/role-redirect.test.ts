/**
 * @jest-environment node
 */

import { getRoleHomepage, getAdminHomepage, checkUserAdminStatus, AdminType } from "@/utils/roleRedirect";

// Mock Prisma
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

import { prisma } from "@/lib/prisma";

const mockMembershipFindMany = prisma.membership.findMany as jest.MockedFunction<typeof prisma.membership.findMany>;
const mockClubMembershipFindMany = prisma.clubMembership.findMany as jest.MockedFunction<typeof prisma.clubMembership.findMany>;

describe("Role Redirect Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRoleHomepage (legacy)", () => {
    it("should return admin dashboard for root admin (isRoot=true)", () => {
      expect(getRoleHomepage(true)).toBe("/admin/dashboard");
    });

    it("should return home page for regular user (isRoot=false)", () => {
      expect(getRoleHomepage(false)).toBe("/");
    });

    it("should return home page for undefined isRoot", () => {
      expect(getRoleHomepage(undefined)).toBe("/");
    });

    it("should always return a valid path starting with /", () => {
      const testCases: (boolean | undefined)[] = [true, false, undefined];

      testCases.forEach((isRoot) => {
        const path = getRoleHomepage(isRoot);
        expect(path).toMatch(/^\//);
        expect(path.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("getAdminHomepage", () => {
    it("should return admin dashboard for root_admin", () => {
      expect(getAdminHomepage("root_admin")).toBe("/admin/dashboard");
    });

    it("should return admin dashboard for organization_admin", () => {
      expect(getAdminHomepage("organization_admin")).toBe("/admin/dashboard");
    });

    it("should return admin dashboard for club_admin", () => {
      expect(getAdminHomepage("club_admin")).toBe("/admin/dashboard");
    });

    it("should return home page for non-admin users", () => {
      expect(getAdminHomepage("none")).toBe("/");
    });

    it("should always return a valid path starting with /", () => {
      const testCases: AdminType[] = ["root_admin", "organization_admin", "club_admin", "none"];

      testCases.forEach((adminType) => {
        const path = getAdminHomepage(adminType);
        expect(path).toMatch(/^\//);
        expect(path.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("checkUserAdminStatus", () => {
    it("should return root_admin for users with isRoot=true", async () => {
      const result = await checkUserAdminStatus("user-1", true);

      expect(result).toEqual({
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      });
      // Should not query database for root admins
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
      expect(mockClubMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should return organization_admin for users with ORGANIZATION_ADMIN membership", async () => {
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-2" },
      ] as never[]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const result = await checkUserAdminStatus("user-1", false);

      expect(result).toEqual({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1", "org-2"],
      });
    });

    it("should return club_admin for users with CLUB_ADMIN membership", async () => {
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1" },
        { clubId: "club-2" },
      ] as never[]);

      const result = await checkUserAdminStatus("user-1", false);

      expect(result).toEqual({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1", "club-2"],
      });
    });

    it("should return club_admin for users with CLUB_OWNER membership", async () => {
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1" },
      ] as never[]);

      const result = await checkUserAdminStatus("user-1", false);

      expect(result).toEqual({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });
    });

    it("should return none for non-admin users", async () => {
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const result = await checkUserAdminStatus("user-1", false);

      expect(result).toEqual({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });
    });

    it("should prioritize organization admin over club admin", async () => {
      // User is both org admin and club admin - should be reported as org admin
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1" },
      ] as never[]);
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1" },
      ] as never[]);

      const result = await checkUserAdminStatus("user-1", false);

      expect(result.adminType).toBe("organization_admin");
      expect(result.managedIds).toEqual(["org-1"]);
    });

    it("should query for ORGANIZATION_ADMIN role only", async () => {
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      await checkUserAdminStatus("user-1", false);

      expect(mockMembershipFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          role: "ORGANIZATION_ADMIN",
        },
        select: {
          organizationId: true,
        },
      });
    });

    it("should query for both CLUB_ADMIN and CLUB_OWNER roles", async () => {
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      await checkUserAdminStatus("user-1", false);

      expect(mockClubMembershipFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          role: {
            in: ["CLUB_ADMIN", "CLUB_OWNER"],
          },
        },
        select: {
          clubId: true,
        },
      });
    });
  });
});
