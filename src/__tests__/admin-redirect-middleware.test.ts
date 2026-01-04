/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminHomepage, AdminType } from "@/utils/roleRedirect";

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

// Mock checkUserAdminStatus from roleRedirect
const mockCheckUserAdminStatus = jest.fn();

jest.mock("@/utils/roleRedirect", () => {
  const actual = jest.requireActual("@/utils/roleRedirect");
  return {
    ...actual,
    checkUserAdminStatus: (...args: unknown[]) => mockCheckUserAdminStatus(...args),
  };
});

// Import middleware after mocking
import middleware, { config } from "../../middleware";

describe("Admin Redirect Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to non-admin for tests
    mockCheckUserAdminStatus.mockResolvedValue({
      isAdmin: false,
      adminType: "none",
      managedIds: [],
    });
  });

  function createMockRequest(pathname: string) {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);
    return request;
  }

  describe("config.matcher", () => {
    it("should match root path and docs routes", () => {
      expect(config.matcher).toEqual(["/", "/docs/for-clubs/:path*"]);
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
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow coach users (non-admin) to see landing page", async () => {
      mockAuth.mockReturnValue({
        user: { id: "user2", email: "coach@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
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
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("root_admin"));
    });
  });

  describe("organization admin users", () => {
    it("should redirect organization admin users from landing page to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "org-admin1", email: "org-admin@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("organization_admin"));
    });
  });

  describe("club admin users", () => {
    it("should redirect club admin users from landing page to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "club-admin1", email: "club-admin@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });

      const request = createMockRequest("/");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("club_admin"));
    });
  });

  describe("non-root paths", () => {
    it("should not affect requests to other paths for admin users", async () => {
      mockAuth.mockReturnValue({
        user: { id: "admin1", email: "admin@test.com", isRoot: true },
      });

      const request = createMockRequest("/clubs");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow admin access to /admin/* routes", async () => {
      mockAuth.mockReturnValue({
        user: { id: "admin1", email: "admin@test.com", isRoot: true },
      });

      const request = createMockRequest("/admin/clubs");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("docs paths", () => {
    it("should allow unauthenticated users to access docs", async () => {
      mockAuth.mockReturnValue(null);

      const request = createMockRequest("/docs/for-clubs/getting-started");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should allow non-admin authenticated users to access docs", async () => {
      mockAuth.mockReturnValue({
        user: { id: "user1", email: "player@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      });

      const request = createMockRequest("/docs/for-clubs/overview");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("should redirect root admin from docs to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "admin1", email: "admin@test.com", isRoot: true },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      });

      const request = createMockRequest("/docs/for-clubs/getting-started");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("root_admin"));
    });

    it("should redirect organization admin from docs to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "org-admin1", email: "org-admin@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      });

      const request = createMockRequest("/docs/for-clubs/how-it-works");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("organization_admin"));
    });

    it("should redirect club admin from docs to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "club-admin1", email: "club-admin@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
      });

      const request = createMockRequest("/docs/for-clubs/overview");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("club_admin"));
    });

    it("should redirect club owner from docs to admin dashboard", async () => {
      mockAuth.mockReturnValue({
        user: { id: "club-owner1", email: "club-owner@test.com", isRoot: false },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: true,
        adminType: "club_owner",
        managedIds: ["club-1"],
      });

      const request = createMockRequest("/docs/for-clubs/getting-started");
      const response = await middleware(request as Parameters<typeof middleware>[0], {} as Parameters<typeof middleware>[1]);

      expect(response.status).toBe(307);
      const locationHeader = response.headers.get("location");
      expect(locationHeader).toContain(getAdminHomepage("club_owner"));
    });
  });

  describe("edge cases", () => {
    it("should handle missing role gracefully", async () => {
      mockAuth.mockReturnValue({
        user: { id: "user1", email: "user@test.com" },
      });
      mockCheckUserAdminStatus.mockResolvedValue({
        isAdmin: false,
        adminType: "none",
        managedIds: [],
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
  it("should return /admin/dashboard for root admin", () => {
    expect(getAdminHomepage("root_admin")).toBe("/admin/dashboard");
  });

  it("should return /admin/dashboard for organization admin", () => {
    expect(getAdminHomepage("organization_admin")).toBe("/admin/dashboard");
  });

  it("should return /admin/dashboard for club admin", () => {
    expect(getAdminHomepage("club_admin")).toBe("/admin/dashboard");
  });

  it("should return / for non-admin users", () => {
    expect(getAdminHomepage("none")).toBe("/");
  });

  it("should cover all admin types", () => {
    const adminTypes: AdminType[] = ["root_admin", "organization_admin", "club_admin", "none"];
    
    adminTypes.forEach((adminType) => {
      const homepage = getAdminHomepage(adminType);
      expect(homepage).toBeDefined();
      expect(homepage.startsWith("/")).toBe(true);
    });
  });
});
