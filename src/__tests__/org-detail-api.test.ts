/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    club: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    court: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET, PUT } from "@/app/api/orgs/[orgId]/route";
import { POST as Archive } from "@/app/api/orgs/[orgId]/archive/route";
import { POST as ReassignSuperAdmin } from "@/app/api/orgs/[orgId]/reassign-superadmin/route";
import { GET as GetClubs } from "@/app/api/orgs/[orgId]/clubs/route";
import { GET as GetAdmins } from "@/app/api/orgs/[orgId]/admins/route";
import { GET as GetActivity } from "@/app/api/orgs/[orgId]/activity/route";
import { GET as GetUsers } from "@/app/api/orgs/[orgId]/users/route";
import { prisma } from "@/lib/prisma";

describe("Organization Detail API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/orgs/[orgId]", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1");
      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not authorized", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1");
      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 200 for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockOrg = {
        id: "org-1",
        name: "Test Org",
        slug: "test-org",
        contactEmail: "test@org.com",
        contactPhone: null,
        website: null,
        address: null,
        metadata: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: "user-1", name: "Creator", email: "creator@test.com" },
        memberships: [
          {
            id: "m-1",
            isPrimaryOwner: true,
            user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
          },
        ],
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);
      (prisma.club.count as jest.Mock).mockResolvedValue(5);
      (prisma.court.count as jest.Mock).mockResolvedValue(10);
      (prisma.booking.count as jest.Mock).mockResolvedValue(20);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([{ userId: "u-1" }, { userId: "u-2" }]);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        {
          id: "club-1",
          name: "Club 1",
          slug: "club-1",
          city: "City",
          isPublic: true,
          createdAt: new Date(),
          _count: { courts: 2, clubMemberships: 1 },
        },
      ]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/orgs/org-1");
      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("org-1");
      expect(data.name).toBe("Test Org");
      expect(data.metrics.totalClubs).toBe(5);
      expect(data.metrics.totalCourts).toBe(10);
      expect(data.metrics.activeBookings).toBe(20);
      expect(data.superAdmins).toHaveLength(1);
    });

    it("should return 200 for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        role: "ORGANIZATION_ADMIN",
      });

      const mockOrg = {
        id: "org-1",
        name: "Test Org",
        slug: "test-org",
        contactEmail: null,
        contactPhone: null,
        website: null,
        address: null,
        metadata: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: "user-1", name: "Creator", email: "creator@test.com" },
        memberships: [],
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);
      (prisma.club.count as jest.Mock).mockResolvedValue(0);
      (prisma.court.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/orgs/org-1");
      const response = await GET(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("org-1");
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/non-existent");
      const response = await GET(request, { params: Promise.resolve({ orgId: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });
  });

  describe("PUT /api/orgs/[orgId]", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1", {
        method: "PUT",
        body: JSON.stringify({ name: "New Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should update organization for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingOrg = {
        id: "org-1",
        name: "Old Name",
        slug: "old-name",
        archivedAt: null,
      };

      (prisma.organization.findUnique as jest.Mock)
        .mockResolvedValueOnce(existingOrg)
        .mockResolvedValueOnce(null);

      (prisma.organization.update as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "New Name",
        slug: "new-name",
        contactEmail: null,
        contactPhone: null,
        website: null,
        address: null,
        metadata: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: "admin-123", name: "Admin", email: "admin@test.com" },
        _count: { clubs: 0 },
      });

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = new Request("http://localhost:3000/api/orgs/org-1", {
        method: "PUT",
        body: JSON.stringify({ name: "New Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("New Name");
    });

    it("should return 400 when updating archived organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Old Name",
        slug: "old-name",
        archivedAt: new Date(),
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1", {
        method: "PUT",
        body: JSON.stringify({ name: "New Name" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await PUT(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot update archived organization");
    });
  });

  describe("POST /api/orgs/[orgId]/archive", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/archive", {
        method: "POST",
      });
      const response = await Archive(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should archive organization successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        archivedAt: null,
        _count: { clubs: 2 },
      });

      (prisma.organization.update as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        slug: "test-org",
        archivedAt: new Date(),
        createdAt: new Date(),
        createdBy: { id: "admin-123", name: "Admin", email: "admin@test.com" },
        _count: { clubs: 2 },
      });

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = new Request("http://localhost:3000/api/orgs/org-1/archive", {
        method: "POST",
      });
      const response = await Archive(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Organization archived successfully");
    });

    it("should return 400 when already archived", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        archivedAt: new Date(),
        _count: { clubs: 2 },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/archive", {
        method: "POST",
      });
      const response = await Archive(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization is already archived");
    });
  });

  describe("POST /api/orgs/[orgId]/reassign-superadmin", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/reassign-superadmin", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await ReassignSuperAdmin(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost:3000/api/orgs/org-1/reassign-superadmin", {
        method: "POST",
        body: JSON.stringify({ userId: "user-1" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await ReassignSuperAdmin(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should reassign owner successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
        archivedAt: null,
        memberships: [
          {
            id: "m-1",
            isPrimaryOwner: true,
            user: { id: "old-owner", name: "Old Owner", email: "old@test.com" },
          },
        ],
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "new-owner",
        name: "New Owner",
        email: "new@test.com",
      });

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          membership: {
            update: jest.fn().mockResolvedValue({}),
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(txMock);
      });

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      const request = new Request("http://localhost:3000/api/orgs/org-1/reassign-superadmin", {
        method: "POST",
        body: JSON.stringify({ userId: "new-owner" }),
        headers: { "Content-Type": "application/json" },
      });
      const response = await ReassignSuperAdmin(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("GET /api/orgs/[orgId]/clubs", () => {
    it("should return clubs list for authorized user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        {
          id: "club-1",
          name: "Club 1",
          slug: "club-1",
          shortDescription: "Description",
          location: "Location",
          city: "City",
          country: "Country",
          phone: null,
          email: null,
          website: null,
          isPublic: true,
          logo: null,
          heroImage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { courts: 2, clubMemberships: 1 },
          createdBy: { id: "user-1", name: "Creator", email: "creator@test.com" },
        },
      ]);

      (prisma.club.count as jest.Mock).mockResolvedValue(1);

      const request = new Request("http://localhost:3000/api/orgs/org-1/clubs");
      const response = await GetClubs(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });
  });

  describe("GET /api/orgs/[orgId]/admins", () => {
    it("should return admins list for authorized user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        {
          id: "m-1",
          isPrimaryOwner: true,
          createdAt: new Date(),
          user: { id: "admin-1", name: "Admin", email: "admin@test.com", lastLoginAt: null },
        },
      ]);

      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        { id: "club-1", name: "Club 1" },
      ]);

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/orgs/org-1/admins");
      const response = await GetAdmins(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.superAdmins).toHaveLength(1);
      expect(data.summary.totalSuperAdmins).toBe(1);
    });
  });

  describe("GET /api/orgs/[orgId]/activity", () => {
    it("should return activity log for authorized user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: "log-1",
          action: "org.update",
          actorId: "admin-123",
          detail: JSON.stringify({ changes: { name: "New Name" } }),
          createdAt: new Date(),
        },
      ]);

      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-123", name: "Admin", email: "admin@test.com" },
      ]);

      const request = new Request("http://localhost:3000/api/orgs/org-1/activity");
      const response = await GetActivity(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].action).toBe("org.update");
    });
  });

  describe("GET /api/orgs/[orgId]/users", () => {
    it("should return users preview for authorized user", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.club.findMany as jest.Mock).mockResolvedValue([
        { id: "club-1" },
      ]);

      (prisma.court.findMany as jest.Mock).mockResolvedValue([
        { id: "court-1" },
      ]);

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          userId: "user-1",
          user: {
            id: "user-1",
            name: "User",
            email: "user@test.com",
            lastLoginAt: null,
            createdAt: new Date(),
          },
          createdAt: new Date(),
        },
      ]);

      (prisma.booking.groupBy as jest.Mock)
        .mockResolvedValueOnce([{ userId: "user-1" }])
        .mockResolvedValueOnce([]);

      const request = new Request("http://localhost:3000/api/orgs/org-1/users");
      const response = await GetUsers(request, { params: Promise.resolve({ orgId: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.summary.totalUsers).toBe(1);
    });
  });
});
