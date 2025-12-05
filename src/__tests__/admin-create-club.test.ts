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
    organization: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
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
      organizationId: "org-123",
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
        user: { id: "user-123", isRoot: false },
      });

      // Mock: no organization or club memberships
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

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

    it("should return 400 when organizationId is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const invalidData = { ...validClubData, organizationId: "" };

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Organization is required");
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
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
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
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
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
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

    it("should return 404 when organization not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Organization not found");
    });

    it("should return 409 when slug already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
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
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const newClub = {
        id: "new-club-id",
        name: "Test Club",
        slug: "test-club",
        organizationId: "org-123",
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
      expect(data.organizationId).toBe("org-123");
    });

    it("should create club with business hours", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
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
        organizationId: "org-123",
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
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
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
        organizationId: "org-123",
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
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const clubDataWithoutSlug = {
        organizationId: "org-123",
        name: "My Test Club!",
        shortDescription: "Description",
        location: "Address",
      };

      const newClub = {
        id: "new-club-id",
        name: "My Test Club!",
        slug: "my-test-club",
        organizationId: "org-123",
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

    it("should allow organization admin to create club in their organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      // Mock organization admin membership
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-123", role: "ORGANIZATION_ADMIN" },
      ]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      // Mock membership check
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId: "org-admin-123",
        organizationId: "org-123",
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const newClub = {
        id: "new-club-id",
        name: "Test Club",
        slug: "test-club",
        organizationId: "org-123",
        createdAt: new Date().toISOString(),
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(newClub);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should reject organization admin creating club in different organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      // Mock organization admin membership for different org
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-456", role: "ORGANIZATION_ADMIN" },
      ]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
        id: "org-123",
        name: "Test Org",
      });

      // Mock membership check - no membership in org-123
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/new", {
        method: "POST",
        body: JSON.stringify(validClubData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("You do not have permission to create clubs in this organization");
    });
  });
});
