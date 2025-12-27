/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    clubMembership: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    club: {
      findUnique: jest.fn(),
    },
    invite: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { POST as createInvite } from "@/app/api/invites/route";
import { GET as validateInvite } from "@/app/api/invites/validate/route";
import { POST as acceptInvite } from "@/app/api/invites/accept/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashInviteToken } from "@/lib/inviteUtils";

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrismaInviteCreate = prisma.invite.create as jest.MockedFunction<typeof prisma.invite.create>;
const mockPrismaInviteFindFirst = prisma.invite.findFirst as jest.MockedFunction<typeof prisma.invite.findFirst>;
const mockPrismaInviteFindUnique = prisma.invite.findUnique as jest.MockedFunction<typeof prisma.invite.findUnique>;
const mockPrismaInviteUpdate = prisma.invite.update as jest.MockedFunction<typeof prisma.invite.update>;
const mockPrismaMembershipFindUnique = prisma.membership.findUnique as jest.MockedFunction<typeof prisma.membership.findUnique>;
const mockPrismaMembershipFindFirst = prisma.membership.findFirst as jest.MockedFunction<typeof prisma.membership.findFirst>;
const mockPrismaClubMembershipFindFirst = prisma.clubMembership.findFirst as jest.MockedFunction<typeof prisma.clubMembership.findFirst>;
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.MockedFunction<typeof prisma.user.findUnique>;
const mockPrismaTransaction = prisma.$transaction as jest.MockedFunction<typeof prisma.$transaction>;

