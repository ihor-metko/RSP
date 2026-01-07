/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

import { GET, POST, DELETE } from "@/app/api/admin/clubs/[id]/admins/route";
import { prisma } from "@/lib/prisma";

describe("Admin Clubs Admins API - GET /api/admin/clubs/[id]/admins", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET - Read Access", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 404 when club not found", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/non-existent/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "non-existent" }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Club not found");
    });

    it("should allow Root Admin to read club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        {
          id: "membership-1",
          role: "CLUB_OWNER",
          user: { id: "user-1", name: "Owner User", email: "owner@test.com" },
        },
        {
          id: "membership-2",
          role: "CLUB_ADMIN",
          user: { id: "user-2", name: "Admin User", email: "admin@test.com" },
        },
      ]);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].role).toBe("owner");
      expect(data[1].role).toBe("admin");
    });

    it("should allow Organization Admin to read club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId: "org-admin",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        {
          id: "membership-1",
          role: "CLUB_OWNER",
          user: { id: "user-1", name: "Owner User", email: "owner@test.com" },
        },
      ]);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it("should allow Club Owner to read club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-owner", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      // Is a club owner
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId: "club-owner",
        clubId: "club-1",
        role: "CLUB_OWNER",
      });

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        {
          id: "membership-1",
          role: "CLUB_OWNER",
          user: { id: "club-owner", name: "Owner User", email: "owner@test.com" },
        },
      ]);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it("should allow Club Admin to read club admins", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      // Is a club admin
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId: "club-admin",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        {
          id: "membership-1",
          role: "CLUB_OWNER",
          user: { id: "user-1", name: "Owner User", email: "owner@test.com" },
        },
        {
          id: "membership-2",
          role: "CLUB_ADMIN",
          user: { id: "club-admin", name: "Admin User", email: "admin@test.com" },
        },
      ]);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });

    it("should return 403 when user has no club membership", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "random-user", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      // Not a club member
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user is only a regular club member", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-member", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      // Is a regular member (not admin or owner)
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        userId: "club-member",
        clubId: "club-1",
        role: "MEMBER",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "GET",
      });

      const response = await GET(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST - Write Access (Add Admin)", () => {
    it("should return 403 when Club Admin tries to add admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should allow Club Owner to add admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-owner", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Is a club owner
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: "club-owner",
        clubId: "club-1",
        role: "CLUB_OWNER",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "New Admin",
        email: "newadmin@test.com",
      });

      // No existing membership
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValueOnce(null);

      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.admin.id).toBe("user-1");
    });

    it("should allow Organization Admin to add club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId: "org-admin",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "New Admin",
        email: "newadmin@test.com",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow Root Admin to add club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-1",
        name: "New Admin",
        email: "newadmin@test.com",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue(null);

      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE - Write Access (Remove Admin)", () => {
    it("should return 403 when Club Admin tries to remove admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-admin", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should allow Club Owner to remove admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "club-owner", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      // Is a club owner
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: "club-owner",
        clubId: "club-1",
        role: "CLUB_OWNER",
      });

      // Not an org admin
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

      // Target membership to remove (a club admin)
      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      (prisma.clubMembership.delete as jest.Mock).mockResolvedValue({
        id: "membership-1",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow Organization Admin to remove club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin", isRoot: false },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        userId: "org-admin",
        organizationId: "org-1",
        role: "ORGANIZATION_ADMIN",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      (prisma.clubMembership.delete as jest.Mock).mockResolvedValue({
        id: "membership-1",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow Root Admin to remove club admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-admin", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-1",
        name: "Test Club",
        organizationId: "org-1",
      });

      (prisma.clubMembership.findUnique as jest.Mock).mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        clubId: "club-1",
        role: "CLUB_ADMIN",
      });

      (prisma.clubMembership.delete as jest.Mock).mockResolvedValue({
        id: "membership-1",
      });

      const request = new Request("http://localhost:3000/api/admin/clubs/club-1/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "user-1" }),
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: "club-1" }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
