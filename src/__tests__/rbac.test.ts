/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { requireRole } from "@/lib/requireRole";

describe("requireRole middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 Unauthorized when no session exists", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/test", {
      method: "GET",
    });

    const result = await requireRole(request, ["admin"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const data = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    }
  });

  it("should return 401 Unauthorized when session has no user", async () => {
    mockAuth.mockResolvedValue({ user: null });

    const request = new Request("http://localhost:3000/api/test", {
      method: "GET",
    });

    const result = await requireRole(request, ["admin"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const data = await result.response.json();
      expect(result.response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    }
  });

  it("should return 403 Forbidden when user role is not in allowed roles", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", role: "player" },
    });

    const request = new Request("http://localhost:3000/api/admin", {
      method: "GET",
    });

    const result = await requireRole(request, ["admin"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const data = await result.response.json();
      expect(result.response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    }
  });

  it("should return 403 Forbidden when coach tries to access admin-only route", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", role: "coach" },
    });

    const request = new Request("http://localhost:3000/api/admin/users", {
      method: "GET",
    });

    const result = await requireRole(request, ["admin"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const data = await result.response.json();
      expect(result.response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    }
  });

  it("should authorize admin for admin-only routes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", role: "admin" },
    });

    const request = new Request("http://localhost:3000/api/admin", {
      method: "GET",
    });

    const result = await requireRole(request, ["admin"]);

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("admin-123");
      expect(result.userRole).toBe("admin");
    }
  });

  it("should authorize admin for coach routes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", role: "admin" },
    });

    const request = new Request("http://localhost:3000/api/coach", {
      method: "GET",
    });

    const result = await requireRole(request, ["coach", "admin"]);

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("admin-123");
      expect(result.userRole).toBe("admin");
    }
  });

  it("should authorize coach for coach routes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "coach-123", role: "coach" },
    });

    const request = new Request("http://localhost:3000/api/coach", {
      method: "GET",
    });

    const result = await requireRole(request, ["coach", "admin"]);

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("coach-123");
      expect(result.userRole).toBe("coach");
    }
  });

  it("should authorize player for booking routes", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "player-123", role: "player" },
    });

    const request = new Request("http://localhost:3000/api/bookings", {
      method: "POST",
    });

    const result = await requireRole(request, ["player", "admin", "coach"]);

    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("player-123");
      expect(result.userRole).toBe("player");
    }
  });

  it("should authorize all roles for clubs/booking pages", async () => {
    const roles = ["player", "admin", "coach"] as const;
    
    for (const role of roles) {
      mockAuth.mockResolvedValue({
        user: { id: `${role}-123`, role },
      });

      const request = new Request("http://localhost:3000/api/clubs", {
        method: "GET",
      });

      const result = await requireRole(request, ["player", "admin", "coach"]);

      expect(result.authorized).toBe(true);
      if (result.authorized) {
        expect(result.userId).toBe(`${role}-123`);
        expect(result.userRole).toBe(role);
      }
    }
  });

  it("should return 403 Forbidden when user has no role defined", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123" },
    });

    const request = new Request("http://localhost:3000/api/test", {
      method: "GET",
    });

    const result = await requireRole(request, ["player"]);

    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const data = await result.response.json();
      expect(result.response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    }
  });
});
