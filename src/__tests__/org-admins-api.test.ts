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
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    club: {
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
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

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn(() => Promise.resolve("hashed-password")),
}));

import { GET, POST, DELETE } from "@/app/api/admin/organizations/[id]/admins/route";
import { PATCH as SetOwner } from "@/app/api/admin/organizations/[id]/admins/owner/route";
import { prisma } from "@/lib/prisma";
import { MembershipRole } from "@/constants/roles";

describe("Organization Admins API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/organizations/[id]/admins", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/admins");
      const response = await GET(request, {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not authorized", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/orgs/org-1/admins");
      const response = await GET(request, {
        params: Promise.resolve({ orgId: "org-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

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
          id: "member-1",
          userId: "user-1",
          isPrimaryOwner: true,
          createdAt: new Date(),
          user: {
            id: "user-1",
            name: "Owner User",
            email: "owner@test.com",
          },
        },
      ]);

      const request = new Request("http://localhost:3000/api/admin/organizations/org-1/admins");
      const response = await GET(request, {
        params: Promise.resolve({ id: "org-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].role).toBe("owner");
      expect(data[0].entity.type).toBe("organization");
    });
  });

  describe("POST /api/admin/organizations/[id]/admins", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-1",
          }),
        }
      );
      const response = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "POST",
          body: JSON.stringify({
            userId: "user-1",
          }),
        }
      );
      const response = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should assign existing user as org admin", async () => {
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
        id: "member-1",
        userId: "user-1",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: true,
      });

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "POST",
          body: JSON.stringify({
            createNew: false,
            userId: "user-1",
          }),
        }
      );
      const response = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.superAdmin.isPrimaryOwner).toBe(true);
    });

    it("should prevent duplicate admin assignment", async () => {
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
        id: "member-1",
        userId: "user-1",
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "POST",
          body: JSON.stringify({
            createNew: false,
            userId: "user-1",
          }),
        }
      );
      const response = await POST(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already a SuperAdmin");
    });
  });

  describe("DELETE /api/admin/organizations/[id]/admins", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "DELETE",
          body: JSON.stringify({
            userId: "user-1",
          }),
        }
      );
      const response = await DELETE(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should remove org admin successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: false,
      });

      (prisma.membership.delete as jest.Mock).mockResolvedValue({});

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "DELETE",
          body: JSON.stringify({
            userId: "user-1",
          }),
        }
      );
      const response = await DELETE(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should prevent removing primary owner with other admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: true,
      });

      (prisma.membership.count as jest.Mock).mockResolvedValue(2); // Multiple admins

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins",
        {
          method: "DELETE",
          body: JSON.stringify({
            userId: "user-1",
          }),
        }
      );
      const response = await DELETE(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("primary owner");
    });
  });

  describe("PATCH /api/admin/organizations/set-owner", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins/owner",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "user-2",
          }),
        }
      );
      const response = await SetOwner(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should transfer ownership successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        id: "member-2",
        userId: "user-2",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: false,
      });

      (prisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-2",
        name: "New Owner",
        email: "newowner@test.com",
      });

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins/owner",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "user-2",
          }),
        }
      );
      const response = await SetOwner(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.newOwner.id).toBe("user-2");
    });

    it("should prevent setting non-admin as owner", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-1",
        name: "Test Org",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/organizations/org-1/admins/owner",
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: "user-2",
          }),
        }
      );
      const response = await SetOwner(request, { params: Promise.resolve({ id: "org-1" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("SuperAdmin");
    });
  });
});
