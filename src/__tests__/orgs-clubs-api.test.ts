/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    club: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "@/app/api/orgs/[orgId]/clubs/route";
import { prisma } from "@/lib/prisma";

describe("Organization Clubs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/orgs/[orgId]/clubs", () => {
    const mockOrgId = "org-123";

    it("should return 401 for unauthenticated users", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 for non-admin users without org membership", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "user-1",
          isRoot: false,
        },
      });
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when organization does not exist", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });

    it("should return clubs for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });

      const mockOrganization = {
        id: mockOrgId,
        name: "Test Organization",
        slug: "test-org",
      };

      const mockClubs = [
        {
          id: "club-1",
          name: "Club 1",
          slug: "club-1",
          organizationId: mockOrgId,
          shortDescription: "Test club 1",
          location: "Location 1",
          city: "City 1",
          country: "Country 1",
          phone: "123456789",
          email: "club1@example.com",
          website: "https://club1.com",
          isPublic: true,
          logo: null,
          heroImage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            courts: 2,
            clubMemberships: 1,
          },
          createdBy: {
            id: "user-1",
            name: "Creator",
            email: "creator@example.com",
          },
        },
        {
          id: "club-2",
          name: "Club 2",
          slug: "club-2",
          organizationId: mockOrgId,
          shortDescription: "Test club 2",
          location: "Location 2",
          city: "City 2",
          country: "Country 2",
          phone: "987654321",
          email: "club2@example.com",
          website: "https://club2.com",
          isPublic: false,
          logo: null,
          heroImage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            courts: 3,
            clubMemberships: 2,
          },
          createdBy: {
            id: "user-2",
            name: "Creator 2",
            email: "creator2@example.com",
          },
        },
      ];

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrganization);
      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);
      (prisma.club.count as jest.Mock).mockResolvedValue(2);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.items[0].id).toBe("club-1");
      expect(data.items[0].name).toBe("Club 1");
      expect(data.items[0].organizationId).toBe(mockOrgId);
      expect(data.items[1].id).toBe("club-2");
      expect(data.pagination.total).toBe(2);
      expect(data.pagination.hasMore).toBe(false);
    });

    it("should return clubs for organization admin", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "org-admin",
          isRoot: false,
        },
      });

      const mockOrganization = {
        id: mockOrgId,
        name: "Test Organization",
        slug: "test-org",
      };

      const mockMembership = {
        userId: "org-admin",
        organizationId: mockOrgId,
        role: "ORGANIZATION_ADMIN",
      };

      const mockClubs = [
        {
          id: "club-1",
          name: "Club 1",
          slug: "club-1",
          organizationId: mockOrgId,
          shortDescription: "Test club",
          location: "Location",
          city: "City",
          country: "Country",
          phone: "123",
          email: "club@example.com",
          website: "https://club.com",
          isPublic: true,
          logo: null,
          heroImage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            courts: 1,
            clubMemberships: 1,
          },
          createdBy: {
            id: "user-1",
            name: "Creator",
            email: "creator@example.com",
          },
        },
      ];

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(mockMembership);
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrganization);
      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);
      (prisma.club.count as jest.Mock).mockResolvedValue(1);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].organizationId).toBe(mockOrgId);
    });

    it("should return empty list when organization has no clubs", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });

      const mockOrganization = {
        id: mockOrgId,
        name: "Test Organization",
        slug: "test-org",
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrganization);
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.club.count as jest.Mock).mockResolvedValue(0);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });

    it("should respect pagination parameters", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "root-user",
          isRoot: true,
        },
      });

      const mockOrganization = {
        id: mockOrgId,
        name: "Test Organization",
        slug: "test-org",
      };

      const mockClubs = Array.from({ length: 3 }, (_, i) => ({
        id: `club-${i + 1}`,
        name: `Club ${i + 1}`,
        slug: `club-${i + 1}`,
        organizationId: mockOrgId,
        shortDescription: `Test club ${i + 1}`,
        location: `Location ${i + 1}`,
        city: null,
        country: null,
        phone: null,
        email: null,
        website: null,
        isPublic: true,
        logo: null,
        heroImage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          courts: 1,
          clubMemberships: 1,
        },
        createdBy: null,
      }));

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrganization);
      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);
      (prisma.club.count as jest.Mock).mockResolvedValue(10);

      const request = new Request(`http://localhost:3000/api/orgs/${mockOrgId}/clubs?limit=2`);
      const response = await GET(request, { params: Promise.resolve({ orgId: mockOrgId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.pagination.limit).toBe(2);
      expect(data.pagination.hasMore).toBe(true);
      expect(data.pagination.total).toBe(10);
    });
  });
});
