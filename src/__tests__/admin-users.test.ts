/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

import { GET, POST } from "@/app/api/admin/users/route";
import { POST as updateRole } from "@/app/api/admin/users/[userId]/role/route";
import { prisma } from "@/lib/prisma";

describe("Admin Users API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/users", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return all users for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const mockUsers = [
        {
          id: "user-1",
          name: "Player One",
          email: "player@test.com",
          role: "player",
          createdAt: new Date().toISOString(),
        },
        {
          id: "user-2",
          name: "Coach One",
          email: "coach@test.com",
          role: "coach",
          createdAt: new Date().toISOString(),
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Player One");
    });

    it("should filter users by search query", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/users?search=test",
        { method: "GET" }
      );

      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "test", mode: "insensitive" } },
              { email: { contains: "test", mode: "insensitive" } },
            ],
          }),
        })
      );
    });

    it("should filter users by role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/users?role=coach",
        { method: "GET" }
      );

      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: "coach",
          }),
        })
      );
    });

    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      (prisma.user.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/admin/users", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Coach",
          email: "newcoach@test.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "coach" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Coach",
          email: "newcoach@test.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should create a new coach for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const newUser = {
        id: "new-coach-id",
        name: "New Coach",
        email: "newcoach@test.com",
        role: "coach",
        createdAt: new Date().toISOString(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Coach",
          email: "newcoach@test.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Coach");
      expect(data.role).toBe("coach");
    });

    it("should return 400 when email already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: "existing@test.com",
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Coach",
          email: "existing@test.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("A user with this email already exists");
    });

    it("should return 400 when required fields are missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ name: "Coach Only" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name, email, and password are required");
    });
  });

  describe("POST /api/admin/users/[userId]/role", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "coach" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "coach" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should update user role to coach", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        role: "player",
      };

      const updatedUser = {
        ...existingUser,
        role: "coach",
        createdAt: new Date().toISOString(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "coach" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe("coach");
    });

    it("should update user role to player (remove coach)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const existingUser = {
        id: "user-123",
        name: "Coach",
        email: "coach@test.com",
        role: "coach",
      };

      const updatedUser = {
        ...existingUser,
        role: "player",
        createdAt: new Date().toISOString(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "player" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe("player");
    });

    it("should return 404 when user not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/users/nonexistent/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "coach" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 403 when trying to modify admin role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const adminUser = {
        id: "admin-user",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(adminUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/admin-user/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "player" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "admin-user" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Cannot modify admin role");
    });

    it("should return 400 for invalid role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "invalid" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid role. Must be 'player' or 'coach'");
    });

    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ role: "coach" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
