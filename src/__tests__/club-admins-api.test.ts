/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET, POST } from "@/app/api/orgs/[orgId]/club-admins/route";
import { PUT, DELETE } from "@/app/api/orgs/[orgId]/club-admins/[clubAdminId]/route";
import { prisma } from "@/lib/prisma";

describe("Club Admins API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/orgs/[orgId]/club-admins", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin or org admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/non-existent/club-admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ orgId: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });

    it("should return club admins list for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        { id: "club-1" },
        { id: "club-2" },
      ]);

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        {
          id: "membership-1",
          user: { id: "user-1", name: "Club Admin 1", email: "admin1@test.com" },
          club: { id: "club-1", name: "Club One" },
          createdAt: new Date().toISOString(),
        },
      ]);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].userName).toBe("Club Admin 1");
      expect(data[0].clubName).toBe("Club One");
    });

    it("should return club admins list for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId: "org-admin-123",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        { id: "club-1" },
      ]);

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });
  });

  describe("POST /api/orgs/[orgId]/club-admins", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1", clubId: "club-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when clubId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Club ID is required");
    });

    it("should return 400 when neither userId nor email is provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-1",
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ clubId: "club-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Either userId or email is required");
    });

    it("should return 403 when club does not belong to organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-2", // Different org
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1", clubId: "club-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Club does not belong to this organization");
    });

    it("should return 409 when user is already club admin of this club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-1",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1", clubId: "club-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already a Club Admin");
    });

    it("should assign existing user as club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-1",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
        createdAt: new Date().toISOString(),
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
        club: { id: "club-1", name: "Club One" },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1", clubId: "club-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.clubAdmin.userName).toBe("Test User");
    });

    it("should create new user and assign as club admin when email provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-1",
      });

      // No existing user with this email
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-id",
        name: "New Admin",
        email: "newadmin@test.com",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "new-user-id",
        clubId: "club-1",
        role: "CLUB_ADMIN",
        createdAt: new Date().toISOString(),
        user: { id: "new-user-id", name: "New Admin", email: "newadmin@test.com" },
        club: { id: "club-1", name: "Club One" },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ 
          email: "newadmin@test.com", 
          name: "New Admin",
          clubId: "club-1" 
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("should return 403 when org admin tries to assign to club in foreign org", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId: "org-admin-123",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        organizationId: "org-2", // Different org
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1", clubId: "club-1" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Club does not belong to this organization");
    });
  });

  describe("PUT /api/orgs/[orgId]/club-admins/[clubAdminId]", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/membership-1", {
        method: "PUT",
        body: JSON.stringify({ clubId: "club-2" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PUT(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "membership-1" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when clubId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/membership-1", {
        method: "PUT",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PUT(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "membership-1" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Club ID is required");
    });

    it("should return 404 when club admin membership not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/non-existent", {
        method: "PUT",
        body: JSON.stringify({ clubId: "club-2" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PUT(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "non-existent" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club admin membership not found");
    });

    it("should update club admin to different club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.clubMembership.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: "membership-1",
          userId: "user-1",
          clubId: "club-1",
          club: { id: "club-1", organizationId: "org-1" },
        })
        .mockResolvedValueOnce(null); // No duplicate in target club

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-2",
        organizationId: "org-1",
      });

      (prisma.clubMembership.update as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-2",
        createdAt: new Date().toISOString(),
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
        club: { id: "club-2", name: "Club Two" },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/membership-1", {
        method: "PUT",
        body: JSON.stringify({ clubId: "club-2" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await PUT(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "membership-1" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.clubAdmin.clubId).toBe("club-2");
    });
  });

  describe("DELETE /api/orgs/[orgId]/club-admins/[clubAdminId]", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/membership-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "membership-1" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when club admin membership not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/non-existent", {
        method: "DELETE",
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "non-existent" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club admin membership not found");
    });

    it("should return 400 when membership is not CLUB_ADMIN role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "MEMBER", // Not CLUB_ADMIN
        club: { id: "club-1", organizationId: "org-1" },
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/membership-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "membership-1" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Membership is not a Club Admin role");
    });

    it("should remove club admin successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
        club: { id: "club-1", name: "Club One", organizationId: "org-1" },
        user: { id: "user-1", name: "Test User", email: "test@example.com" },
      });

      (prisma.clubMembership.delete as jest.Mock).mockResolvedValue({
        id: "membership-1",
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/club-admins/membership-1", {
        method: "DELETE",
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ orgId: "org-1", clubAdminId: "membership-1" }) 
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.removedAdmin.userName).toBe("Test User");
    });
  });
});
