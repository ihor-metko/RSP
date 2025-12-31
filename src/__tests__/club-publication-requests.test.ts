/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clubPublicationRequest: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

// Mock notification emitter
jest.mock("@/lib/notificationEmitter", () => ({
  notificationEmitter: {
    emit: jest.fn(),
  },
}));

// Mock global.io
global.io = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
} as unknown as typeof global.io;

import { POST as RequestPublication } from "@/app/api/admin/clubs/[id]/request-publication/route";
import { GET as ListRequests } from "@/app/api/admin/publication-requests/route";
import { POST as ApproveRequest } from "@/app/api/admin/publication-requests/[id]/approve/route";
import { POST as RejectRequest } from "@/app/api/admin/publication-requests/[id]/reject/route";
import { prisma } from "@/lib/prisma";

describe("Club Publication Request APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/clubs/[id]/request-publication", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/request-publication",
        { method: "POST" }
      );

      const response = await RequestPublication(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not an admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      // Mock membership queries to return empty arrays (user is not an admin)
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/request-publication",
        { method: "POST" }
      );

      const response = await RequestPublication(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 400 when root admin tries to request publication", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/request-publication",
        { method: "POST" }
      );

      const response = await RequestPublication(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Root admins can publish clubs directly");
    });

    it("should return 404 when club not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      // Mock as organization admin
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-123" }
      ]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/request-publication",
        { method: "POST" }
      );

      const response = await RequestPublication(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should return 400 when club is already published", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      // Mock as organization admin
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-123" }
      ]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
        organizationId: "org-123",
        isPublic: true,
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/request-publication",
        { method: "POST" }
      );

      const response = await RequestPublication(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Club is already published");
    });

    it("should return 409 when pending request already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      // Mock as organization admin
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-123" }
      ]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
        organizationId: "org-123",
        isPublic: false,
      });

      (prisma.clubPublicationRequest.findFirst as jest.Mock).mockResolvedValue({
        id: "request-123",
        status: "PENDING",
      });

      const request = new Request(
        "http://localhost:3000/api/admin/clubs/club-123/request-publication",
        { method: "POST" }
      );

      const response = await RequestPublication(request, {
        params: Promise.resolve({ id: "club-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already pending");
    });
  });

  describe("GET /api/admin/publication-requests", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests",
        { method: "GET" }
      );

      const response = await ListRequests(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests",
        { method: "GET" }
      );

      const response = await ListRequests(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return list of publication requests for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      const mockRequests = [
        {
          id: "request-123",
          clubId: "club-123",
          requestedById: "user-123",
          status: "PENDING",
          createdAt: new Date(),
          club: {
            id: "club-123",
            name: "Test Club",
            slug: "test-club",
            organizationId: "org-123",
            organization: {
              id: "org-123",
              name: "Test Org",
              slug: "test-org",
            },
          },
          requestedBy: {
            id: "user-123",
            name: "Test User",
            email: "test@example.com",
          },
          reviewedBy: null,
        },
      ];

      (prisma.clubPublicationRequest.findMany as jest.Mock).mockResolvedValue(mockRequests);
      (prisma.clubPublicationRequest.count as jest.Mock).mockResolvedValue(1);

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests",
        { method: "GET" }
      );

      const response = await ListRequests(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });
  });

  describe("POST /api/admin/publication-requests/[id]/approve", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests/request-123/approve",
        { method: "POST" }
      );

      const response = await ApproveRequest(request, {
        params: Promise.resolve({ id: "request-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests/request-123/approve",
        { method: "POST" }
      );

      const response = await ApproveRequest(request, {
        params: Promise.resolve({ id: "request-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 404 when request not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.clubPublicationRequest.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests/request-123/approve",
        { method: "POST" }
      );

      const response = await ApproveRequest(request, {
        params: Promise.resolve({ id: "request-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Publication request not found");
    });

    it("should return 400 when request is not pending", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: true },
      });

      (prisma.clubPublicationRequest.findUnique as jest.Mock).mockResolvedValue({
        id: "request-123",
        status: "APPROVED",
        club: { id: "club-123", name: "Test Club" },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests/request-123/approve",
        { method: "POST" }
      );

      const response = await ApproveRequest(request, {
        params: Promise.resolve({ id: "request-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("already approved");
    });
  });

  describe("POST /api/admin/publication-requests/[id]/reject", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests/request-123/reject",
        {
          method: "POST",
          body: JSON.stringify({ reason: "Not ready" }),
        }
      );

      const response = await RejectRequest(request, {
        params: Promise.resolve({ id: "request-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "admin-123", isRoot: false },
      });

      const request = new Request(
        "http://localhost:3000/api/admin/publication-requests/request-123/reject",
        {
          method: "POST",
          body: JSON.stringify({ reason: "Not ready" }),
        }
      );

      const response = await RejectRequest(request, {
        params: Promise.resolve({ id: "request-123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
