/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { getRoleHomepage } from "@/utils/roleRedirect";

// Mock getToken from next-auth/jwt
const mockGetToken = jest.fn();

jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

// Import middleware after mocking
import middleware, { config } from "../../middleware";

describe("Admin Redirect Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createMockRequest(pathname: string) {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);
    return request;
  }

  describe("config.matcher", () => {
    it("should only match root path", () => {
      expect(config.matcher).toEqual(["/"]);
    });
  });

  describe("unauthenticated users", () => {
    it("should allow access to landing page for unauthenticated users", async () => {
      mockGetToken.mockResolvedValue(null);

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("non-admin authenticated users", () => {
    it("should allow player users to see landing page", async () => {
      mockGetToken.mockResolvedValue({
        id: "user1",
        email: "player@test.com",
        isRoot: false,
        isAdmin: false,
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow coach users (non-admin) to see landing page", async () => {
      mockGetToken.mockResolvedValue({
        id: "user2",
        email: "coach@test.com",
        isRoot: false,
        isAdmin: false,
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("admin users", () => {
    it("should redirect root admin users from landing page to admin dashboard", async () => {
      mockGetToken.mockResolvedValue({
        id: "admin1",
        email: "admin@test.com",
        isRoot: true,
        isAdmin: true,
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain("/admin/dashboard");
    });

    it("should redirect organization admin users from landing page to admin dashboard", async () => {
      mockGetToken.mockResolvedValue({
        id: "orgadmin1",
        email: "orgadmin@test.com",
        isRoot: false,
        isAdmin: true,
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain("/admin/dashboard");
    });

    it("should redirect club admin users from landing page to admin dashboard", async () => {
      mockGetToken.mockResolvedValue({
        id: "clubadmin1",
        email: "clubadmin@test.com",
        isRoot: false,
        isAdmin: true,
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain("/admin/dashboard");
    });
  });

  describe("non-root paths", () => {
    it("should not affect requests to other paths for admin users", async () => {
      mockGetToken.mockResolvedValue({
        id: "admin1",
        email: "admin@test.com",
        isRoot: true,
        isAdmin: true,
      });

      const request = createMockRequest("/clubs");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow admin access to /admin/* routes", async () => {
      mockGetToken.mockResolvedValue({
        id: "admin1",
        email: "admin@test.com",
        isRoot: true,
        isAdmin: true,
      });

      const request = createMockRequest("/admin/clubs");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle token with missing isAdmin flag gracefully", async () => {
      mockGetToken.mockResolvedValue({
        id: "user1",
        email: "user@test.com",
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should handle token with isAdmin=undefined gracefully", async () => {
      mockGetToken.mockResolvedValue({
        id: "user1",
        email: "user@test.com",
        isAdmin: undefined,
      });

      const request = createMockRequest("/");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });
});

describe("Role Homepage Configuration", () => {
  it("should return /admin/dashboard for root admin (isRoot=true)", () => {
    expect(getRoleHomepage(true)).toBe("/admin/dashboard");
  });

  it("should return / for non-root users (isRoot=false)", () => {
    expect(getRoleHomepage(false)).toBe("/");
  });

  it("should return / for undefined isRoot", () => {
    expect(getRoleHomepage(undefined)).toBe("/");
  });
});
