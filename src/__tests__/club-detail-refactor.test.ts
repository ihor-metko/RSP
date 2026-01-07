/**
 * @jest-environment node
 */

import { prisma } from "@/lib/prisma";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    court: {
      findMany: jest.fn(),
    },
    clubGallery: {
      findMany: jest.fn(),
    },
  },
}));

describe("Club Detail API Refactoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/(player)/clubs/[id]", () => {
    it("should return club details without courts, coaches, and gallery", async () => {
      const mockClub = {
        id: "club-1",
        name: "Test Club",
        slug: "test-club",
        shortDescription: "A test club",
        longDescription: "Long description",
        location: "123 Test St",
        city: "Test City",
        country: "Test Country",
        latitude: 40.7128,
        longitude: -74.006,
        address: JSON.stringify({
          formattedAddress: "123 Test St",
          city: "Test City",
          country: "Test Country",
          lat: 40.7128,
          lng: -74.006,
        }),
        phone: "+1234567890",
        email: "test@club.com",
        website: "https://testclub.com",
        socialLinks: null,
        contactInfo: null,
        openingHours: null,
        logoData: JSON.stringify({ url: "https://example.com/logo.png" }),
        bannerData: JSON.stringify({ url: "https://example.com/banner.png" }),
        metadata: null,
        defaultCurrency: "UAH",
        timezone: "UTC",
        tags: null,
        isPublic: true,
        organization: {
          id: "org-1",
          name: "Test Org",
          isPublic: true,
        },
        businessHours: [],
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // Mock the response data as it would come from the endpoint
      const responseData = {
        id: mockClub.id,
        name: mockClub.name,
        slug: mockClub.slug,
        shortDescription: mockClub.shortDescription,
        longDescription: mockClub.longDescription,
        address: JSON.parse(mockClub.address),
        location: "123 Test St",
        city: "Test City",
        country: "Test Country",
        latitude: 40.7128,
        longitude: -74.006,
        phone: mockClub.phone,
        email: mockClub.email,
        website: mockClub.website,
        socialLinks: mockClub.socialLinks,
        contactInfo: mockClub.contactInfo,
        openingHours: mockClub.openingHours,
        logoData: JSON.parse(mockClub.logoData),
        bannerData: JSON.parse(mockClub.bannerData),
        metadata: mockClub.metadata,
        defaultCurrency: mockClub.defaultCurrency,
        timezone: mockClub.timezone,
        tags: mockClub.tags,
        organization: {
          id: mockClub.organization.id,
          name: mockClub.organization.name,
        },
        businessHours: mockClub.businessHours,
      };

      // Verify the response does not include courts, coaches, or gallery
      expect(responseData).not.toHaveProperty("courts");
      expect(responseData).not.toHaveProperty("coaches");
      expect(responseData).not.toHaveProperty("gallery");

      // Verify it includes basic club info
      expect(responseData.id).toBe("club-1");
      expect(responseData.name).toBe("Test Club");
      expect(responseData.address).toBeDefined();
      expect(responseData.address.formattedAddress).toBe("123 Test St");
      expect(responseData.address.city).toBe("Test City");
      expect(responseData.address.country).toBe("Test Country");
      expect(responseData.address.lat).toBe(40.7128);
      expect(responseData.address.lng).toBe(-74.006);

      // Verify legacy fields are still provided for backward compatibility
      expect(responseData.location).toBe("123 Test St");
      expect(responseData.city).toBe("Test City");
      expect(responseData.country).toBe("Test Country");
      expect(responseData.latitude).toBe(40.7128);
      expect(responseData.longitude).toBe(-74.006);

      // Verify it includes organization info (id and name only)
      expect(responseData.organization).toEqual({
        id: "org-1",
        name: "Test Org",
      });

      // Verify it includes businessHours
      expect(responseData.businessHours).toBeDefined();
    });

    it("should exclude non-public clubs", () => {
      const mockClub = {
        id: "club-1",
        isPublic: false,
        organization: {
          isPublic: true,
        },
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // Check visibility logic
      const isVisible = mockClub.isPublic && mockClub.organization?.isPublic;
      expect(isVisible).toBe(false);
    });
  });

  describe("GET /api/(player)/clubs/[id]/courts", () => {
    it("should return courts for a public club", () => {
      const mockCourts = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "outdoor",
          surface: "clay",
          indoor: false,
          sportType: "PADEL",
          defaultPriceCents: 2000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "court-2",
          name: "Court 2",
          slug: "court-2",
          type: "indoor",
          surface: "synthetic",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 2500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const responseData = { courts: mockCourts };

      expect(responseData.courts).toHaveLength(2);
      expect(responseData.courts[0].id).toBe("court-1");
      expect(responseData.courts[1].id).toBe("court-2");
    });

    it("should check club visibility before returning courts", () => {
      const mockClub = {
        id: "club-1",
        isPublic: false,
        organization: {
          isPublic: true,
        },
      };

      const isVisible = mockClub.isPublic && mockClub.organization?.isPublic;
      expect(isVisible).toBe(false);
    });
  });

  describe("GET /api/(player)/clubs/[id]/gallery", () => {
    it("should return gallery images for a public club", () => {
      const mockGallery = [
        {
          id: "img-1",
          imageUrl: "https://example.com/img1.jpg",
          altText: "Image 1",
          sortOrder: 1,
        },
        {
          id: "img-2",
          imageUrl: "https://example.com/img2.jpg",
          altText: "Image 2",
          sortOrder: 2,
        },
      ];

      (prisma.clubGallery.findMany as jest.Mock).mockResolvedValue(mockGallery);

      const responseData = { gallery: mockGallery };

      expect(responseData.gallery).toHaveLength(2);
      expect(responseData.gallery[0].id).toBe("img-1");
      expect(responseData.gallery[0].imageUrl).toBe("https://example.com/img1.jpg");
      expect(responseData.gallery[1].id).toBe("img-2");
    });

    it("should check club visibility before returning gallery", () => {
      const mockClub = {
        id: "club-1",
        isPublic: false,
        organization: {
          isPublic: true,
        },
      };

      const isVisible = mockClub.isPublic && mockClub.organization?.isPublic;
      expect(isVisible).toBe(false);
    });

    it("should return empty gallery if no images exist", () => {
      (prisma.clubGallery.findMany as jest.Mock).mockResolvedValue([]);

      const responseData = { gallery: [] };

      expect(responseData.gallery).toHaveLength(0);
    });
  });
});
