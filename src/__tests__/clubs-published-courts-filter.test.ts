/**
 * @jest-environment node
 */

// Tests for published courts filtering in public clubs API

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

describe("Clubs API - Published Courts Filter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/clubs with published courts filter", () => {
    it("should only return clubs with published courts", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Club with Published Courts",
          shortDescription: "Test club",
          address: JSON.stringify({ city: "Kyiv", street: "Test St" }),
          contactInfo: null,
          openingHours: "9am-10pm",
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date(),
          isPublic: true,
          organization: { isPublic: true },
          courts: [
            { id: "court-1", indoor: true, isPublished: true },
            { id: "court-2", indoor: false, isPublished: true },
          ],
        },
        {
          id: "club-2",
          name: "Club without Published Courts",
          shortDescription: "Test club 2",
          address: JSON.stringify({ city: "Lviv", street: "Test St" }),
          contactInfo: null,
          openingHours: "9am-10pm",
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date(),
          isPublic: true,
          organization: { isPublic: true },
          courts: [
            { id: "court-3", indoor: true, isPublished: false },
            { id: "court-4", indoor: false, isPublished: false },
          ],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Club with Published Courts");
      expect(data[0].publishedCourtsCount).toBe(2);
      expect(data[0].indoorCount).toBe(1);
      expect(data[0].outdoorCount).toBe(1);
    });

    it("should filter out clubs with no published courts", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Club 1",
          shortDescription: "Test",
          address: JSON.stringify({ city: "Kyiv" }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date(),
          isPublic: true,
          organization: { isPublic: true },
          courts: [
            { id: "court-1", indoor: true, isPublished: false },
          ],
        },
        {
          id: "club-2",
          name: "Club 2",
          shortDescription: "Test",
          address: JSON.stringify({ city: "Kyiv" }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date(),
          isPublic: true,
          organization: { isPublic: true },
          courts: [
            { id: "court-2", indoor: false, isPublished: false },
          ],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it("should count only published courts for indoor/outdoor", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Mixed Club",
          shortDescription: "Test club",
          address: JSON.stringify({ city: "Kyiv" }),
          contactInfo: null,
          openingHours: null,
          logoData: null,
          bannerData: null,
          tags: null,
          createdAt: new Date(),
          isPublic: true,
          organization: { isPublic: true },
          courts: [
            { id: "court-1", indoor: true, isPublished: true },
            { id: "court-2", indoor: true, isPublished: false },
            { id: "court-3", indoor: false, isPublished: true },
            { id: "court-4", indoor: false, isPublished: false },
          ],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].publishedCourtsCount).toBe(2);
      expect(data[0].indoorCount).toBe(1); // Only published indoor
      expect(data[0].outdoorCount).toBe(1); // Only published outdoor
    });
  });
});
