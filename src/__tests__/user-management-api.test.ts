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
      delete: jest.fn(),
    },
    userClub: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    club: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
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

import { GET, POST } from "../app/api/admin/users/route";
import { GET as getUser, PUT, DELETE } from "../app/api/admin/users/[userId]/route";
import { prisma } from "@/lib/prisma";

describe("User Management API", () => {
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

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "super_admin" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return users with Super Admin and Admin roles for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const mockUsers = [
        {
          id: "user-1",
          name: "Super Admin One",
          email: "superadmin@test.com",
          role: "super_admin",
          createdAt: new Date().toISOString(),
          userClubs: [
            { id: "uc-1", club: { id: "club-1", name: "Club One" } },
          ],
        },
        {
          id: "user-2",
          name: "Admin One",
          email: "admin@test.com",
          role: "admin",
          createdAt: new Date().toISOString(),
          userClubs: [
            { id: "uc-2", club: { id: "club-2", name: "Club Two" } },
          ],
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
      expect(data[0].name).toBe("Super Admin One");
      expect(data[0].clubs).toHaveLength(1);
      expect(data[0].clubs[0].name).toBe("Club One");
    });

    it("should filter users by search query", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
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
        user: { id: "root-admin-123", role: "root_admin" },
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/users?role=super_admin",
        { method: "GET" }
      );

      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: ["super_admin"] },
          }),
        })
      );
    });
  });

  describe("POST /api/admin/users", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "newuser@test.com",
          password: "password123",
          role: "admin",
          clubIds: ["club-1"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "super_admin" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "newuser@test.com",
          password: "password123",
          role: "admin",
          clubIds: ["club-1"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should create a new admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const newUser = {
        id: "new-user-id",
        name: "New Admin",
        email: "newadmin@test.com",
        role: "admin",
        createdAt: new Date().toISOString(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        { id: "club-1", name: "Club One" },
      ]);
      (prisma.$transaction as jest.Mock).mockResolvedValue(newUser);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Admin",
          email: "newadmin@test.com",
          password: "password123",
          role: "admin",
          clubIds: ["club-1"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Admin");
      expect(data.role).toBe("admin");
    });

    it("should return 400 when email already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: "existing@test.com",
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "existing@test.com",
          password: "password123",
          role: "admin",
          clubIds: ["club-1"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("A user with this email already exists");
    });

    it("should return 400 when password is too short", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "newuser@test.com",
          password: "short",
          role: "admin",
          clubIds: ["club-1"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 8 characters");
    });

    it("should return 400 when admin is assigned to multiple clubs", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Admin",
          email: "newadmin@test.com",
          password: "password123",
          role: "admin",
          clubIds: ["club-1", "club-2"],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Admin can only be assigned to a single club");
    });

    it("should return 400 when no clubs are assigned", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New Admin",
          email: "newadmin@test.com",
          password: "password123",
          role: "admin",
          clubIds: [],
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one club must be assigned");
    });
  });

  describe("GET /api/admin/users/[userId]", () => {
    it("should return 404 when user not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/users/nonexistent",
        { method: "GET" }
      );

      const response = await getUser(request, {
        params: Promise.resolve({ userId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return user with clubs", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const mockUser = {
        id: "user-1",
        name: "Super Admin",
        email: "superadmin@test.com",
        role: "super_admin",
        createdAt: new Date().toISOString(),
        userClubs: [
          { id: "uc-1", club: { id: "club-1", name: "Club One" } },
        ],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-1",
        { method: "GET" }
      );

      const response = await getUser(request, {
        params: Promise.resolve({ userId: "user-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Super Admin");
      expect(data.clubs).toHaveLength(1);
    });
  });

  describe("PUT /api/admin/users/[userId]", () => {
    it("should update user details", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const existingUser = {
        id: "user-1",
        name: "Old Name",
        email: "old@test.com",
        role: "admin",
        userClubs: [{ id: "uc-1", clubId: "club-1" }],
      };

      const updatedUser = {
        id: "user-1",
        name: "New Name",
        email: "old@test.com",
        role: "admin",
        createdAt: new Date().toISOString(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.$transaction as jest.Mock).mockResolvedValue({
        ...updatedUser,
        clubs: [{ id: "club-1", name: "Club One" }],
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "New Name" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ userId: "user-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("New Name");
    });

    it("should return 403 when trying to edit non-admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const playerUser = {
        id: "player-1",
        name: "Player",
        email: "player@test.com",
        role: "player",
        userClubs: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(playerUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/player-1",
        {
          method: "PUT",
          body: JSON.stringify({ name: "New Name" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ userId: "player-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Can only edit Super Admin or Admin users");
    });
  });

  describe("DELETE /api/admin/users/[userId]", () => {
    it("should delete user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const existingUser = {
        id: "user-1",
        name: "Admin",
        email: "admin@test.com",
        role: "admin",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.delete as jest.Mock).mockResolvedValue(existingUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-1",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ userId: "user-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 403 when trying to delete non-admin user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      const playerUser = {
        id: "player-1",
        name: "Player",
        email: "player@test.com",
        role: "player",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(playerUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/player-1",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ userId: "player-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Can only delete Super Admin or Admin users");
    });

    it("should return 404 when user not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin-123", role: "root_admin" },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/users/nonexistent",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ userId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });
  });
});
