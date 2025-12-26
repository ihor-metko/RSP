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
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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
      userSource: "new",
      name: "John Doe",
      email: "john@example.com",
      phone: "+380501234567",
      role: "ORGANIZATION_ADMIN",
      organizationId: "org-123",
    };

    const validClubAdminData = {
      userSource: "new",
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
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

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
      
      // Mock clubMembership.findMany to return different results based on the role filter
      (prisma.clubMembership.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where?.role === ClubMembershipRole.CLUB_OWNER) {
          return Promise.resolve([]);
        }
        if (where?.role === ClubMembershipRole.CLUB_ADMIN) {
          return Promise.resolve([{ clubId: "club-123", role: ClubMembershipRole.CLUB_ADMIN }]);
        }
        return Promise.resolve([]);
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
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
      
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
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

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
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
      
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

    // New tests for owner roles
    it("should create organization owner successfully as root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      const orgOwnerData = {
        userSource: "new",
        name: "Org Owner",
        email: "owner@example.com",
        phone: "+380501111111",
        role: "ORGANIZATION_OWNER",
        organizationId: "org-123",
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.membership.findFirst as jest.Mock).mockResolvedValue(null); // No existing owner
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-owner-123",
        email: "owner@example.com",
        name: "Org Owner",
      });
      (prisma.membership.create as jest.Mock).mockResolvedValue({
        id: "membership-owner-123",
        userId: "new-owner-123",
        organizationId: "org-123",
        role: MembershipRole.ORGANIZATION_ADMIN,
        isPrimaryOwner: true,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(orgOwnerData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe("new-owner-123");
      expect(data.role).toBe("ORGANIZATION_OWNER");
      expect(prisma.membership.create).toHaveBeenCalledWith({
        data: {
          userId: "new-owner-123",
          organizationId: "org-123",
          role: MembershipRole.ORGANIZATION_ADMIN,
          isPrimaryOwner: true,
        },
      });
    });

    it("should return 409 when organization already has an owner", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      const orgOwnerData = {
        userSource: "new",
        name: "Another Owner",
        email: "owner2@example.com",
        phone: "+380502222222",
        role: "ORGANIZATION_OWNER",
        organizationId: "org-123",
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.membership.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-owner",
        userId: "existing-owner-id",
        organizationId: "org-123",
        isPrimaryOwner: true,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(orgOwnerData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already has an owner");
      expect(data.field).toBe("owner");
    });

    it("should create club owner successfully as root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      const clubOwnerData = {
        userSource: "new",
        name: "Club Owner",
        email: "clubowner@example.com",
        phone: "+380503333333",
        role: "CLUB_OWNER",
        clubId: "club-123",
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
        organizationId: "org-123",
      });
      (prisma.clubMembership.findFirst as jest.Mock).mockResolvedValue(null); // No existing owner
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "new-club-owner-123",
        email: "clubowner@example.com",
        name: "Club Owner",
      });
      (prisma.clubMembership.create as jest.Mock).mockResolvedValue({
        id: "club-membership-owner-123",
        userId: "new-club-owner-123",
        clubId: "club-123",
        role: ClubMembershipRole.CLUB_OWNER,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(clubOwnerData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe("new-club-owner-123");
      expect(data.role).toBe("CLUB_OWNER");
      expect(prisma.clubMembership.create).toHaveBeenCalledWith({
        data: {
          userId: "new-club-owner-123",
          clubId: "club-123",
          role: ClubMembershipRole.CLUB_OWNER,
        },
      });
    });

    it("should return 409 when club already has an owner", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      const clubOwnerData = {
        userSource: "new",
        name: "Another Club Owner",
        email: "clubowner2@example.com",
        phone: "+380504444444",
        role: "CLUB_OWNER",
        clubId: "club-123",
      };

      (prisma.club.findUnique as jest.Mock).mockResolvedValue({
        id: "club-123",
        name: "Test Club",
        organizationId: "org-123",
      });
      (prisma.clubMembership.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-club-owner",
        userId: "existing-club-owner-id",
        clubId: "club-123",
        role: ClubMembershipRole.CLUB_OWNER,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(clubOwnerData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already has an owner");
      expect(data.field).toBe("owner");
    });

    it("should assign role to existing user successfully", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      const existingUserData = {
        userSource: "existing",
        userId: "existing-user-123",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user-123",
        email: "existing@example.com",
        name: "Existing User",
      });
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null); // No existing membership
      (prisma.membership.create as jest.Mock).mockResolvedValue({
        id: "membership-456",
        userId: "existing-user-123",
        organizationId: "org-123",
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(existingUserData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.userId).toBe("existing-user-123");
      expect(data.email).toBe("existing@example.com");
      expect(data.message).toContain("Role assigned successfully");
    });

    it("should return 409 when existing user already has role in organization", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "root-123", isRoot: true },
      });

      const existingUserData = {
        userSource: "existing",
        userId: "existing-user-123",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
      };

      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: "org-123", name: "Test Org" });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-user-123",
        email: "existing@example.com",
        name: "Existing User",
      });
      (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-membership",
        userId: "existing-user-123",
        organizationId: "org-123",
        role: MembershipRole.ORGANIZATION_ADMIN,
      });

      const request = new Request("http://localhost:3000/api/admin/admins/create", {
        method: "POST",
        body: JSON.stringify(existingUserData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already has a role");
    });
  });
});
