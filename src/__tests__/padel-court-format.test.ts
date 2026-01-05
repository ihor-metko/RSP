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
      create: jest.fn(),
    },
  },
}));

// Mock auth and role checking
jest.mock("@/lib/requireRole", () => ({
  requireClubManagement: jest.fn(),
}));

import { POST } from "@/app/api/admin/clubs/[id]/courts/route";
import { prisma } from "@/lib/prisma";
import { requireClubManagement } from "@/lib/requireRole";

describe("Padel Court Format - API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClub = {
    id: "club-123",
    name: "Test Club",
  };

  const mockAuthResult = {
    authorized: true,
    session: { user: { id: "user-123" } },
  };

  describe("POST /api/admin/clubs/:clubId/courts - Padel Court Format", () => {
    it("should reject Padel court creation without courtFormat", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "padel",
          indoor: false,
          defaultPriceCents: 5000,
          // Missing courtFormat
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Padel courts must specify SINGLE or DOUBLE format");
    });

    it("should reject Padel court creation with invalid format", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "padel",
          indoor: false,
          defaultPriceCents: 5000,
          courtFormat: "invalid",
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Court format must be either 'SINGLE' or 'DOUBLE'");
    });

    it("should successfully create Padel court with SINGLE format", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-1",
        clubId: "club-123",
        name: "Court 1",
        type: "padel",
        indoor: false,
        sportType: "PADEL",
        courtFormat: "SINGLE",
        defaultPriceCents: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "padel",
          indoor: false,
          defaultPriceCents: 5000,
          courtFormat: "SINGLE",
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.courtFormat).toBe("SINGLE");
    });

    it("should successfully create Padel court with DOUBLE format", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-2",
        clubId: "club-123",
        name: "Court 2",
        type: "padel",
        indoor: true,
        sportType: "PADEL",
        courtFormat: "DOUBLE",
        defaultPriceCents: 6000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 2",
          type: "padel",
          indoor: true,
          defaultPriceCents: 6000,
          courtFormat: "DOUBLE",
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.courtFormat).toBe("DOUBLE");
    });

    it("should allow non-Padel courts without courtFormat", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-3",
        clubId: "club-123",
        name: "Tennis Court",
        type: "tennis",
        indoor: false,
        sportType: "TENNIS",
        courtFormat: null,
        defaultPriceCents: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Tennis Court",
          type: "tennis",
          indoor: false,
          defaultPriceCents: 5000,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type).toBe("tennis");
    });

    it("should handle case-insensitive padel type check", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "Padel", // Capital P
          indoor: false,
          defaultPriceCents: 5000,
          // Missing courtFormat
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Padel courts must specify SINGLE or DOUBLE format");
    });

    it("should accept lowercase courtFormat and convert to uppercase", async () => {
      (requireClubManagement as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-4",
        clubId: "club-123",
        name: "Court 4",
        type: "padel",
        indoor: false,
        sportType: "PADEL",
        courtFormat: "SINGLE",
        defaultPriceCents: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 4",
          type: "padel",
          indoor: false,
          defaultPriceCents: 5000,
          courtFormat: "single", // lowercase
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.courtFormat).toBe("SINGLE");
    });
  });
});
