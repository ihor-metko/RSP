/**
 * @jest-environment node
 */

import { getRoleHomepage, ROLE_HOMEPAGES } from "@/utils/roleRedirect";
import { Roles, ADMIN_ROLES, isAdminRole, type UserRole } from "@/constants/roles";

describe("Role Redirect Utilities", () => {
  describe("ROLE_HOMEPAGES", () => {
    it("should have correct homepage for root_admin", () => {
      expect(ROLE_HOMEPAGES[Roles.RootAdmin]).toBe("/admin/clubs");
    });

    it("should have correct homepage for super_admin", () => {
      expect(ROLE_HOMEPAGES[Roles.SuperAdmin]).toBe("/admin/clubs");
    });

    it("should have correct homepage for admin", () => {
      expect(ROLE_HOMEPAGES[Roles.Admin]).toBe("/admin/clubs");
    });

    it("should have correct homepage for coach", () => {
      expect(ROLE_HOMEPAGES[Roles.Coach]).toBe("/coach/dashboard");
    });

    it("should have correct homepage for player", () => {
      expect(ROLE_HOMEPAGES[Roles.Player]).toBe("/");
    });
  });

  describe("getRoleHomepage", () => {
    it("should return root_admin homepage for root_admin role", () => {
      expect(getRoleHomepage(Roles.RootAdmin)).toBe("/admin/clubs");
    });

    it("should return super_admin homepage for super_admin role", () => {
      expect(getRoleHomepage(Roles.SuperAdmin)).toBe("/admin/clubs");
    });

    it("should return admin homepage for admin role", () => {
      expect(getRoleHomepage(Roles.Admin)).toBe("/admin/clubs");
    });

    it("should return coach homepage for coach role", () => {
      expect(getRoleHomepage(Roles.Coach)).toBe("/coach/dashboard");
    });

    it("should return player homepage for player role", () => {
      expect(getRoleHomepage(Roles.Player)).toBe("/");
    });

    it("should return player homepage for undefined role", () => {
      expect(getRoleHomepage(undefined)).toBe("/");
    });

    it("should return player homepage for unknown role", () => {
      // Type assertion to test edge case
      expect(getRoleHomepage("unknown" as UserRole)).toBe("/");
    });

    it("should prioritize super_admin over coach in role priority", () => {
      // Test that super_admin role gets admin page (super_admin > coach > player priority)
      expect(getRoleHomepage(Roles.SuperAdmin)).toBe("/admin/clubs");
    });

    it("should prioritize coach over player in role priority", () => {
      // Test that coach role gets coach page
      expect(getRoleHomepage(Roles.Coach)).toBe("/coach/dashboard");
    });
  });

  describe("ADMIN_ROLES", () => {
    it("should include root_admin, super_admin, and admin", () => {
      expect(ADMIN_ROLES).toContain(Roles.RootAdmin);
      expect(ADMIN_ROLES).toContain(Roles.SuperAdmin);
      expect(ADMIN_ROLES).toContain(Roles.Admin);
    });

    it("should not include coach or player", () => {
      expect(ADMIN_ROLES).not.toContain(Roles.Coach);
      expect(ADMIN_ROLES).not.toContain(Roles.Player);
    });
  });

  describe("isAdminRole", () => {
    it("should return true for root_admin", () => {
      expect(isAdminRole(Roles.RootAdmin)).toBe(true);
    });

    it("should return true for super_admin", () => {
      expect(isAdminRole(Roles.SuperAdmin)).toBe(true);
    });

    it("should return true for admin", () => {
      expect(isAdminRole(Roles.Admin)).toBe(true);
    });

    it("should return false for coach", () => {
      expect(isAdminRole(Roles.Coach)).toBe(false);
    });

    it("should return false for player", () => {
      expect(isAdminRole(Roles.Player)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isAdminRole(undefined)).toBe(false);
    });

    it("should return false for unknown role", () => {
      expect(isAdminRole("unknown")).toBe(false);
    });
  });

  describe("Role-based redirect behavior", () => {
    it("should handle all valid roles correctly", () => {
      const roles: UserRole[] = [Roles.RootAdmin, Roles.SuperAdmin, Roles.Admin, Roles.Coach, Roles.Player];
      
      roles.forEach((role) => {
        const redirectPath = getRoleHomepage(role);
        expect(redirectPath).toBe(ROLE_HOMEPAGES[role]);
      });
    });

    it("should always return a valid path", () => {
      const testCases: (UserRole | undefined)[] = [
        Roles.RootAdmin,
        Roles.SuperAdmin,
        Roles.Admin,
        Roles.Coach, 
        Roles.Player,
        undefined,
      ];

      testCases.forEach((role) => {
        const path = getRoleHomepage(role);
        expect(path).toMatch(/^\//);
        // Player homepage "/" has length 1, others are longer
        expect(path.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
