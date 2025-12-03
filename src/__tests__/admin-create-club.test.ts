/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    clubBusinessHours: {
      createMany: jest.fn(),
    },
    clubGallery: {
      createMany: jest.fn(),
    },
    court: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { POST } from "@/app/api/admin/clubs/new/route";
import { prisma } from "@/lib/prisma";

describe("Admin Create Club API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/clubs/new", () => {
    const validClubData = {
      name: "Test Club",
      shortDescription: "A test club for padel",
      location: "123 Test Street, Test City",
      city: "Test City",
      country: "Test Country",
      heroImage: "/uploads/hero.jpg",
      logo: "/uploads/logo.jpg",
    };

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", role: "player" },
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const invalidData = { ...validClubData, name: "" };

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Club name is required");
    });

    it("should return 400 when short description is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const invalidData = { ...validClubData, shortDescription: "" };

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Short description is required");
    });

    it("should return 400 when address is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      const invalidData = { ...validClubData, location: "" };

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Address is required");
    });

    it("should return 409 when slug already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-club-id",
        slug: "test-club",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("A club with this slug already exists");
    });

    it("should create a new club successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const newClub = {
        id: "new-club-id",
        name: "Test Club",
        slug: "test-club",
        shortDescription: "A test club for padel",
        location: "123 Test Street, Test City",
        city: "Test City",
        country: "Test Country",
        heroImage: "/uploads/hero.jpg",
        logo: "/uploads/logo.jpg",
        createdAt: new Date().toISOString(),
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(newClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Test Club");
      expect(data.slug).toBe("test-club");
    });

    it("should create club with business hours", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const clubDataWithHours = {
        ...validClubData,
        businessHours: [
          { dayOfWeek: 0, openTime: null, closeTime: null, isClosed: true },
          { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
        ],
      };

      const newClub = {
        id: "new-club-id",
        name: "Test Club",
        slug: "test-club",
        createdAt: new Date().toISOString(),
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(newClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(clubDataWithHours),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should create club with inline courts", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const clubDataWithCourts = {
        ...validClubData,
        courts: [
          { name: "Court 1", type: "padel", surface: "artificial", indoor: true, defaultPriceCents: 3000 },
          { name: "Court 2", type: "padel", surface: "artificial", indoor: false, defaultPriceCents: 2500 },
        ],
      };

      const newClub = {
        id: "new-club-id",
        name: "Test Club",
        slug: "test-club",
        createdAt: new Date().toISOString(),
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(newClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(clubDataWithCourts),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should auto-generate slug from name if not provided", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", role: "super_admin" },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const clubDataWithoutSlug = {
        name: "My Test Club!",
        shortDescription: "Description",
        location: "Address",
      };

      const newClub = {
        id: "new-club-id",
        name: "My Test Club!",
        slug: "my-test-club",
        createdAt: new Date().toISOString(),
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(newClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(clubDataWithoutSlug),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
