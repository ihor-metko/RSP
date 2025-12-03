/**
 * @jest-environment node
 */

import { getRoleHomepage, ROLE_HOMEPAGES } from "@/utils/roleRedirect";
import type { UserRole } from "@/lib/auth";

describe("Role Redirect Utilities", () => {
  describe("ROLE_HOMEPAGES", () => {
    it("should have correct homepage for admin", () => {
      expect(ROLE_HOMEPAGES.admin).toBe("/admin/clubs");
    });

    it("should have correct homepage for coach", () => {
      expect(ROLE_HOMEPAGES.coach).toBe("/coach/dashboard");
    });

    it("should have correct homepage for player", () => {
      expect(ROLE_HOMEPAGES.player).toBe("/");
    });
  });

  describe("getRoleHomepage", () => {
    it("should return admin homepage for admin role", () => {
      expect(getRoleHomepage("admin")).toBe("/admin/clubs");
    });

    it("should return coach homepage for coach role", () => {
      expect(getRoleHomepage("coach")).toBe("/coach/dashboard");
    });

    it("should return player homepage for player role", () => {
      expect(getRoleHomepage("player")).toBe("/");
    });

    it("should return player homepage for undefined role", () => {
      expect(getRoleHomepage(undefined)).toBe("/");
    });

    it("should return player homepage for unknown role", () => {
      // Type assertion to test edge case
      expect(getRoleHomepage("unknown" as UserRole)).toBe("/");
    });

    it("should prioritize admin over coach in role priority", () => {
      // Test that admin role gets admin page (admin > coach > player priority)
      expect(getRoleHomepage("admin")).toBe("/admin/clubs");
    });

    it("should prioritize coach over player in role priority", () => {
      // Test that coach role gets coach page
      expect(getRoleHomepage("coach")).toBe("/coach/dashboard");
    });
  });

  describe("Role-based redirect behavior", () => {
    it("should handle all valid roles correctly", () => {
      const roles: UserRole[] = ["admin", "coach", "player"];
      
      roles.forEach((role) => {
        const redirectPath = getRoleHomepage(role);
        expect(redirectPath).toBe(ROLE_HOMEPAGES[role]);
      });
    });

    it("should always return a valid path", () => {
      const testCases: (UserRole | undefined)[] = [
        "admin",
        "coach", 
        "player",
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
