/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET, POST } from "@/app/api/admin/organizations/route";
import { POST as AssignAdmin } from "@/app/api/admin/organizations/assign-admin/route";
import { PATCH as SetOwner } from "@/app/api/admin/organizations/set-owner/route";
import { POST as RemoveAdmin } from "@/app/api/admin/organizations/remove-admin/route";
import { GET as GetUsers } from "@/app/api/admin/users/route";
import { prisma } from "@/lib/prisma";

describe("Admin Organizations API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/organizations", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return organizations list for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockOrganizations = [
        {
          id: "org-1",
          name: "Test Org",
          slug: "test-org",
          createdAt: new Date().toISOString(),
          _count: { clubs: 5 },
          createdBy: { id: "user-1", name: "Creator", email: "creator@test.com" },
          memberships: [
            {
              user: { id: "admin-1", name: "Super Admin", email: "admin@test.com" },
            },
          ],
        },
      ];

      (prisma.organization.findMany as jest.Mock).mockResolvedValue(mockOrganizations);

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Test Org");
      expect(data[0].clubCount).toBe(5);
      expect(data[0].superAdmin?.name).toBe("Super Admin");
    });

    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/admin/organizations", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "New Org" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization name is required");
    });

    it("should return 409 when slug already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-org",
        slug: "test-org",
      });

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Test Org", slug: "test-org" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("An organization with this slug already exists");
    });

    it("should create organization for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const newOrg = {
        id: "new-org-id",
        name: "New Organization",
        slug: "new-organization",
        createdAt: new Date().toISOString(),
        createdBy: { id: "admin-123", name: "Admin", email: "admin@test.com" },
      };

      (prisma.organization.create as jest.Mock).mockResolvedValue(newOrg);

      const request = new Request("http://localhost:3000/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "New Organization" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Organization");
      expect(data.slug).toBe("new-organization");
    });
  });

  describe("POST /api/admin/organizations/assign-admin", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org-1", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when organizationId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization ID is required");
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "non-existent", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });

    it("should assign existing user as SuperAdmin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.membership.count as jest.Mock).mockResolvedValue(0);
      (prisma.membership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org-1", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("SuperAdmin assigned successfully");
    });

    it("should return 409 when user is already admin of this org", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org-1", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already a SuperAdmin");
    });

    it("should create new user and assign as SuperAdmin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      // No existing user with this email
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // First call: check if email exists
        .mockResolvedValueOnce({ // Second call: fetch assigned user
          id: "new-user-id",
          name: "New Admin",
          email: "newadmin@test.com",
        });

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-id",
        name: "New Admin",
        email: "newadmin@test.com",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.membership.count as jest.Mock).mockResolvedValue(0);
      (prisma.membership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "new-user-id",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({
          organizationId: "org-1",
          createNew: true,
          name: "New Admin",
          email: "newadmin@test.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 409 when email already exists for new user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      // Existing user with this email
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user",
        email: "existing@test.com",
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({
          organizationId: "org-1",
          createNew: true,
          name: "New Admin",
          email: "existing@test.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("A user with this email already exists");
    });

    it("should return 400 for invalid email format", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({
          organizationId: "org-1",
          createNew: true,
          name: "New Admin",
          email: "invalid-email",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid email format");
    });

    it("should return 400 for password too short", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      // No existing user with this email
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/assign-admin", {
        method: "POST",
        body: JSON.stringify({
          organizationId: "org-1",
          createNew: true,
          name: "New Admin",
          email: "newadmin@test.com",
          password: "short",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AssignAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Password must be at least 8 characters");
    });
  });

  describe("GET /api/admin/users", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GetUsers(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return users list for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockUsers = [
        {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
          memberships: [],
        },
        {
          id: "user-2",
          name: "Admin User",
          email: "admin@example.com",
          memberships: [
            { organization: { name: "Org 1" } },
          ],
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const request = new Request("http://localhost:3000/api/admin/users", {
        method: "GET",
      });

      const response = await GetUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].isOrgAdmin).toBe(false);
      expect(data[1].isOrgAdmin).toBe(true);
      expect(data[1].organizationName).toBe("Org 1");
    });

    it("should filter users by search query", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/users?q=test", {
        method: "GET",
      });

      await GetUsers(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRoot: false,
            OR: [
              { name: { contains: "test", mode: "insensitive" } },
              { email: { contains: "test", mode: "insensitive" } },
            ],
          }),
        })
      );
    });
  });

  describe("PATCH /api/admin/organizations/set-owner", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/set-owner", {
        method: "PATCH",
        body: JSON.stringify({ organizationId: "org-1", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await SetOwner(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when organizationId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/set-owner", {
        method: "PATCH",
        body: JSON.stringify({ userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await SetOwner(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization ID is required");
    });

    it("should return 400 when userId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/set-owner", {
        method: "PATCH",
        body: JSON.stringify({ organizationId: "org-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await SetOwner(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User ID is required");
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/set-owner", {
        method: "PATCH",
        body: JSON.stringify({ organizationId: "non-existent", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await SetOwner(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });
  });

  describe("POST /api/admin/organizations/remove-admin", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/remove-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org-1", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await RemoveAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when organizationId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/remove-admin", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await RemoveAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization ID is required");
    });

    it("should return 400 when userId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/remove-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "org-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await RemoveAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("User ID is required");
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/remove-admin", {
        method: "POST",
        body: JSON.stringify({ organizationId: "non-existent", userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await RemoveAdmin(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });
  });
});
