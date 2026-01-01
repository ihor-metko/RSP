/**
 * Tests for /api/admin/clubs/:clubId/bookings/overview endpoint
 * @jest-environment node
 */

import { GET } from "@/app/api/admin/clubs/[id]/bookings/overview/route";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      findUnique: jest.fn(),
    },
    booking: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/requireRole", () => ({
  requireAnyAdmin: jest.fn(),
}));

const mockRequireAnyAdmin = requireAnyAdmin as jest.MockedFunction<typeof requireAnyAdmin>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GET /api/admin/clubs/:clubId/bookings/overview", () => {
  const mockClubId = "club-123";
  const mockUserId = "user-456";
  const mockOrgId = "org-789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 404 if club does not exist", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: true,
      adminType: "root_admin",
      managedIds: [],
    });

    mockPrisma.club.findUnique.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: "Club not found" });
  });

  it("should return 403 if organization admin does not manage the club's organization", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: false,
      adminType: "organization_admin",
      managedIds: ["different-org-id"],
    });

    mockPrisma.club.findUnique.mockResolvedValue({
      id: mockClubId,
      name: "Test Club",
      organizationId: mockOrgId,
    } as any);

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({ error: "Forbidden" });
  });

  it("should return 403 if club admin does not manage this specific club", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: false,
      adminType: "club_admin",
      managedIds: ["different-club-id"],
    });

    mockPrisma.club.findUnique.mockResolvedValue({
      id: mockClubId,
      name: "Test Club",
      organizationId: mockOrgId,
    } as any);

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({ error: "Forbidden" });
  });

  it("should return bookings overview for root admin", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: true,
      adminType: "root_admin",
      managedIds: [],
    });

    mockPrisma.club.findUnique.mockResolvedValue({
      id: mockClubId,
      name: "Test Club",
      organizationId: mockOrgId,
    } as any);

    // Mock booking counts
    mockPrisma.booking.count
      .mockResolvedValueOnce(5) // today
      .mockResolvedValueOnce(15) // week
      .mockResolvedValueOnce(50); // upcoming

    // Mock upcoming bookings
    const mockBookings = [
      {
        id: "booking-1",
        start: new Date("2026-01-02T10:00:00Z"),
        end: new Date("2026-01-02T11:00:00Z"),
        bookingStatus: "Active",
        sportType: "PADEL",
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
        court: {
          name: "Court 1",
          club: {
            name: "Test Club",
          },
        },
      },
      {
        id: "booking-2",
        start: new Date("2026-01-02T12:00:00Z"),
        end: new Date("2026-01-02T13:00:00Z"),
        bookingStatus: "Pending",
        sportType: "PADEL",
        user: {
          name: "Jane Smith",
          email: "jane@example.com",
        },
        court: {
          name: "Court 2",
          club: {
            name: "Test Club",
          },
        },
      },
    ];

    mockPrisma.booking.findMany.mockResolvedValue(mockBookings as any);

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toEqual({
      todayCount: 5,
      weekCount: 15,
      upcomingCount: 50,
      upcomingBookings: [
        {
          id: "booking-1",
          courtName: "Court 1",
          clubName: "Test Club",
          userName: "John Doe",
          userEmail: "john@example.com",
          start: "2026-01-02T10:00:00.000Z",
          end: "2026-01-02T11:00:00.000Z",
          status: "Active",
          sportType: "PADEL",
        },
        {
          id: "booking-2",
          courtName: "Court 2",
          clubName: "Test Club",
          userName: "Jane Smith",
          userEmail: "jane@example.com",
          start: "2026-01-02T12:00:00.000Z",
          end: "2026-01-02T13:00:00.000Z",
          status: "Pending",
          sportType: "PADEL",
        },
      ],
    });

    // Verify correct Prisma queries were made
    expect(mockPrisma.booking.count).toHaveBeenCalledTimes(3);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          court: { clubId: mockClubId },
        }),
        orderBy: { start: "asc" },
        take: 10,
      })
    );
  });

  it("should return bookings overview for organization admin with valid access", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: false,
      adminType: "organization_admin",
      managedIds: [mockOrgId],
    });

    mockPrisma.club.findUnique.mockResolvedValue({
      id: mockClubId,
      name: "Test Club",
      organizationId: mockOrgId,
    } as any);

    mockPrisma.booking.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(25);

    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toEqual({
      todayCount: 3,
      weekCount: 10,
      upcomingCount: 25,
      upcomingBookings: [],
    });
  });

  it("should return bookings overview for club admin with valid access", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: false,
      adminType: "club_admin",
      managedIds: [mockClubId],
    });

    mockPrisma.club.findUnique.mockResolvedValue({
      id: mockClubId,
      name: "Test Club",
      organizationId: mockOrgId,
    } as any);

    mockPrisma.booking.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(20);

    mockPrisma.booking.findMany.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toEqual({
      todayCount: 2,
      weekCount: 8,
      upcomingCount: 20,
      upcomingBookings: [],
    });
  });

  it("should handle errors gracefully", async () => {
    mockRequireAnyAdmin.mockResolvedValue({
      authorized: true,
      userId: mockUserId,
      isRoot: true,
      adminType: "root_admin",
      managedIds: [],
    });

    mockPrisma.club.findUnique.mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost:3000/api/admin/clubs/club-123/bookings/overview");
    const params = Promise.resolve({ id: mockClubId });
    const response = await GET(request, { params });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data).toEqual({ error: "Internal server error" });
  });
});