describe("Invite API Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/invites - Create Invite", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 if email is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Email");
    });

    it("should return 400 if role is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "INVALID_ROLE",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Role");
    });

    it("should return 400 if email format is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("email");
    });

    it("should return 400 if organizationId is missing for org role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "ORGANIZATION_ADMIN",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Organization ID");
    });

    it("should return 400 if clubId is missing for club role", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "CLUB_ADMIN",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Club ID");
    });

    it("should return 403 if user lacks permission to invite", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      mockPrismaMembershipFindUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(403);
    });

    it("should return 409 if organization already has an owner (for ORGANIZATION_OWNER)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      // Mock existing owner
      mockPrismaMembershipFindFirst.mockResolvedValue({
        id: "membership-1",
        userId: "other-user",
        organizationId: "org-123",
        role: "ORGANIZATION_ADMIN",
        isPrimaryOwner: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "ORGANIZATION_OWNER",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already has an owner");
    });

    it("should return 409 if club already has an owner (for CLUB_OWNER)", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      // Mock existing club owner
      mockPrismaClubMembershipFindFirst.mockResolvedValue({
        id: "membership-1",
        userId: "other-user",
        clubId: "club-123",
        role: "CLUB_OWNER",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "CLUB_OWNER",
          clubId: "club-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("already has an owner");
    });

    it("should return 409 if active invite already exists", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      mockPrismaMembershipFindFirst.mockResolvedValue(null);
      mockPrismaInviteFindFirst.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash: "hash",
        expiresAt: new Date(),
        invitedByUserId: "user-123",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain("active invite already exists");
    });

    it("should create invite successfully for root admin", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      mockPrismaMembershipFindFirst.mockResolvedValue(null);
      mockPrismaInviteFindFirst.mockResolvedValue(null);
      mockPrismaInviteCreate.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash: "hash",
        expiresAt: new Date(),
        invitedByUserId: "user-123",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.invite.token).toBeDefined();
      expect(data.invite.email).toBe("test@example.com");
    });

    it("should normalize email before creating invite", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: true },
      });

      mockPrismaMembershipFindFirst.mockResolvedValue(null);
      mockPrismaInviteFindFirst.mockResolvedValue(null);
      mockPrismaInviteCreate.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash: "hash",
        expiresAt: new Date(),
        invitedByUserId: "user-123",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/invites", {
        method: "POST",
        body: JSON.stringify({
          email: " Test@Example.COM ",
          role: "ORGANIZATION_ADMIN",
          organizationId: "org-123",
        }),
      });

      const response = await createInvite(request);
      expect(response.status).toBe(201);
      
      // Verify email was normalized in the create call
      expect(mockPrismaInviteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "test@example.com",
          }),
        })
      );
    });
  });

  describe("GET /api/invites/validate - Validate Token", () => {
    it("should return 400 if token is missing", async () => {
      const request = new Request("http://localhost/api/invites/validate");
      const response = await validateInvite(request);
      expect(response.status).toBe(400);
    });

    it("should return 404 if token is invalid", async () => {
      mockPrismaInviteFindUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/invites/validate?token=invalid-token");
      const response = await validateInvite(request);
      expect(response.status).toBe(404);
    });

    it("should return 410 if invite is already accepted", async () => {
      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "ACCEPTED",
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        invitedByUserId: "user-123",
        acceptedAt: new Date(),
        acceptedByUserId: "user-456",
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: { id: "org-123", name: "Test Org" },
        club: null,
      });

      const request = new Request(`http://localhost/api/invites/validate?token=${token}`);
      const response = await validateInvite(request);
      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toContain("already been accepted");
    });

    it("should return 410 if invite is revoked", async () => {
      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "REVOKED",
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        invitedByUserId: "user-123",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: { id: "org-123", name: "Test Org" },
        club: null,
      });

      const request = new Request(`http://localhost/api/invites/validate?token=${token}`);
      const response = await validateInvite(request);
      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toContain("revoked");
    });

    it("should return 410 if invite is expired", async () => {
      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired
        invitedByUserId: "user-123",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: { id: "org-123", name: "Test Org" },
        club: null,
      });

      mockPrismaInviteUpdate.mockResolvedValue({} as any);

      const request = new Request(`http://localhost/api/invites/validate?token=${token}`);
      const response = await validateInvite(request);
      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toContain("expired");
    });

    it("should return valid invite metadata for valid token", async () => {
      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        invitedByUserId: "user-123",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: { id: "org-123", name: "Test Org" },
        club: null,
      });

      const request = new Request(`http://localhost/api/invites/validate?token=${token}`);
      const response = await validateInvite(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.invite.email).toBe("test@example.com");
      expect(data.invite.role).toBe("ORGANIZATION_ADMIN");
      expect(data.invite.organization.name).toBe("Test Org");
    });
  });

  describe("POST /api/invites/accept - Accept Invite", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockAuth.mockResolvedValue(null);

      const request = new Request("http://localhost/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token: "test-token" }),
      });

      const response = await acceptInvite(request);
      expect(response.status).toBe(401);
    });

    it("should return 400 if token is missing", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const request = new Request("http://localhost/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await acceptInvite(request);
      expect(response.status).toBe(400);
    });

    it("should return 404 if token is invalid", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      mockPrismaInviteFindUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token: "invalid-token" }),
      });

      const response = await acceptInvite(request);
      expect(response.status).toBe(404);
    });

    it("should return 403 if user email does not match invite email", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "invited@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        invitedByUserId: "user-456",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaUserFindUnique.mockResolvedValue({
        id: "user-123",
        email: "different@example.com",
        name: "Test User",
        emailVerified: null,
        image: null,
        password: null,
        isRoot: false,
        blocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request = new Request("http://localhost/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      const response = await acceptInvite(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("different email");
    });

    it("should accept invite and create organization membership", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "ORGANIZATION_ADMIN",
        organizationId: "org-123",
        clubId: null,
        status: "PENDING",
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        invitedByUserId: "user-456",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaUserFindUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
        image: null,
        password: null,
        isRoot: false,
        blocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock transaction
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          membership: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: "membership-1",
              userId: "user-123",
              organizationId: "org-123",
              role: "ORGANIZATION_ADMIN",
              isPrimaryOwner: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          invite: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const request = new Request("http://localhost/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      const response = await acceptInvite(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.membership.type).toBe("organization");
    });

    it("should accept invite and create club membership", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-123", isRoot: false },
      });

      const token = "test-token";
      const tokenHash = hashInviteToken(token);

      mockPrismaInviteFindUnique.mockResolvedValue({
        id: "invite-1",
        email: "test@example.com",
        role: "CLUB_ADMIN",
        organizationId: null,
        clubId: "club-123",
        status: "PENDING",
        tokenHash,
        expiresAt: new Date(Date.now() + 100000),
        invitedByUserId: "user-456",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaUserFindUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        emailVerified: null,
        image: null,
        password: null,
        isRoot: false,
        blocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock transaction
      mockPrismaTransaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          clubMembership: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: "membership-1",
              userId: "user-123",
              clubId: "club-123",
              role: "CLUB_ADMIN",
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          },
          invite: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(mockTx);
      });

      const request = new Request("http://localhost/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      const response = await acceptInvite(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.membership.type).toBe("club");
    });
  });
});
