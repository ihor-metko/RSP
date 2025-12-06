/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
    },
    clubMembership: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { GET } from "@/app/api/admin/dashboard/graphs/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("Dashboard Graphs API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/dashboard/graphs", () => {
    it("should return 401 for unauthenticated users", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Unauthorized");
    });

    it("should return 403 for non-admin users", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user1", isRoot: false },
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs");
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data).toHaveProperty("error", "Forbidden");
    });

    it("should return graph data for root admin with week range", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root1", isRoot: true },
      });

      const today = new Date();
      const bookings = [
        { createdAt: today },
        { createdAt: new Date(today.getTime() - 86400000) }, // 1 day ago
      ];

      const users = [
        { lastLoginAt: today },
        { lastLoginAt: new Date(today.getTime() - 86400000) },
      ];

      (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);
      (prisma.user.findMany as jest.Mock).mockResolvedValue(users);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs?timeRange=week");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("bookingTrends");
      expect(data).toHaveProperty("activeUsers");
      expect(data).toHaveProperty("timeRange", "week");
      expect(data.bookingTrends).toHaveLength(7); // 7 days
      expect(data.activeUsers).toHaveLength(7);
    });

    it("should return graph data for root admin with month range", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root1", isRoot: true },
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs?timeRange=month");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("timeRange", "month");
      expect(data.bookingTrends).toHaveLength(30); // 30 days
      expect(data.activeUsers).toHaveLength(30);
    });

    it("should return organization-scoped data for organization admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "org-admin1", isRoot: false },
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { organizationId: "org1" },
      ]);

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs");
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Verify booking query includes organization filter
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            court: expect.objectContaining({
              club: expect.objectContaining({
                organizationId: expect.objectContaining({
                  in: ["org1"],
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should return club-scoped data for club admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "club-admin1", isRoot: false },
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { clubId: "club1" },
      ]);

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs");
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      // Verify booking query includes club filter
      expect(prisma.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            court: expect.objectContaining({
              clubId: expect.objectContaining({
                in: ["club1"],
              }),
            }),
          }),
        })
      );
    });

    it("should aggregate bookings by date correctly", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root1", isRoot: true },
      });

      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const bookings = [
        { createdAt: new Date(today) },
        { createdAt: new Date(today) },
        { createdAt: new Date(today) },
      ];

      (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs?timeRange=week");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Find today's data point
      const todayData = data.bookingTrends.find((point: { date: string; bookings: number }) => point.date === todayStr);
      expect(todayData).toBeDefined();
      expect(todayData?.bookings).toBe(3);
    });

    it("should count unique active users from bookings", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root1", isRoot: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Mock bookings with multiple bookings from same user and different users
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        { userId: "user1", createdAt: today },
        { userId: "user1", createdAt: today }, // Same user, multiple bookings
        { userId: "user2", createdAt: today },
        { userId: "user3", createdAt: today },
      ]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs");
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Find today's data point
      const todayData = data.activeUsers.find((point: { date: string; users: number }) => point.date === todayStr);
      expect(todayData).toBeDefined();
      // Should count 3 unique users, not 4 bookings
      expect(todayData?.users).toBe(3);
    });

    it("should default to week range if timeRange parameter is invalid", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root1", isRoot: true },
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest("http://localhost:3000/api/admin/dashboard/graphs?timeRange=invalid");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.timeRange).toBe("week");
    });
  });
});
