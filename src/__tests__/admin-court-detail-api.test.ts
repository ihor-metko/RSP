/**
 * @jest-environment node
 */
import { GET, PATCH, DELETE } from "@/app/api/admin/clubs/[id]/courts/[courtId]/route";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    court: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock requireRole
jest.mock("@/lib/requireRole", () => ({
  requireRootAdmin: jest.fn(),
}));

describe("Admin Court Detail API", () => {
  const mockCourt = {
    id: "court-123",
    clubId: "club-123",
    name: "Court 1",
    slug: "court-1",
    type: "padel",
    surface: "artificial",
    indoor: true,
    defaultPriceCents: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
    club: {
      id: "club-123",
      name: "Test Club",
      businessHours: [],
    },
    courtPriceRules: [],
  };

  const createRequest = (method: string, body?: object) => {
    const request = new Request(
      `http://localhost:3000/api/admin/clubs/club-123/courts/court-123`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body && { body: JSON.stringify(body) }),
      }
    );
    return request;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requireRootAdmin as jest.Mock).mockResolvedValue({
      authorized: true,
      userId: "admin-user",
    });
  });

  describe("GET /api/admin/clubs/[id]/courts/[courtId]", () => {
    it("should return court data when court exists", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("court-123");
      expect(data.name).toBe("Court 1");
      expect(data.club).toBeDefined();
    });

    it("should return 404 when court not found", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123", courtId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });

    it("should return 404 when court belongs to different club", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        ...mockCourt,
        clubId: "different-club",
      });

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court does not belong to this club");
    });

    it("should return 401 when not authenticated", async () => {
      (requireRootAdmin as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      });

      const request = createRequest("GET");
      const response = await GET(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("PATCH /api/admin/clubs/[id]/courts/[courtId]", () => {
    it("should update court with partial data", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.court.update as jest.Mock).mockResolvedValue({
        ...mockCourt,
        name: "Updated Court",
      });

      const request = createRequest("PATCH", { name: "Updated Court" });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Court");
      expect(prisma.court.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "court-123" },
          data: { name: "Updated Court" },
        })
      );
    });

    it("should validate name length", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const request = createRequest("PATCH", { name: "A" }); // Too short
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors.name).toBe("Name must be at least 2 characters");
    });

    it("should validate slug pattern", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const request = createRequest("PATCH", { slug: "Invalid Slug!" });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors.slug).toBe(
        "Slug must contain only lowercase letters, numbers, and hyphens"
      );
    });

    it("should handle slug conflict with suggestion", async () => {
      (prisma.court.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockCourt) // Court lookup
        .mockResolvedValueOnce({ id: "other-court", slug: "existing-slug" }); // Slug check
      
      (prisma.court.findMany as jest.Mock).mockResolvedValueOnce([]); // Find similar slugs

      const request = createRequest("PATCH", { slug: "existing-slug" });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("A court with this slug already exists");
      expect(data.suggestion).toBe("existing-slug-1");
    });

    it("should validate price is non-negative", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);

      const request = createRequest("PATCH", { defaultPriceCents: -100 });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors.defaultPriceCents).toBe(
        "Price must be a non-negative number"
      );
    });

    it("should return 404 when court not found", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest("PATCH", { name: "Updated" });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: "club-123", courtId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });
  });

  describe("DELETE /api/admin/clubs/[id]/courts/[courtId]", () => {
    it("should delete court successfully", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(mockCourt);
      (prisma.court.delete as jest.Mock).mockResolvedValue(mockCourt);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });

      expect(response.status).toBe(204);
      expect(prisma.court.delete).toHaveBeenCalledWith({
        where: { id: "court-123" },
      });
    });

    it("should return 404 when court not found", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court not found");
    });

    it("should return 404 when court belongs to different club", async () => {
      (prisma.court.findUnique as jest.Mock).mockResolvedValue({
        ...mockCourt,
        clubId: "different-club",
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123", courtId: "court-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Court does not belong to this club");
    });
  });
});
