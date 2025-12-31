/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "@/app/api/admin/organizations/[id]/summary/route";
import { prisma } from "@/lib/prisma";

describe("Organization Summary API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/organizations/[id]/summary", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/test-id/summary", {
        method: "GET",
      });

      const params = Promise.resolve({ id: "test-id" });
      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          email: "admin@example.com",
          isRoot: true,
        },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/organizations/test-id/summary", {
        method: "GET",
      });

      const params = Promise.resolve({ id: "test-id" });
      const response = await GET(request, { params });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Organization not found");
    });

    it("should return only id, name, slug for organization summary", async () => {
      const mockOrganization = {
        id: "org-1",
        name: "Test Organization",
        slug: "test-org",
        description: "This is a test organization",
        contactEmail: "contact@test.com",
        contactPhone: "+1234567890",
        metadata: JSON.stringify({ key: "value" }),
        logoData: JSON.stringify({ url: "logo.png" }),
        bannerData: JSON.stringify({ url: "banner.png" }),
      };

      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          email: "admin@example.com",
          isRoot: true,
        },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new Request("http://localhost:3000/api/admin/organizations/org-1/summary", {
        method: "GET",
      });

      const params = Promise.resolve({ id: "org-1" });
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should only return id, name, slug
      expect(data).toEqual({
        id: "org-1",
        name: "Test Organization",
        slug: "test-org",
      });

      // Should not include other fields
      expect(data.description).toBeUndefined();
      expect(data.contactEmail).toBeUndefined();
      expect(data.contactPhone).toBeUndefined();
      expect(data.metadata).toBeUndefined();
      expect(data.logoData).toBeUndefined();
      expect(data.bannerData).toBeUndefined();
      expect(data.metrics).toBeUndefined();
      expect(data.clubsPreview).toBeUndefined();
    });

    it("should call findUnique with minimal select fields", async () => {
      const mockOrganization = {
        id: "org-1",
        name: "Test Organization",
        slug: "test-org",
      };

      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          email: "admin@example.com",
          isRoot: true,
        },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new Request("http://localhost:3000/api/admin/organizations/org-1/summary", {
        method: "GET",
      });

      const params = Promise.resolve({ id: "org-1" });
      await GET(request, { params });

      // Verify that findUnique was called with only id, name, slug in select
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: "org-1" },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });
    });
  });
});
