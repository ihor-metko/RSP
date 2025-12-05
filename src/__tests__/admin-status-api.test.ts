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

import { GET } from "@/app/api/me/admin-status/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockMembershipFindMany = prisma.membership.findMany as jest.MockedFunction<typeof prisma.membership.findMany>;
const mockClubMembershipFindMany = prisma.clubMembership.findMany as jest.MockedFunction<typeof prisma.clubMembership.findMany>;

describe("Admin Status API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/me/admin-status", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return root_admin status for root admin users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        isAdmin: true,
        adminType: "root_admin",
        isRoot: true,
        managedIds: [],
      });
      // Should not query memberships for root admins
      expect(mockMembershipFindMany).not.toHaveBeenCalled();
      expect(mockClubMembershipFindMany).not.toHaveBeenCalled();
    });

    it("should return organization_admin status for organization admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1" },
        { organizationId: "org-2" },
      ] as never[]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        isAdmin: true,
        adminType: "organization_admin",
        isRoot: false,
        managedIds: ["org-1", "org-2"],
      });
    });

    it("should return club_admin status for club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1", club: { id: "club-1", name: "First Club" } },
        { clubId: "club-2", club: { id: "club-2", name: "Second Club" } },
      ] as never[]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        isAdmin: true,
        adminType: "club_admin",
        isRoot: false,
        managedIds: ["club-1", "club-2"],
        assignedClub: { id: "club-1", name: "First Club" },
      });
    });

    it("should return none for non-admin users", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "regular-user-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        isAdmin: false,
        adminType: "none",
        isRoot: false,
        managedIds: [],
      });
    });

    it("should prioritize organization admin over club admin", async () => {
      // If a user is both org admin and club admin, they should be reported as org admin
      mockAuth.mockResolvedValue({
        user: { id: "dual-admin-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([
        { organizationId: "org-1" },
      ] as never[]);
      // This should not be called if user is already an org admin
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1" },
      ] as never[]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.adminType).toBe("organization_admin");
      expect(data.managedIds).toEqual(["org-1"]);
    });

    it("should only query for ORGANIZATION_ADMIN role in memberships", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      await GET();

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

    it("should only query for CLUB_ADMIN role in club memberships", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([]);

      await GET();

      expect(mockClubMembershipFindMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          role: "CLUB_ADMIN",
        },
        select: {
          clubId: true,
          club: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it("should return assignedClub in response for club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      });
      mockMembershipFindMany.mockResolvedValue([]);
      mockClubMembershipFindMany.mockResolvedValue([
        { clubId: "club-1", club: { id: "club-1", name: "Test Club" } },
      ]);

      const response = await GET();
      const data = await response.json();

      expect(data.assignedClub).toEqual({ id: "club-1", name: "Test Club" });
    });
  });
});
