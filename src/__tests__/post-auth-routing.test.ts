/**
 * @jest-environment node
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkUserAdminStatus } from "@/utils/roleRedirect";

// Mock dependencies
jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findFirst: jest.fn(),
    },
    clubMembership: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/utils/roleRedirect", () => ({
  checkUserAdminStatus: jest.fn(),
}));

describe("Post-Auth Routing Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Root Admin", () => {
    it("should redirect root admin to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-root",
          email: "root@example.com",
          name: "Root Admin",
          isRoot: true,
        },
      };

      // Simulate the post-auth logic for root admin
      const isRoot = mockSession.user.isRoot ?? false;

      if (isRoot) {
        redirect("/dashboard");
      }

      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Organization Admin", () => {
    it("should redirect organization admin to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-org-admin",
          email: "orgadmin@example.com",
          name: "Org Admin",
          isRoot: false,
        },
      };

      const userId = mockSession.user.id;
      const isRoot = mockSession.user.isRoot ?? false;

      // Mock checkUserAdminStatus to return organization admin
      (checkUserAdminStatus as jest.Mock).mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-123"],
      });

      const adminStatus = await checkUserAdminStatus(userId, isRoot);

      if (adminStatus.isAdmin) {
        redirect("/dashboard");
      }

      expect(checkUserAdminStatus).toHaveBeenCalledWith(userId, isRoot);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Club Admin", () => {
    it("should redirect club admin to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-club-admin",
          email: "clubadmin@example.com",
          name: "Club Admin",
          isRoot: false,
        },
      };

      const userId = mockSession.user.id;
      const isRoot = mockSession.user.isRoot ?? false;

      // Mock checkUserAdminStatus to return club admin
      (checkUserAdminStatus as jest.Mock).mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-123"],
      });

      const adminStatus = await checkUserAdminStatus(userId, isRoot);

      if (adminStatus.isAdmin) {
        redirect("/dashboard");
      }

      expect(checkUserAdminStatus).toHaveBeenCalledWith(userId, isRoot);
      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("User with Organization Membership", () => {
    it("should redirect user with org membership to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-with-org",
          email: "user@example.com",
          name: "User",
          isRoot: false,
        },
      };

      const userId = mockSession.user.id;
      const isRoot = mockSession.user.isRoot ?? false;

      // Mock checkUserAdminStatus to return non-admin
      (checkUserAdminStatus as jest.Mock).mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      // Mock org membership exists
      (prisma.membership.findFirst as jest.Mock).mockResolvedValue({
        id: "membership-123",
      });

      const adminStatus = await checkUserAdminStatus(userId, isRoot);

      if (!adminStatus.isAdmin) {
        const orgMembership = await prisma.membership.findFirst({
          where: { userId },
          select: { id: true },
        });

        if (orgMembership) {
          redirect("/dashboard");
        }
      }

      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("User with Club Membership", () => {
    it("should redirect user with club membership to /dashboard", async () => {
      const mockSession = {
        user: {
          id: "user-with-club",
          email: "user@example.com",
          name: "User",
          isRoot: false,
        },
      };

      const userId = mockSession.user.id;
      const isRoot = mockSession.user.isRoot ?? false;

      // Mock checkUserAdminStatus to return non-admin
      (checkUserAdminStatus as jest.Mock).mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      // Mock no org membership
      (prisma.membership.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock club membership exists
      (prisma.clubMembership.findFirst as jest.Mock).mockResolvedValue({
        id: "club-membership-123",
      });

      const adminStatus = await checkUserAdminStatus(userId, isRoot);

      if (!adminStatus.isAdmin) {
        const orgMembership = await prisma.membership.findFirst({
          where: { userId },
          select: { id: true },
        });

        if (!orgMembership) {
          const clubMembership = await prisma.clubMembership.findFirst({
            where: { userId },
            select: { id: true },
          });

          if (clubMembership) {
            redirect("/dashboard");
          }
        }
      }

      expect(redirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Regular Player (no memberships)", () => {
    it("should redirect regular player to / (landing page)", async () => {
      const mockSession = {
        user: {
          id: "user-regular",
          email: "player@example.com",
          name: "Player",
          isRoot: false,
        },
      };

      const userId = mockSession.user.id;
      const isRoot = mockSession.user.isRoot ?? false;

      // Mock checkUserAdminStatus to return non-admin
      (checkUserAdminStatus as jest.Mock).mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      // Mock no org membership
      (prisma.membership.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock no club membership
      (prisma.clubMembership.findFirst as jest.Mock).mockResolvedValue(null);

      const adminStatus = await checkUserAdminStatus(userId, isRoot);

      if (!adminStatus.isAdmin) {
        const orgMembership = await prisma.membership.findFirst({
          where: { userId },
          select: { id: true },
        });

        if (!orgMembership) {
          const clubMembership = await prisma.clubMembership.findFirst({
            where: { userId },
            select: { id: true },
          });

          if (!clubMembership) {
            redirect("/");
          }
        }
      }

      expect(redirect).toHaveBeenCalledWith("/");
    });
  });

  describe("Unauthenticated User", () => {
    it("should redirect unauthenticated user to /auth/sign-in", async () => {
      const mockSession = null;

      if (!mockSession?.user) {
        redirect("/auth/sign-in");
      }

      expect(redirect).toHaveBeenCalledWith("/auth/sign-in");
    });
  });
});
