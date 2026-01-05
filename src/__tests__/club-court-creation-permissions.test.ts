/**
 * @jest-environment node
 */

/**
 * Tests for club court creation permissions
 * 
 * This test suite verifies that the POST /api/admin/clubs/:clubId/courts endpoint
 * properly enforces authorization rules:
 * 
 * Allowed:
 * - Root Admin (can manage any club)
 * - Organization Admin (can manage clubs in their organization)
 * - Club Owner (can manage their club)
 * - Club Admin (can manage their club)
 * 
 * Denied:
 * - Regular members
 * - Users with no membership
 * - Unauthenticated users
 */

// Mock Next Auth
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Prisma with function factories
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    court: {
      create: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
  },
}));

import { POST } from "@/app/api/admin/clubs/[id]/courts/route";
import { prisma } from "@/lib/prisma";

describe("POST /api/admin/clubs/:clubId/courts - Authorization", () => {
  const clubId = "club-123";
  const organizationId = "org-456";
  const userId = "user-789";

  const validCourtData = {
    name: "Test Court",
    slug: "test-court",
    type: "padel",
    surface: "artificial",
    indoor: true,
    sportType: "PADEL",
    courtFormat: "DOUBLE",
    defaultPriceCents: 5000,
  };

  const mockClub = {
    id: clubId,
    name: "Test Club",
    organizationId,
  };

  const mockCreatedCourt = {
    id: "court-new",
    clubId,
    name: "Test Court",
    slug: "test-court",
    type: "padel",
    surface: "artificial",
    indoor: true,
    sportType: "PADEL",
    courtFormat: "DOUBLE",
    isActive: true,
    defaultPriceCents: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication checks", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Root Admin access", () => {
    it("should allow Root Admin to create court in any club", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: true,
        },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.court.create as jest.Mock).mockResolvedValue(mockCreatedCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Court");
      expect((prisma.court.create as jest.Mock)).toHaveBeenCalled();
    });
  });

  describe("Organization Admin access", () => {
    it("should allow Organization Admin to create court in their organization's club", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      // Club has an organization
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User is not a club member
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // User is an Organization Admin for this organization
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId,
        organizationId,
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCreatedCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Court");
      expect((prisma.court.create as jest.Mock)).toHaveBeenCalled();
    });

    it("should deny Organization Admin from different organization", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      // Club has an organization
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User is not a club member
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // User is an Organization Admin for a DIFFERENT organization
      // The query will look for userId + club's organizationId, which won't match
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect((prisma.court.create as jest.Mock)).not.toHaveBeenCalled();
    });
  });

  describe("Club Owner access", () => {
    it("should allow Club Owner to create court in their club", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User is a Club Owner
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId,
        clubId,
        role: "CLUB_OWNER",
      });

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCreatedCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Court");
      expect((prisma.court.create as jest.Mock)).toHaveBeenCalled();
    });
  });

  describe("Club Admin access", () => {
    it("should allow Club Admin to create court in their club", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User is a Club Admin
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId,
        clubId,
        role: "CLUB_ADMIN",
      });

      (prisma.court.create as jest.Mock).mockResolvedValue(mockCreatedCourt);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Court");
      expect((prisma.court.create as jest.Mock)).toHaveBeenCalled();
    });
  });

  describe("Unauthorized access", () => {
    it("should deny regular club member from creating courts", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User is only a regular member (not admin or owner)
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId,
        clubId,
        role: "MEMBER",
      });

      // User is not an organization admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect((prisma.court.create as jest.Mock)).not.toHaveBeenCalled();
    });

    it("should deny user with no club membership", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User has no club membership
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // User has no organization membership
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect((prisma.court.create as jest.Mock)).not.toHaveBeenCalled();
    });

    it("should deny Club Admin from different club", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      // User is a Club Admin, but for a DIFFERENT club
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      // User has no organization membership
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
      expect((prisma.court.create as jest.Mock)).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should return 404 when club does not exist", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: false,
        },
      });

      // User is a Club Admin (but club doesn't exist)
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId,
        clubId,
        role: "CLUB_ADMIN",
      });

      // Club not found
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(validCourtData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should validate required court name", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: userId,
          isRoot: true,
        },
      });

      const invalidData = { ...validCourtData, name: "" };

      const request = new Request("http://localhost:3000/api/admin/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: clubId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Court name is required");
      expect((prisma.court.create as jest.Mock)).not.toHaveBeenCalled();
    });
  });
});
