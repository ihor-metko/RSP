/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
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

import { GET, POST } from "@/app/api/admin/clubs/route";
import { PUT, DELETE } from "@/app/api/admin/clubs/[id]/route";
import { prisma } from "@/lib/prisma";

describe("Admin Clubs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/clubs", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return all clubs for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockClubs = [
        {
          id: "club-1",
          name: "Club A",
          shortDescription: null,
          location: "Location A",
          city: null,
          contactInfo: "contact@a.com",
          openingHours: "9am-10pm",
          logo: null,
          heroImage: null,
          tags: null,
          isPublic: true,
          createdAt: new Date().toISOString(),
          courts: [
            { id: "court-1", indoor: true },
            { id: "court-2", indoor: false },
          ],
        },
        {
          id: "club-2",
          name: "Club B",
          shortDescription: "Great club",
          location: "Location B",
          city: "City B",
          contactInfo: null,
          openingHours: null,
          logo: "https://example.com/logo.png",
          heroImage: null,
          tags: null,
          isPublic: false,
          createdAt: new Date().toISOString(),
          courts: [],
        },
      ];

      (prisma.club.findMany as jest.Mock).mockResolvedValue(mockClubs);

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Club A");
      expect(data[0].indoorCount).toBe(1);
      expect(data[0].outdoorCount).toBe(1);
      expect(data[0].courtCount).toBe(2);
      expect(data[1].indoorCount).toBe(0);
      expect(data[1].outdoorCount).toBe(0);
      expect(data[1].courtCount).toBe(0);
    });

    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "GET",
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/admin/clubs", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Club", location: "Test Location" }),
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

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Club", location: "Test Location" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should create a new club for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const newClub = {
        id: "club-new",
        name: "New Club",
        location: "New Location",
        contactInfo: "newclub@test.com",
        openingHours: "8am-9pm",
        logo: "https://example.com/newlogo.png",
        createdAt: new Date().toISOString(),
      };

      (prisma.club.create as jest.Mock).mockResolvedValue(newClub);

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "POST",
        body: JSON.stringify({
          name: "New Club",
          location: "New Location",
          contactInfo: "newclub@test.com",
          openingHours: "8am-9pm",
          logo: "https://example.com/newlogo.png",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Club");
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "POST",
        body: JSON.stringify({ location: "Test Location" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and location are required");
    });

    it("should return 400 when location is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request("http://localhost:3000/api/admin/clubs", {
        method: "POST",
        body: JSON.stringify({ name: "Test Club" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and location are required");
    });
  });

  describe("PUT /api/admin/clubs/:id", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Club", location: "Location" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Club", location: "Location" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
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
        "http://localhost:3000/api/admin/clubs/nonexistent",
        {
          method: "PUT",
          body: JSON.stringify({ name: "Updated Club", location: "Location" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should update club for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingClub = {
        id: "club-123",
        name: "Old Name",
        location: "Old Location",
      };

      const updatedClub = {
        id: "club-123",
        name: "Updated Club",
        location: "Updated Location",
        contactInfo: "updated@test.com",
        openingHours: null,
        logo: null,
        createdAt: new Date().toISOString(),
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(existingClub);
      (prisma.club.update as jest.Mock).mockResolvedValue(updatedClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PUT",
          body: JSON.stringify({
            name: "Updated Club",
            location: "Updated Location",
            contactInfo: "updated@test.com",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Club");
    });

    it("should return 400 when name is missing on update", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Existing",
        location: "Location",
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        {
          method: "PUT",
          body: JSON.stringify({ location: "Updated Location" }),
          headers: { "Content-Type": "application/json" },
        }
      );

      const response = await PUT(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Name and location are required");
    });
  });

  describe("DELETE /api/admin/clubs/:id", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
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
        "http://localhost:3000/api/admin/clubs/nonexistent",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should delete club for admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const existingClub = {
        id: "club-123",
        name: "Club to Delete",
        location: "Location",
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(existingClub);
      (prisma.club.delete as jest.Mock).mockResolvedValue(existingClub);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Club deleted successfully");
    });

    it("should return 500 for database errors on delete", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Club",
        location: "Location",
      });
      (prisma.club.delete as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123",
        { method: "DELETE" }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
