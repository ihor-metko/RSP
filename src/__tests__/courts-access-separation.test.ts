/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    court: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock requireClubManagement
const mockRequireClubManagement = jest.fn();
jest.mock("@/lib/requireRole", () => ({
  requireClubManagement: (clubId: string) => mockRequireClubManagement(clubId),
}));

import { GET as AdminGET, POST as AdminPOST } from "@/app/api/admin/clubs/[id]/courts/route";
import { GET as PlayerGET } from "@/app/api/(player)/clubs/[id]/courts/route";
import { prisma } from "@/lib/prisma";

describe("Courts Access Separation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Player endpoint /api/clubs/:clubId/courts", () => {
    it("should allow public access to public club courts", async () => {
      const mockClub = {
        isPublic: true,
        organization: {
          isPublic: true,
        },
      };
      const mockCourts = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts");
      const response = await PlayerGET(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courts).toHaveLength(1);
      expect(data.courts[0].name).toBe("Court 1");
      
      // Verify no admin auth was required
      expect(mockRequireClubManagement).not.toHaveBeenCalled();
    });

    it("should deny access to private club courts", async () => {
      const mockClub = {
        isPublic: false,
        organization: {
          isPublic: true,
        },
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts");
      const response = await PlayerGET(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });
  });

  describe("Admin endpoint /api/admin/clubs/:clubId/courts", () => {
    it("should require admin authorization", async () => {
      mockRequireClubManagement.mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 }),
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts");
      const response = await AdminGET(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Unauthorized");
      expect(mockRequireClubManagement).toHaveBeenCalledWith("club-123");
    });

    it("should return full court details with admin fields for authorized admins", async () => {
      mockRequireClubManagement.mockResolvedValue({
        authorized: true,
      });

      const mockCourts = [
        {
          id: "court-1",
          clubId: "club-123",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          sportType: "PADEL",
          isActive: true,
          defaultPriceCents: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            bookings: 42,
          },
        },
      ];

      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts");
      const response = await AdminGET(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Court 1");
      expect(data[0].isActive).toBe(true);
      expect(data[0].bookingCount).toBe(42);
      expect(mockRequireClubManagement).toHaveBeenCalledWith("club-123");
    });

    it("should allow court creation for authorized admins", async () => {
      mockRequireClubManagement.mockResolvedValue({
        authorized: true,
      });

      const mockClub = { id: "club-123", name: "Test Club" };
      const mockCourt = {
        id: "court-new",
        clubId: "club-123",
        name: "New Court",
        slug: "new-court",
        type: "padel",
        surface: "artificial",
        indoor: true,
        sportType: "PADEL",
        isActive: true,
        defaultPriceCents: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.court.create as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify({ name: "New Court", slug: "new-court" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await AdminPOST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Court");
      expect(mockRequireClubManagement).toHaveBeenCalledWith("club-123");
    });
  });

  describe("Endpoint separation verification", () => {
    it("player endpoint does not expose admin-only fields", async () => {
      const mockClub = {
        isPublic: true,
        organization: { isPublic: true },
      };
      const mockCourts = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          sportType: "PADEL",
          defaultPriceCents: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts");
      const response = await PlayerGET(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      // Player endpoint should not expose isActive or booking counts
      expect(data.courts[0].isActive).toBeUndefined();
      expect(data.courts[0].bookingCount).toBeUndefined();
    });
  });
});
