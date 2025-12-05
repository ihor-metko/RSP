/**
 * @jest-environment node
 */

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    club: {
      count: jest.fn(),
    },
    court: {
      count: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
    clubMembership: {
      count: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock auth function
const mockAuth = jest.fn();
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import { GET } from "@/app/api/orgs/[orgId]/dashboard/route";
import { prisma } from "@/lib/prisma";

describe("GET /api/orgs/:orgId/dashboard", () => {
  const mockOrgId = "org-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user is not org admin and not root", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-123", isRoot: false },
    });

    // No membership found for this user in this organization
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should return dashboard data for organization admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-123", isRoot: false },
    });

    // User has ORGANIZATION_ADMIN role
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
      role: "ORGANIZATION_ADMIN",
    });

    // Mock organization data
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: mockOrgId,
      name: "Test Organization",
      slug: "test-org",
    });

    // Mock metrics
    (prisma.club.count as jest.Mock).mockResolvedValue(5);
    (prisma.court.count as jest.Mock).mockResolvedValue(12);
    (prisma.booking.count as jest.Mock).mockResolvedValue(8);
    (prisma.clubMembership.count as jest.Mock).mockResolvedValue(3);

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      metrics: {
        clubsCount: 5,
        courtsCount: 12,
        bookingsToday: 8,
        clubAdminsCount: 3,
      },
      org: {
        id: mockOrgId,
        name: "Test Organization",
        slug: "test-org",
      },
    });
  });

  it("should return dashboard data for root admin", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "root-123", isRoot: true },
    });

    // Mock organization data
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: mockOrgId,
      name: "Root Test Org",
      slug: "root-test-org",
    });

    // Mock metrics
    (prisma.club.count as jest.Mock).mockResolvedValue(10);
    (prisma.court.count as jest.Mock).mockResolvedValue(25);
    (prisma.booking.count as jest.Mock).mockResolvedValue(15);
    (prisma.clubMembership.count as jest.Mock).mockResolvedValue(7);

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metrics.clubsCount).toBe(10);
    expect(data.metrics.courtsCount).toBe(25);
    expect(data.metrics.bookingsToday).toBe(15);
    expect(data.metrics.clubAdminsCount).toBe(7);
    expect(data.org.name).toBe("Root Test Org");

    // Root admin should NOT trigger membership check
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it("should return 404 when organization is not found", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "root-123", isRoot: true },
    });

    // Organization not found
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Organization not found");
  });

  it("should return 403 when user has MEMBER role instead of ORGANIZATION_ADMIN", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "member-123", isRoot: false },
    });

    // User has MEMBER role, not ORGANIZATION_ADMIN
    (prisma.membership.findUnique as jest.Mock).mockResolvedValue({
      role: "MEMBER",
    });

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden");
  });

  it("should handle database errors gracefully", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "root-123", isRoot: true },
    });

    // Mock organization found but metrics query fails
    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: mockOrgId,
      name: "Test Org",
      slug: "test-org",
    });

    (prisma.club.count as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    const response = await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  it("should query bookings for today only", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "root-123", isRoot: true },
    });

    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      id: mockOrgId,
      name: "Test Org",
      slug: "test-org",
    });

    (prisma.club.count as jest.Mock).mockResolvedValue(1);
    (prisma.court.count as jest.Mock).mockResolvedValue(2);
    (prisma.booking.count as jest.Mock).mockResolvedValue(3);
    (prisma.clubMembership.count as jest.Mock).mockResolvedValue(1);

    const request = new Request(
      `http://localhost:3000/api/orgs/${mockOrgId}/dashboard`,
      { method: "GET" }
    );

    await GET(request, {
      params: Promise.resolve({ orgId: mockOrgId }),
    });

    // Verify booking count query includes date range for today
    expect(prisma.booking.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          start: expect.objectContaining({
            gte: expect.any(Date),
            lt: expect.any(Date),
          }),
        }),
      })
    );
  });
});
