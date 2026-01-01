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
    membership: {
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

import { PATCH as PatchClub } from "@/app/api/admin/clubs/[id]/route";
import { PATCH as PatchBusinessHours } from "@/app/api/admin/clubs/[id]/business-hours/route";
import { PATCH as PatchSpecialHours } from "@/app/api/admin/clubs/[id]/special-hours/route";
import { PATCH as PatchMedia } from "@/app/api/admin/clubs/[id]/media/route";
import { PATCH as PatchContacts } from "@/app/api/admin/clubs/[id]/contacts/route";
import { PATCH as PatchLocation } from "@/app/api/admin/clubs/[id]/location/route";
import { PATCH as PatchMetadata } from "@/app/api/admin/clubs/[id]/metadata/route";
import { PATCH as PatchCoaches } from "@/app/api/admin/clubs/[id]/coaches/route";
import { prisma } from "@/lib/prisma";

describe("Admin Club Domain-Specific APIs", () => {
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

  describe("PATCH /api/admin/clubs/[id] - General Info", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Club" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      // Mock no admin memberships
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Club" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
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
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated Club" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should return 400 when name is empty", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
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
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ slug: "existing-slug" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("A club with this slug already exists");
    });

    it("should update general club info successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);
      (prisma.club.findFirst as jest.Mock).mockResolvedValue(null);

      const updatedClub = {
        ...mockClub,
        name: "Updated Club",
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
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Club",
            shortDescription: "Updated description",
            isPublic: false,
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Club");
      expect(prisma.club.update).toHaveBeenCalledWith({
        where: { id: "club-123" },
        data: {
          name: "Updated Club",
          shortDescription: "Updated description",
          isPublic: false,
        },
        include: expect.any(Object),
      });
    });
  });

  describe("PATCH /api/admin/clubs/[id]/business-hours", () => {
    it("should return 400 for invalid business hours", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/business-hours",
        {
          method: "PATCH",
          body: JSON.stringify({
            businessHours: [
              { dayOfWeek: 1, openTime: "18:00", closeTime: "09:00", isClosed: false },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchBusinessHours(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("opening time must be before closing time");
    });

    it("should update business hours successfully", async () => {
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
        "http://localhost:3000/api/admin/clubs/club-123/business-hours",
        {
          method: "PATCH",
          body: JSON.stringify({
            businessHours: [
              { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchBusinessHours(request, { params: mockParams });
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/admin/clubs/[id]/special-hours", () => {
    it("should return 400 for duplicate special hours dates", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/special-hours",
        {
          method: "PATCH",
          body: JSON.stringify({
            specialHours: [
              { date: "2024-12-25", openTime: null, closeTime: null, isClosed: true, reason: "Holiday" },
              { date: "2024-12-25", openTime: null, closeTime: null, isClosed: true, reason: "Duplicate" },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchSpecialHours(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Duplicate dates in special hours");
    });

    it("should update special hours successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const updatedClub = {
        ...mockClub,
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [
          { date: "2024-12-25", openTime: null, closeTime: null, isClosed: true, reason: "Holiday" },
        ],
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/special-hours",
        {
          method: "PATCH",
          body: JSON.stringify({
            specialHours: [
              { date: "2024-12-25", openTime: null, closeTime: null, isClosed: true, reason: "Holiday" },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchSpecialHours(request, { params: mockParams });
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/admin/clubs/[id]/location", () => {
    it("should return 400 when address is empty", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/location",
        {
          method: "PATCH",
          body: JSON.stringify({ location: "" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchLocation(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Address is required");
    });

    it("should update location successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const updatedClub = {
        ...mockClub,
        location: "456 New Street",
        city: "New City",
        country: "New Country",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/location",
        {
          method: "PATCH",
          body: JSON.stringify({
            location: "456 New Street",
            city: "New City",
            country: "New Country",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchLocation(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.location).toBe("456 New Street");
    });
  });

  describe("PATCH /api/admin/clubs/[id]/contacts", () => {
    it("should update contacts successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const updatedClub = {
        ...mockClub,
        phone: "+1234567890",
        email: "test@example.com",
        website: "https://example.com",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/contacts",
        {
          method: "PATCH",
          body: JSON.stringify({
            phone: "+1234567890",
            email: "test@example.com",
            website: "https://example.com",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchContacts(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.phone).toBe("+1234567890");
    });
  });

  describe("PATCH /api/admin/clubs/[id]/metadata", () => {
    it("should update metadata successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const updatedClub = {
        ...mockClub,
        metadata: JSON.stringify({ logoTheme: "dark", bannerAlignment: "top" }),
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/metadata",
        {
          method: "PATCH",
          body: JSON.stringify({
            metadata: { logoTheme: "dark", bannerAlignment: "top" },
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchMetadata(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.club.update).toHaveBeenCalledWith({
        where: { id: "club-123" },
        data: {
          metadata: JSON.stringify({ logoTheme: "dark", bannerAlignment: "top" }),
        },
        include: expect.any(Object),
      });
    });
  });

  describe("PATCH /api/admin/clubs/[id]/media", () => {
    it("should update media successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(mockClub);

      const updatedClub = {
        ...mockClub,
        logoData: JSON.stringify({ url: "/logo.jpg" }),
        bannerData: JSON.stringify({ url: "/banner.jpg" }),
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/media",
        {
          method: "PATCH",
          body: JSON.stringify({
            logoData: { url: "/logo.jpg" },
            bannerData: { url: "/banner.jpg" },
            gallery: [],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchMedia(request, { params: mockParams });
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("PATCH /api/admin/clubs/[id]/coaches", () => {
    it("should update coaches successfully", async () => {
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
        "http://localhost:3000/api/admin/clubs/club-123/coaches",
        {
          method: "PATCH",
          body: JSON.stringify({
            coachIds: ["coach-1", "coach-2"],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchCoaches(request, { params: mockParams });
      await response.json();

      expect(response.status).toBe(200);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("Club Admin and Club Owner permissions", () => {
    it("should allow club_admin to update general club info", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-123", isRoot: false },
      });

      // Mock requireAnyAdmin to return club_admin
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // CLUB_OWNER check
        .mockResolvedValueOnce([{ clubId: "club-123" }]); // CLUB_ADMIN check

      // Mock canAccessClub - club admin has access to their club
      (prisma.club.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "club-123", organizationId: "org-1" }) // canAccessClub check
        .mockResolvedValueOnce(mockClub) // existingClub check
        .mockResolvedValueOnce(mockClub); // update check

      (prisma.club.findFirst as jest.Mock).mockResolvedValue(null);

      const updatedClub = {
        ...mockClub,
        name: "Updated by Club Admin",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Updated by Club Admin" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated by Club Admin");
    });

    it("should allow club_owner to update club business hours", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-owner-123", isRoot: false },
      });

      // Mock requireAnyAdmin to return club_owner
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValueOnce([
        { clubId: "club-123" },
      ]);

      // Mock canAccessClub - club owner has access to their club
      (prisma.club.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "club-123", organizationId: "org-1" })
        .mockResolvedValueOnce(mockClub);

      const businessHours = [
        { dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", isClosed: false },
        { dayOfWeek: 2, openTime: "09:00", closeTime: "18:00", isClosed: false },
      ];

      const updatedClub = {
        ...mockClub,
        courts: [],
        coaches: [],
        gallery: [],
        businessHours,
        specialHours: [],
      };

      (prisma.$transaction as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/business-hours",
        {
          method: "PATCH",
          body: JSON.stringify({ businessHours }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchBusinessHours(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businessHours).toEqual(businessHours);
    });

    it("should allow club_admin to update club location", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-123", isRoot: false },
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ clubId: "club-123" }]);

      (prisma.club.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "club-123", organizationId: "org-1" })
        .mockResolvedValueOnce(mockClub);

      const updatedClub = {
        ...mockClub,
        location: "456 New Street",
        city: "New City",
        courts: [],
        coaches: [],
        gallery: [],
        businessHours: [],
        specialHours: [],
      };

      (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/location",
        {
          method: "PATCH",
          body: JSON.stringify({
            location: "456 New Street",
            city: "New City",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchLocation(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.location).toBe("456 New Street");
    });

    it("should deny club_admin access to another club", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin-123", isRoot: false },
      });

      // Mock requireAnyAdmin to return club_admin for club-456
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ clubId: "club-456" }]); // Admin of different club

      // Mock canAccessClub - trying to access club-123 but admin of club-456
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        organizationId: "org-1",
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PATCH",
          body: JSON.stringify({ name: "Unauthorized Update" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PatchClub(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
