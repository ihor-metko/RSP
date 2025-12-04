/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    clubBusinessHours: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    clubSpecialHours: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    clubGallery: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    coach: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { PATCH } from "@/app/api/admin/clubs/[id]/section/route";
import { prisma } from "@/lib/prisma";

describe("Admin Club Section API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockClub = {
    id: "club-123",
    name: "Test Club",
    slug: "test-club",
    shortDescription: "A test club",
    location: "123 Test Street",
    isPublic: true,
  };

  const mockParams = Promise.resolve({ id: "club-123" });

  describe("PATCH /api/admin/clubs/[id]/section", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/section",
        {
          method: "PATCH",
          body: JSON.stringify({ section: "header", payload: {} }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/section",
        {
          method: "PATCH",
          body: JSON.stringify({ section: "header", payload: {} }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when club not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/section",
        {
          method: "PATCH",
          body: JSON.stringify({ section: "header", payload: { name: "Test" } }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should return 400 when section is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/section",
        {
          method: "PATCH",
          body: JSON.stringify({ payload: { name: "Test" } }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Section and payload are required");
    });

    it("should return 400 for invalid section", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/section",
        {
          method: "PATCH",
          body: JSON.stringify({ section: "invalid", payload: {} }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PATCH(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid section");
    });

    describe("header section", () => {
      it("should return 400 when name is missing", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "header",
              payload: { name: "", slug: "test", shortDescription: "desc", isPublic: true },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Club name is required");
      });

      it("should return 409 when slug already exists", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
        (prisma.club.findFirst as jest.Mock).mockResolvedValue({ id: "other-club" });

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "header",
              payload: { name: "Test", slug: "existing-slug", shortDescription: "desc", isPublic: true },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(409);
        expect(data.error).toBe("A club with this slug already exists");
      });

      it("should update header section successfully", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
        (prisma.club.findFirst as jest.Mock).mockResolvedValue(null);

        const updatedClub = {
          ...mockClub,
          name: "Updated Club",
          slug: "updated-club",
          shortDescription: "Updated description",
          isPublic: false,
          courts: [],
          coaches: [],
          gallery: [],
          businessHours: [],
          specialHours: [],
        };

        (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "header",
              payload: {
                name: "Updated Club",
                slug: "updated-club",
                shortDescription: "Updated description",
                isPublic: false,
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe("Updated Club");
      });
    });

    describe("contacts section", () => {
      it("should return 400 when address is missing", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "contacts",
              payload: { location: "" },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Address is required");
      });

      it("should update contacts section successfully", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const updatedClub = {
          ...mockClub,
          location: "456 New Street",
          phone: "+1234567890",
          email: "test@example.com",
          courts: [],
          coaches: [],
          gallery: [],
          businessHours: [],
          specialHours: [],
        };

        (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "contacts",
              payload: {
                location: "456 New Street",
                phone: "+1234567890",
                email: "test@example.com",
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.location).toBe("456 New Street");
      });
    });

    describe("hours section", () => {
      it("should return 400 for invalid business hours", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "hours",
              payload: {
                businessHours: [
                  { dayOfWeek: 1, openTime: "18:00", closeTime: "09:00", isClosed: false },
                ],
                specialHours: [],
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain("opening time must be before closing time");
      });

      it("should return 400 for duplicate special hours dates", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "hours",
              payload: {
                businessHours: [],
                specialHours: [
                  { date: "2024-12-25", openTime: null, closeTime: null, isClosed: true, reason: "Holiday" },
                  { date: "2024-12-25", openTime: null, closeTime: null, isClosed: true, reason: "Duplicate" },
                ],
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Duplicate dates in special hours");
      });

      it("should update hours section successfully", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const updatedClub = {
          ...mockClub,
          courts: [],
          coaches: [],
          gallery: [],
          businessHours: [
            { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
          ],
          specialHours: [],
        };

        (prisma.$transaction as jest.Mock).mockResolvedValue(updatedClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "hours",
              payload: {
                businessHours: [
                  { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
                ],
                specialHours: [],
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        await response.json();

        expect(response.status).toBe(200);
        expect(prisma.$transaction).toHaveBeenCalled();
      });
    });

    describe("gallery section", () => {
      it("should update gallery section successfully", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const updatedClub = {
          ...mockClub,
          heroImage: "/uploads/hero.jpg",
          logo: "/uploads/logo.jpg",
          courts: [],
          coaches: [],
          gallery: [{ imageUrl: "/uploads/gallery1.jpg", sortOrder: 0 }],
          businessHours: [],
          specialHours: [],
        };

        (prisma.$transaction as jest.Mock).mockResolvedValue(updatedClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "gallery",
              payload: {
                heroImage: "/uploads/hero.jpg",
                logo: "/uploads/logo.jpg",
                gallery: [
                  { imageUrl: "/uploads/gallery1.jpg", sortOrder: 0 },
                ],
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        await response.json();

        expect(response.status).toBe(200);
        expect(prisma.$transaction).toHaveBeenCalled();
      });
    });

    describe("coaches section", () => {
      it("should update coaches section successfully", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "admin-123", isRoot: true },
        });

        (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

        const updatedClub = {
          ...mockClub,
          courts: [],
          coaches: [{ id: "coach-1", user: { name: "Coach One" } }],
          gallery: [],
          businessHours: [],
          specialHours: [],
        };

        (prisma.$transaction as jest.Mock).mockResolvedValue(updatedClub);

        const request = new Request(
          "http://localhost:3000/api/admin/clubs/club-123/section",
          {
            method: "PATCH",
            body: JSON.stringify({
              section: "coaches",
              payload: {
                coachIds: ["coach-1", "coach-2"],
              },
            }),
            headers: { "Content-Type": "application/json" },
          }
        );

        const response = await PATCH(request, { params: mockParams });
        await response.json();

        expect(response.status).toBe(200);
        expect(prisma.$transaction).toHaveBeenCalled();
      });
    });
  });
});
