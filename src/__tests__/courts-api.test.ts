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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET, POST } from "@/app/api/(player)/clubs/[id]/courts/route";
import { PUT, DELETE } from "@/app/api/(player)/clubs/[id]/courts/[courtId]/route";
import { prisma } from "@/lib/prisma";

describe("Courts API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/clubs/:clubId/courts", () => {
    it("should return courts for a club", async () => {
      const mockClub = { id: "club-123", name: "Test Club" };
      const mockCourts = [
        {
          id: "court-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          defaultPriceCents: 5000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: "court-2",
          name: "Court 2",
          slug: null,
          type: null,
          surface: null,
          indoor: false,
          defaultPriceCents: 4000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.court.findMany as jest.Mock).mockResolvedValue(mockCourts);

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts");
      const response = await GET(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courts).toHaveLength(2);
      expect(data.courts[0].name).toBe("Court 1");
    });

    it("should return 404 when club not found", async () => {
      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/clubs/nonexistent/courts");
      const response = await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });
  });

  describe("POST /api/clubs/:clubId/courts", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify({ name: "New Court" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify({ name: "New Court" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should create a new court for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const mockClub = { id: "club-123", name: "Test Club" };
      const newCourt = {
        id: "court-new",
        clubId: "club-123",
        name: "New Court",
        slug: "new-court",
        type: "padel",
        surface: "artificial",
        indoor: true,
        defaultPriceCents: 5000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null); // No existing slug
      (prisma.court.create as jest.Mock).mockResolvedValue(newCourt);

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify({
          name: "New Court",
          slug: "new-court",
          type: "padel",
          surface: "artificial",
          indoor: true,
          defaultPriceCents: 5000,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Court");
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({ id: "club-123" });

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify({ type: "padel" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name is required");
    });

    it("should return 404 when club not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/clubs/nonexistent/courts", {
        method: "POST",
        body: JSON.stringify({ name: "New Court" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: "nonexistent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should return 409 when slug already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({ id: "club-123" });
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({ id: "existing-court" });

      const request = new Request("http://localhost:3000/api/clubs/club-123/courts", {
        method: "POST",
        body: JSON.stringify({ name: "New Court", slug: "existing-slug" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-123" }) });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("A court with this slug already exists");
    });
  });

  describe("PUT /api/clubs/:clubId/courts/:courtId", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Court" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Court" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should update court for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const existingCourt = {
        id: "court-123",
        clubId: "club-123",
        name: "Old Name",
        slug: "old-slug",
      };

      const updatedCourt = {
        id: "court-123",
        clubId: "club-123",
        name: "Updated Court",
        slug: "updated-slug",
        type: "tennis",
        surface: "clay",
        indoor: false,
        defaultPriceCents: 6000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (prisma.court.findUnique as jest.Mock)
        .mockResolvedValueOnce(existingCourt) // First call: check court exists
        .mockResolvedValueOnce(null); // Second call: check slug uniqueness
      (prisma.court.update as jest.Mock).mockResolvedValue(updatedCourt);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        {
          method: "PUT",
          body: JSON.stringify({
            name: "Updated Court",
            slug: "updated-slug",
            type: "tennis",
            surface: "clay",
            indoor: false,
            defaultPriceCents: 6000,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Court");
    });

    it("should return 404 when court not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/nonexistent",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Court" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123", courtId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });

    it("should return 404 when court does not belong to club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const existingCourt = {
        id: "court-123",
        clubId: "different-club",
        name: "Court",
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(existingCourt);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Court" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court does not belong to this club");
    });
  });

  describe("DELETE /api/clubs/:clubId/courts/:courtId", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should delete court for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const existingCourt = {
        id: "court-123",
        clubId: "club-123",
        name: "Court to Delete",
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(existingCourt);
      (prisma.court.delete as jest.Mock).mockResolvedValue(existingCourt);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });

      expect(response.status).toBe(204);
    });

    it("should return 404 when court not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/nonexistent",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });

    it("should return 404 when court does not belong to club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const existingCourt = {
        id: "court-123",
        clubId: "different-club",
        name: "Court",
      };

      (prisma.court.findUnique as jest.Mock).mockResolvedValue(existingCourt);

      const request = new Request(
        "http://localhost:3000/api/clubs/club-123/courts/court-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court does not belong to this club");
    });
  });
});
