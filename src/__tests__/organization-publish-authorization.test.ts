/**
 * @jest-environment node
 * 
 * Tests for server-side publish authorization
 * Ensures only root admins can update isPublic field for organizations
 */

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/requireRole", () => ({
  requireOrganizationAdmin: jest.fn(),
}));

jest.mock("@/lib/auditLog", () => ({
  auditLog: jest.fn(),
  AuditAction: {
    ORG_UPDATE: "ORG_UPDATE",
  },
  TargetType: {
    ORGANIZATION: "ORGANIZATION",
  },
}));

import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { PATCH } from "@/app/api/admin/organizations/[id]/route";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequireOrganizationAdmin = requireOrganizationAdmin as jest.MockedFunction<typeof requireOrganizationAdmin>;

describe("Organization API - isPublic field protection", () => {
  const mockOrganizationId = "org-123";
  const mockUserId = "user-123";
  
  const mockOrganization = {
    id: mockOrganizationId,
    name: "Test Organization",
    slug: "test-organization",
    isPublic: true,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.organization.findUnique.mockResolvedValue(mockOrganization as any);
  });

  describe("Root Admin - isPublic updates", () => {
    beforeEach(() => {
      mockRequireOrganizationAdmin.mockResolvedValue({
        authorized: true,
        userId: mockUserId,
        isRoot: true,
        userRole: "root_admin",
      });
    });

    it("should allow root admin to publish organization", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });

      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrganization,
        isPublic: true,
        createdBy: { id: mockUserId, name: "Admin", email: "admin@example.com" },
        _count: { clubs: 0 },
      } as any);

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isPublic).toBe(true);
    });

    it("should allow root admin to unpublish organization", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: false }),
      });

      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrganization,
        isPublic: false,
        createdBy: { id: mockUserId, name: "Admin", email: "admin@example.com" },
        _count: { clubs: 0 },
      } as any);

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isPublic).toBe(false);
    });

    it("should allow root admin to update other fields along with isPublic", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Organization",
          isPublic: false,
        }),
      });

      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrganization,
        name: "Updated Organization",
        isPublic: false,
        createdBy: { id: mockUserId, name: "Admin", email: "admin@example.com" },
        _count: { clubs: 0 },
      } as any);

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Updated Organization");
      expect(data.isPublic).toBe(false);
    });
  });

  describe("Organization Admin - isPublic updates", () => {
    beforeEach(() => {
      mockRequireOrganizationAdmin.mockResolvedValue({
        authorized: true,
        userId: mockUserId,
        isRoot: false,
        userRole: "ORGANIZATION_ADMIN",
      });
    });

    it("should prevent organization admin from publishing organization", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Only root admins can publish/unpublish organizations");
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it("should prevent organization admin from unpublishing organization", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: false }),
      });

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Only root admins can publish/unpublish organizations");
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it("should allow organization admin to update other fields without isPublic", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Organization",
          description: "New description",
        }),
      });

      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrganization,
        name: "Updated Organization",
        description: "New description",
        createdBy: { id: mockUserId, name: "Admin", email: "admin@example.com" },
        _count: { clubs: 0 },
      } as any);

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Updated Organization");
      expect(mockPrisma.organization.update).toHaveBeenCalled();
    });

    it("should prevent organization admin from updating isPublic even when updating other fields", async () => {
      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Organization",
          isPublic: false,
        }),
      });

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Only root admins can publish/unpublish organizations");
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle isPublic being undefined (not in request body)", async () => {
      mockRequireOrganizationAdmin.mockResolvedValue({
        authorized: true,
        userId: mockUserId,
        isRoot: false,
        userRole: "ORGANIZATION_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Organization" }),
      });

      mockPrisma.organization.update.mockResolvedValue({
        ...mockOrganization,
        name: "Updated Organization",
        createdBy: { id: mockUserId, name: "Admin", email: "admin@example.com" },
        _count: { clubs: 0 },
      } as any);

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      expect(response.status).toBe(200);
      expect(mockPrisma.organization.update).toHaveBeenCalled();
    });

    it("should handle isPublic being null", async () => {
      mockRequireOrganizationAdmin.mockResolvedValue({
        authorized: true,
        userId: mockUserId,
        isRoot: false,
        userRole: "ORGANIZATION_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/admin/organizations/org-123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: null }),
      });

      const params = Promise.resolve({ id: mockOrganizationId });
      const response = await PATCH(request, { params });

      // null is not undefined, so it should be blocked
      expect(response.status).toBe(403);
    });
  });
});
