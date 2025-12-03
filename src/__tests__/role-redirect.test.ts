/**
 * @jest-environment node
 */

import { getRoleHomepage, ROLE_HOMEPAGES } from "@/utils/roleRedirect";
import { Roles, type UserRole } from "@/constants/roles";

describe("Role Redirect Utilities", () => {
  describe("ROLE_HOMEPAGES", () => {
    it("should have correct homepage for super_admin", () => {
      expect(ROLE_HOMEPAGES[Roles.SuperAdmin]).toBe("/admin/clubs");
    });

    it("should have correct homepage for coach", () => {
      expect(ROLE_HOMEPAGES[Roles.Coach]).toBe("/coach/dashboard");
    });

    it("should have correct homepage for player", () => {
      expect(ROLE_HOMEPAGES[Roles.Player]).toBe("/");
    });
  });

  describe("getRoleHomepage", () => {
    it("should return super_admin homepage for super_admin role", () => {
      expect(getRoleHomepage(Roles.SuperAdmin)).toBe("/admin/clubs");
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

  describe("Role-based redirect behavior", () => {
    it("should handle all valid roles correctly", () => {
      const roles: UserRole[] = [Roles.SuperAdmin, Roles.Coach, Roles.Player];
      
      roles.forEach((role) => {
        const redirectPath = getRoleHomepage(role);
        expect(redirectPath).toBe(ROLE_HOMEPAGES[role]);
      });
    });

    it("should always return a valid path", () => {
      const testCases: (UserRole | undefined)[] = [
        Roles.SuperAdmin,
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
