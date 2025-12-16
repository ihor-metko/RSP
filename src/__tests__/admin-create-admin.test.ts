/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    clubMembership: {
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { POST } from "@/app/api/admin/admins/create/route";
import { prisma } from "@/lib/prisma";
import { MembershipRole, ClubMembershipRole } from "@/constants/roles";

describe("Admin Create Admin API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/admins/create", () => {
    const validOrgAdminData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+380501234567",
      role: "ORGANIZATION_ADMIN",
      organizationId: "org-123",
    };

    const validClubAdminData = {
      name: "Jane Smith",
      email: "jane@example.com",
      phone: "+380507654321",
      role: "CLUB_ADMIN",
      clubId: "club-123",
    };

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
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
      Object.assign(prisma.clubMembership, {
        findMany: jest.fn().mockResolvedValue([])
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when club admin tries to create admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      // Mock: user is a club admin
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      Object.assign(prisma.clubMembership, {
        findMany: jest.fn().mockResolvedValue([
          { clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN },
        ])
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Club admins cannot create other admins");
    });

    it("should return 400 when name is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      const invalidData = { ...validOrgAdminData, name: "" };

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Name");
    });

    it("should return 400 when email is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      const invalidData = { ...validOrgAdminData, email: "not-an-email" };

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("email");
      expect(data.field).toBe("email");
    });

    it("should return 400 when role is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      const invalidData = { ...validOrgAdminData, role: "INVALID_ROLE" };

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("role");
    });

    it("should return 400 when organizationId is missing for ORGANIZATION_ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      const invalidData = { ...validOrgAdminData, organizationId: undefined };

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Organization ID");
    });

    it("should return 400 when clubId is missing for CLUB_ADMIN", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      const invalidData = { ...validClubAdminData, clubId: undefined };

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Club ID");
    });

    it("should return 409 when email already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing-user", email: "john@example.com" });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("email");
      expect(data.field).toBe("email");
    });

    it("should return 404 when organization does not exist", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Organization");
    });

    it("should return 404 when club does not exist", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validClubAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain("Club");
    });

    it("should create organization admin successfully as root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-123",
        email: "john@example.com",
        name: "John Doe",
      });
      (prisma.membership.create as jest.Mock).mockResolvedValue({
        id: "membership-123",
        userId: "new-user-123",
        organizationId: "org-123",
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe("new-user-123");
      expect(data.email).toBe("john@example.com");
      expect(data.name).toBe("John Doe");
      expect(data.role).toBe("ORGANIZATION_ADMIN");
      expect(prisma.membership.create).toHaveBeenCalledWith({
        data: {
          userId: "new-user-123",
          organizationId: "org-123",
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: false,
        },
      });
    });

    it("should create club admin successfully as root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
        organizationId: "org-123",
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-456",
        email: "jane@example.com",
        name: "Jane Smith",
      });
      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "club-membership-123",
        userId: "new-user-456",
        clubId: "club-123",
        role: ClubMembershipRole.CLUB_ADMIN,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validClubAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe("new-user-456");
      expect(data.email).toBe("jane@example.com");
      expect(data.name).toBe("Jane Smith");
      expect(data.role).toBe("CLUB_ADMIN");
      expect(prisma.clubMembership.create).toHaveBeenCalledWith({
        data: {
          userId: "new-user-456",
          clubId: "club-123",
          role: ClubMembershipRole.CLUB_ADMIN,
        },
      });
    });

    it("should allow org admin to create admin for their organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      // Mock: user is org admin for org-123
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-123", role: MembershipRole.ORGANIZATION_ADMIN },
      ]);
      Object.assign(prisma.clubMembership, {
        findMany: jest.fn().mockResolvedValue([])
      });
      
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-user-789",
        email: "john@example.com",
        name: "John Doe",
      });
      (prisma.membership.create as jest.Mock).mockResolvedValue({
        id: "membership-789",
        userId: "new-user-789",
        organizationId: "org-123",
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe("new-user-789");
    });

    it("should return 403 when org admin tries to create admin for different organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      // Mock: user is org admin for org-456 (different from requested org-123)
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-456", role: MembershipRole.ORGANIZATION_ADMIN },
      ]);
      Object.assign(prisma.clubMembership, {
        findMany: jest.fn().mockResolvedValue([])
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validOrgAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("manage");
    });

    it("should return 403 when org admin tries to create club admin for club outside their org", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "org-admin-123", isRoot: false },
      });

      // Mock: user is org admin for org-456
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org-456", role: MembershipRole.ORGANIZATION_ADMIN },
      ]);
      Object.assign(prisma.clubMembership, {
        findMany: jest.fn().mockResolvedValue([])
      });
      
      // Mock: club belongs to org-789 (different from user's org-456)
      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        organizationId: "org-789",
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(validClubAdminData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("organization");
    });
  });
});
