/**
 * @jest-environment node
 */

// Mock Prisma with membership tables for role-based access control
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "@/app/api/admin/clubs/[id]/route";
import { prisma } from "@/lib/prisma";

describe("Admin Club Detail API - GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: non-admin user has no memberships
    (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
  });

  const mockParams = Promise.resolve({ id: "club-123" });

  const mockClubWithRelations = {
    id: "club-123",
    name: "Test Club",
    slug: "test-club",
    shortDescription: "A test club",
    longDescription: "A detailed description",
    location: "123 Test Street",
    city: "Test City",
    country: "Test Country",
    latitude: 40.7128,
    longitude: -74.006,
    phone: "+1234567890",
    email: "test@example.com",
    website: "https://testclub.com",
    socialLinks: null,
    contactInfo: null,
    openingHours: null,
    logo: "/uploads/logo.jpg",
    heroImage: "/uploads/hero.jpg",
    defaultCurrency: "UAH",
    timezone: "UTC",
    isPublic: true,
    tags: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courts: [
      {
        id: "court-1",
        clubId: "club-123",
        name: "Court 1",
        slug: "court-1",
        type: "padel",
        surface: "artificial",
        indoor: true,
        defaultPriceCents: 3000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    coaches: [
      {
        id: "coach-1",
        userId: "user-coach-1",
        clubId: "club-123",
        bio: "Expert coach",
        phone: "+1111111111",
        createdAt: new Date().toISOString(),
        user: {
          id: "user-coach-1",
          name: "John Coach",
          email: "coach@example.com",
          image: null,
        },
      },
    ],
    gallery: [
      {
        id: "gallery-1",
        clubId: "club-123",
        imageUrl: "/uploads/gallery1.jpg",
        imageKey: "clubs/club-123/gallery1.jpg",
        altText: "Gallery image 1",
        sortOrder: 0,
        createdAt: new Date().toISOString(),
      },
    ],
    businessHours: [
      {
        id: "hours-1",
        clubId: "club-123",
        dayOfWeek: 1,
        openTime: "09:00",
        closeTime: "21:00",
        isClosed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  describe("GET /api/admin/clubs/[id]", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "GET",
        }
      );

      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "GET",
        }
      );

      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when club not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "GET",
        }
      );

      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should return full club data with all relations for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClubWithRelations);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "GET",
        }
      );

      const response = await GET(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("club-123");
      expect(data.name).toBe("Test Club");
      expect(data.courts).toHaveLength(1);
      expect(data.coaches).toHaveLength(1);
      expect(data.gallery).toHaveLength(1);
      expect(data.businessHours).toHaveLength(1);

      // Verify Prisma was called with correct include options
      expect(prisma.club.findUnique).toHaveBeenCalledWith({
        where: { id: "club-123" },
        include: {
          courts: { orderBy: { name: "asc" } },
          coaches: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          gallery: { orderBy: { sortOrder: "asc" } },
          businessHours: { orderBy: { dayOfWeek: "asc" } },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });
  });
});
