/**
 * @jest-environment node
 */

// Tests for city-based search filtering in public clubs API

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: jest.fn(),
    },
  },
}));

import { GET as getClubs } from "@/app/api/(player)/clubs/route";
import { prisma } from "@/lib/prisma";

describe("City-based Search Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/clubs with city parameter", () => {
    it("should filter clubs by city (Lviv)", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Lviv Sports Club",
          shortDescription: "Great club in Lviv",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
            street: "123 Test St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-1", indoor: true }],
        },
        {
          id: "club-2",
          name: "Kyiv Arena",
          shortDescription: "Premium club in Kyiv",
          address: JSON.stringify({
            city: "Kyiv",
            country: "Ukraine",
            street: "456 Main St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-2", indoor: false }],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?city=Lviv", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return only Lviv club, filtering out Kyiv
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Lviv Sports Club");
      expect(data[0].address?.city).toBe("Lviv");
    });

    it("should filter clubs by city (Kyiv)", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Lviv Sports Club",
          shortDescription: "Great club in Lviv",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
            street: "123 Test St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-1", indoor: true }],
        },
        {
          id: "club-2",
          name: "Kyiv Arena",
          shortDescription: "Premium club in Kyiv",
          address: JSON.stringify({
            city: "Kyiv",
            country: "Ukraine",
            street: "456 Main St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-2", indoor: false }],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?city=Kyiv", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return only Kyiv club, filtering out Lviv
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Kyiv Arena");
      expect(data[0].address?.city).toBe("Kyiv");
    });

    it("should support partial city name matching (Lvi matches Lviv)", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Lviv Sports Club",
          shortDescription: "Great club in Lviv",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
            street: "123 Test St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-1", indoor: true }],
        },
        {
          id: "club-2",
          name: "Kyiv Arena",
          shortDescription: "Premium club in Kyiv",
          address: JSON.stringify({
            city: "Kyiv",
            country: "Ukraine",
            street: "456 Main St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-2", indoor: false }],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?city=Lvi", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should match Lviv with partial "Lvi"
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Lviv Sports Club");
    });

    it("should support case-insensitive city matching", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Lviv Sports Club",
          shortDescription: "Great club in Lviv",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
            street: "123 Test St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-1", indoor: true }],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      // Test with lowercase "lviv"
      const request = new Request("http://localhost:3000/api/clubs?city=lviv", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should match "Lviv" case-insensitively with "lviv"
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Lviv Sports Club");
    });

    it("should combine city filter with name search", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Arena Sports",
          shortDescription: "Arena in Lviv",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
            street: "123 Test St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-1", indoor: true }],
        },
        {
          id: "club-2",
          name: "Arena Kyiv",
          shortDescription: "Arena in Kyiv",
          address: JSON.stringify({
            city: "Kyiv",
            country: "Ukraine",
            street: "456 Main St",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [{ id: "court-2", indoor: false }],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?q=Arena&city=Lviv", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should filter by both name and city
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Arena Sports");
      expect(data[0].address?.city).toBe("Lviv");
    });

    it("should return empty array when no clubs match city filter", async () => {
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/clubs?city=NonExistentCity", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it("should handle city parameter with whitespace", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Test Club",
          shortDescription: "Test",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?city=%20Lviv%20", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should trim whitespace and find the club
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Test Club");
    });

    it("should not apply city filter when city parameter is empty", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "All Clubs",
          shortDescription: "Test",
          address: JSON.stringify({
            city: "Lviv",
            country: "Ukraine",
          }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date("2024-01-01"),
          isPublic: true,
          organization: { isPublic: true },
          courts: [],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?city=", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return all clubs when city filter is empty
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("All Clubs");
    });
  });
});
