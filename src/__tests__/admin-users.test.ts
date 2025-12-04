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
    coach: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    coachAvailability: {
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

import { GET, POST } from "../../archived_features/api/admin/users/route";
import { POST as updateRole } from "../../archived_features/api/admin/users/[userId]/role/route";
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
        user: { id: "user-123", isRoot: false },
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
        user: { id: "admin-123", isRoot: true },
      });

      const mockUsers = [
        {
          id: "user-1",
          name: "Player One",
          email: "player@test.com",
          isRoot: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "user-2",
          name: "Coach One",
          email: "coach@test.com",
          isRoot: false,
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
        user: { id: "admin-123", isRoot: true },
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
        user: { id: "admin-123", isRoot: true },
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
            isRoot: false,
          }),
        })
      );
    });

    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
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
        user: { id: "user-123", isRoot: false },
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
        user: { id: "admin-123", isRoot: true },
      });

      const newUser = {
        id: "new-coach-id",
        name: "New Coach",
        email: "newcoach@test.com",
        isRoot: false,
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
        user: { id: "admin-123", isRoot: true },
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
        user: { id: "admin-123", isRoot: true },
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
          body: JSON.stringify({ isRoot: false }),
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
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false }),
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
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
      };

      const updatedUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
        createdAt: new Date().toISOString(),
      };

      const newCoach = {
        id: "coach-123",
        userId: "user-123",
        clubId: "club-123",
        bio: null,
        phone: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([{ id: "club-123" }]);

      // Mock the transaction to execute the callback with mocked tx object
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue(updatedUser),
          },
          coach: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue(newCoach),
          },
          coachAvailability: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        // First call to findMany returns existing coaches (empty)
        // Second call returns the newly created coaches
        tx.coach.findMany
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([newCoach]);
        return fn(tx);
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false, clubIds: ["club-123"] }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("coach");
      expect(data.coaches).toHaveLength(1);
      expect(data.coaches[0].userId).toBe("user-123");
    });

    it("should update user role to coach and create coach with optional fields", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
      };

      const updatedUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
        createdAt: new Date().toISOString(),
      };

      const newCoach = {
        id: "coach-123",
        userId: "user-123",
        clubId: "club-123",
        bio: "Professional tennis coach",
        phone: "123-456-7890",
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([{ id: "club-123" }]);

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue(updatedUser),
          },
          coach: {
            findMany: jest.fn()
              .mockResolvedValueOnce([])
              .mockResolvedValueOnce([newCoach]),
            create: jest.fn().mockResolvedValue(newCoach),
          },
          coachAvailability: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return fn(tx);
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({
            isRoot: false,
            clubIds: ["club-123"],
            bio: "Professional tennis coach",
            phone: "123-456-7890"
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("coach");
      expect(data.coaches).toHaveLength(1);
    });

    it("should not create duplicate coach record when already exists for same club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
      };

      const updatedUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
        createdAt: new Date().toISOString(),
      };

      const existingCoach = {
        id: "coach-123",
        userId: "user-123",
        clubId: "club-123",
        bio: null,
        phone: null,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([{ id: "club-123" }]);

      const mockCoachCreate = jest.fn();
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue(updatedUser),
          },
          coach: {
            findMany: jest.fn()
              .mockResolvedValueOnce([existingCoach])
              .mockResolvedValueOnce([existingCoach]),
            create: mockCoachCreate,
          },
          coachAvailability: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return fn(tx);
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false, clubIds: ["club-123"] }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("coach");
      expect(data.coaches).toHaveLength(1);
      expect(data.coaches[0].id).toBe("coach-123");
      expect(data.coaches[0].clubId).toBe("club-123");
      expect(mockCoachCreate).not.toHaveBeenCalled();
    });

    it("should update user role to player (remove coach)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Coach",
        email: "coach@test.com",
        isRoot: false,
      };

      const updatedUser = {
        id: "user-123",
        name: "Coach",
        email: "coach@test.com",
        isRoot: false,
        createdAt: new Date().toISOString(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const mockCoachFindMany = jest.fn().mockResolvedValue([{ id: "coach-123" }]);
      const mockCoachAvailabilityDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockCoachDeleteMany = jest.fn().mockResolvedValue({ count: 1 });

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue(updatedUser),
          },
          coachAvailability: {
            deleteMany: mockCoachAvailabilityDeleteMany,
          },
          coach: {
            findMany: mockCoachFindMany,
            deleteMany: mockCoachDeleteMany,
          },
        };
        return fn(tx);
      });

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.role).toBe("player");
      expect(data.coaches).toEqual([]);
      expect(mockCoachAvailabilityDeleteMany).toHaveBeenCalled();
      expect(mockCoachDeleteMany).toHaveBeenCalled();
    });

    it("should return 404 when user not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/users/nonexistent/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false }),
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
        user: { id: "admin-123", isRoot: true },
      });

      const adminUser = {
        id: "admin-user",
        name: "Admin",
        email: "admin@test.com",
        isRoot: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(adminUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/admin-user/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false }),
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
        user: { id: "admin-123", isRoot: true },
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

    it("should return 400 when assigning coach role without clubIds", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one club must be selected when assigning coach role");
    });

    it("should return 400 when assigning coach role with empty clubIds array", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false, clubIds: [] }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one club must be selected when assigning coach role");
    });

    it("should return 400 when selected clubs do not exist", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingUser = {
        id: "user-123",
        name: "Player",
        email: "player@test.com",
        isRoot: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]); // No clubs found

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false, clubIds: ["nonexistent-club"] }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await updateRole(request, {
        params: Promise.resolve({ userId: "user-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("One or more selected clubs do not exist");
    });

    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request(
        "http://localhost:3000/api/admin/users/user-123/role",
        {
          method: "POST",
          body: JSON.stringify({ isRoot: false }),
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
