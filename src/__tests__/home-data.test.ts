/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: jest.fn(),
    },
  },
}));

import { getPopularClubs } from "@/lib/homeData";
import { prisma } from "@/lib/prisma";

describe("Home Data Server Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPopularClubs", () => {
    it("should return clubs with indoor/outdoor court counts", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Test Club 1",
          location: "123 Test St",
          contactInfo: "test@test.com",
          openingHours: "9am-10pm",
          shortDescription: "A great club",
          logo: "https://example.com/logo.png",
          courts: [
            { id: "court-1", indoor: true },
            { id: "court-2", indoor: true },
            { id: "court-3", indoor: false },
          ],
        },
        {
          id: "club-2",
          name: "Test Club 2",
          location: "456 Test Ave",
          contactInfo: null,
          openingHours: null,
          shortDescription: null,
          logo: null,
          courts: [
            { id: "court-4", indoor: false },
          ],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const clubs = await getPopularClubs(4);

      expect(clubs).toHaveLength(2);
      expect(clubs[0]).toEqual({
        id: "club-1",
        name: "Test Club 1",
        location: "123 Test St",
        contactInfo: "test@test.com",
        openingHours: "9am-10pm",
        shortDescription: "A great club",
        logo: "https://example.com/logo.png",
        indoorCount: 2,
        outdoorCount: 1,
      });
      expect(clubs[1]).toEqual({
        id: "club-2",
        name: "Test Club 2",
        location: "456 Test Ave",
        contactInfo: null,
        openingHours: null,
        shortDescription: null,
        logo: null,
        indoorCount: 0,
        outdoorCount: 1,
      });
    });

    it("should return empty array when no clubs exist", async () => {
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]);

      const clubs = await getPopularClubs(4);

      expect(clubs).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      (prisma.club.findMany as jest.Mock).mockRejectedValue(new Error("Database error"));

      const clubs = await getPopularClubs(4);

      expect(clubs).toEqual([]);
    });

    it("should call prisma with correct parameters", async () => {
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]);

      await getPopularClubs(6);

      expect(prisma.club.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          location: true,
          city: true,
          contactInfo: true,
          openingHours: true,
          shortDescription: true,
          logo: true,
          heroImage: true,
          metadata: true,
          tags: true,
          courts: {
            select: {
              id: true,
              indoor: true,
            },
          },
        },
      });
    });

    it("should use default limit of 4 when not specified", async () => {
      (prisma.club.findMany as jest.Mock).mockResolvedValue([]);

      await getPopularClubs();

      expect(prisma.club.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 4,
        })
      );
    });
  });
});
