/**
 * @jest-environment node
 */

// Tests for public flow API endpoints

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    court: {
      findUnique: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
  },
}));

import { GET as getClubs } from "@/app/api/clubs/route";
import { GET as getClubDetail } from "@/app/api/clubs/[id]/route";
import { GET as getCourtAvailability } from "@/app/api/courts/[courtId]/availability/route";
import { prisma } from "@/lib/prisma";

describe("Public Flow API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/clubs (Public)", () => {
    it("should return clubs without authentication", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Test Club",
          location: "123 Test St",
          contactInfo: null,
          openingHours: "9am-10pm",
          logo: null,
          createdAt: new Date().toISOString(),
          courts: [{ id: "court-1", indoor: true }],
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
      expect(data[0].name).toBe("Test Club");
      expect(data[0].indoorCount).toBe(1);
    });

    it("should support search filtering", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Match Club",
          location: "123 Test St",
          contactInfo: null,
          openingHours: null,
          logo: null,
          createdAt: new Date().toISOString(),
          courts: [],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?search=Match", {
        method: "GET",
      });

      const response = await getClubs(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.club.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ name: expect.objectContaining({ contains: "Match" }) }),
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it("should support indoor filtering", async () => {
      const mockClubs = [
        {
          id: "club-1",
          name: "Indoor Club",
          location: "123 Test St",
          contactInfo: null,
          openingHours: null,
          logo: null,
          createdAt: new Date().toISOString(),
          courts: [{ id: "court-1", indoor: true }],
        },
        {
          id: "club-2",
          name: "Outdoor Only Club",
          location: "456 Test St",
          contactInfo: null,
          openingHours: null,
          logo: null,
          createdAt: new Date().toISOString(),
          courts: [{ id: "court-2", indoor: false }],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/clubs?indoor=true", {
        method: "GET",
      });

      const response = await getClubs(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Indoor Club");
    });
  });

  describe("GET /api/clubs/[id] (Public)", () => {
    it("should return club details without authentication", async () => {
      const mockClub = {
        id: "club-1",
        name: "Test Club",
        location: "123 Test St",
        courts: [
          { id: "court-1", name: "Court 1", type: "Padel", surface: "Turf", indoor: true, defaultPriceCents: 5000 },
        ],
        coaches: [
          { id: "coach-1", user: { name: "Coach A" } },
        ],
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const params = Promise.resolve({ id: "club-1" });
      const request = new Request("http://localhost:3000/api/clubs/club-1", {
        method: "GET",
      });

      const response = await getClubDetail(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Test Club");
      expect(data.courts).toHaveLength(1);
      expect(data.coaches).toHaveLength(1);
    });

    it("should return 404 for non-existent club", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const params = Promise.resolve({ id: "non-existent" });
      const request = new Request("http://localhost:3000/api/clubs/non-existent", {
        method: "GET",
      });

      const response = await getClubDetail(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });
  });

  describe("GET /api/courts/[courtId]/availability (Public)", () => {
    it("should return court availability without authentication", async () => {
      const mockCourt = {
        id: "court-1",
        name: "Court 1",
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const params = Promise.resolve({ courtId: "court-1" });
      const request = new Request("http://localhost:3000/api/courts/court-1/availability?date=2024-01-15", {
        method: "GET",
      });

      const response = await getCourtAvailability(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.date).toBe("2024-01-15");
      expect(data.slots).toBeDefined();
      expect(Array.isArray(data.slots)).toBe(true);
    });

    it("should return 404 for non-existent court", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const params = Promise.resolve({ courtId: "non-existent" });
      const request = new Request("http://localhost:3000/api/courts/non-existent/availability", {
        method: "GET",
      });

      const response = await getCourtAvailability(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });
  });
});
