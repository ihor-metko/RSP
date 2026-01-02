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
  requireClubAdmin: jest.fn(),
}));

import { POST } from "@/app/api/admin/clubs/[id]/courts/route";
import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/requireRole";

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
    it("should reject Padel court creation without format in metadata", async () => {
      (requireClubAdmin as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "padel",
          indoor: false,
          defaultPriceCents: 5000,
          // Missing metadata with padelCourtFormat
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Padel courts must specify Single or Double format");
    });

    it("should reject Padel court creation with invalid format", async () => {
      (requireClubAdmin as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "padel",
          indoor: false,
          defaultPriceCents: 5000,
          metadata: JSON.stringify({ padelCourtFormat: "invalid" }),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Padel court format must be either 'single' or 'double'");
    });

    it("should successfully create Padel court with single format", async () => {
      (requireClubAdmin as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-1",
        clubId: "club-123",
        name: "Court 1",
        type: "padel",
        indoor: false,
        sportType: "PADEL",
        defaultPriceCents: 5000,
        metadata: JSON.stringify({ padelCourtFormat: "single" }),
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
          metadata: JSON.stringify({ padelCourtFormat: "single" }),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeTruthy();
      const metadata = JSON.parse(data.metadata);
      expect(metadata.padelCourtFormat).toBe("single");
    });

    it("should successfully create Padel court with double format", async () => {
      (requireClubAdmin as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-2",
        clubId: "club-123",
        name: "Court 2",
        type: "padel",
        indoor: true,
        sportType: "PADEL",
        defaultPriceCents: 6000,
        metadata: JSON.stringify({ padelCourtFormat: "double" }),
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
          metadata: JSON.stringify({ padelCourtFormat: "double" }),
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.metadata).toBeTruthy();
      const metadata = JSON.parse(data.metadata);
      expect(metadata.padelCourtFormat).toBe("double");
    });

    it("should allow non-Padel courts without format metadata", async () => {
      (requireClubAdmin as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const mockCourt = {
        id: "court-3",
        clubId: "club-123",
        name: "Tennis Court",
        type: "tennis",
        indoor: false,
        sportType: "TENNIS",
        defaultPriceCents: 5000,
        metadata: null,
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
      (requireClubAdmin as jest.Mock).mockResolvedValue(mockAuthResult);
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Court 1",
          type: "Padel", // Capital P
          indoor: false,
          defaultPriceCents: 5000,
          // Missing metadata
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Padel courts must specify Single or Double format");
    });
  });
});
