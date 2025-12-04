/**
 * @jest-environment node
 */

import { getRoleHomepage } from "@/utils/roleRedirect";

describe("Role Redirect Utilities", () => {
  describe("getRoleHomepage", () => {
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
});
