/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import { getRoleHomepage } from "@/utils/roleRedirect";

// Mock next-auth
const mockAuth = jest.fn();

jest.mock("@/lib/auth", () => ({
  auth: (handler: (req: NextRequest & { auth: unknown }) => NextResponse) => {
    return async (req: NextRequest) => {
      const authReq = req as NextRequest & { auth: unknown };
      authReq.auth = mockAuth();
      return handler(authReq);
    };
  },
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
      mockAuth.mockReturnValue(null);

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("non-admin authenticated users", () => {
    it("should allow player users to see landing page", async () => {
      mockAuth.mockReturnValue({
        user: { id: "user1", email: "player@test.com", isRoot: false },
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow coach users to see landing page", async () => {
      mockAuth.mockReturnValue({
        user: { id: "user2", email: "coach@test.com", isRoot: false },
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("root admin users (isRoot=true)", () => {
    it("should redirect root admin users from landing page to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "admin1", email: "admin@test.com", isRoot: true },
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getRoleHomepage(true));
    });
  });

  describe("non-root paths", () => {
    it("should not affect requests to other paths for super_admin users", async () => {
      mockAuth.mockReturnValue({
        user: { id: "admin1", email: "admin@test.com", isRoot: true },
      });

      const request = createMockRequest("/clubs");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow super_admin access to /admin/* routes", async () => {
      mockAuth.mockReturnValue({
        user: { id: "admin1", email: "admin@test.com", isRoot: true },
      });

      const request = createMockRequest("/admin/clubs");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle missing role gracefully", async () => {
      mockAuth.mockReturnValue({
        user: { id: "user1", email: "user@test.com" },
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should handle session with null user gracefully", async () => {
      mockAuth.mockReturnValue({ user: null });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

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
