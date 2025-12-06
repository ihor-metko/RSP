/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: jest.fn(),
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

import { GET } from "@/app/api/admin/dashboard/registered-users/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("Registered Users API", () => {
  const mockRequest = new NextRequest(
    "http://localhost:3000/api/admin/dashboard/registered-users"
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/dashboard/registered-users", () => {
    it("should return 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is not a root admin", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return total users excluding admins", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      // Mock root admins
      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([{ id: "root-admin-1" }]);
        }
        // Mock recent users for trend
        return Promise.resolve([]);
      });

      // Mock organization admins
      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { userId: "org-admin-1" },
        { userId: "org-admin-2" },
      ]);

      // Mock club admins
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { userId: "club-admin-1" },
      ]);

      // Mock total user count (excluding admins)
      (prisma.user.count as jest.Mock).mockResolvedValue(50);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(50);
      expect(data.trend).toBeDefined();
      expect(Array.isArray(data.trend)).toBe(true);
      expect(data.trend.length).toBe(30); // 30 days of trend data
    });

    it("should exclude root admins from user count", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([
            { id: "root-admin-1" },
            { id: "root-admin-2" },
          ]);
        }
        return Promise.resolve([]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(48);

      await GET(mockRequest);

      // Verify that user.count was called with excluded IDs
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          id: {
            notIn: ["root-admin-1", "root-admin-2"],
          },
        },
      });
    });

    it("should exclude organization admins from user count", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { userId: "org-admin-1" },
        { userId: "org-admin-2" },
      ]);

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(48);

      await GET(mockRequest);

      // Verify that membership.findMany was called with correct filters
      expect(prisma.membership.findMany).toHaveBeenCalledWith({
        where: { role: "ORGANIZATION_ADMIN" },
        select: { userId: true },
        distinct: ["userId"],
      });
    });

    it("should exclude club admins from user count", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { userId: "club-admin-1" },
        { userId: "club-admin-2" },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(48);

      await GET(mockRequest);

      // Verify that clubMembership.findMany was called with correct filters
      expect(prisma.clubMembership.findMany).toHaveBeenCalledWith({
        where: { role: "CLUB_ADMIN" },
        select: { userId: true },
        distinct: ["userId"],
      });
    });

    it("should return zero users when only admins exist", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([{ id: "root-admin-1" }]);
        }
        return Promise.resolve([]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { userId: "org-admin-1" },
      ]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { userId: "club-admin-1" },
      ]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(0);
    });

    it("should return zero users when no users exist", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(0);
      expect(data.trend).toBeDefined();
      expect(data.trend.length).toBe(30);
    });

    it("should include trend data for last 30 days", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([]);
        }
        // Mock recent users - 5 users created today, 3 yesterday
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        return Promise.resolve([
          { createdAt: today },
          { createdAt: today },
          { createdAt: today },
          { createdAt: today },
          { createdAt: today },
          { createdAt: yesterday },
          { createdAt: yesterday },
          { createdAt: yesterday },
        ]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.count as jest.Mock).mockResolvedValue(58);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.trend).toBeDefined();
      expect(data.trend.length).toBe(30);

      // Check that each trend item has the correct structure
      data.trend.forEach((item: { date: string; count: number }) => {
        expect(item).toHaveProperty("date");
        expect(item).toHaveProperty("count");
        expect(typeof item.date).toBe("string");
        expect(typeof item.count).toBe("number");
        // Verify date format (YYYY-MM-DD)
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      // The last item should be today with 5 users
      const lastItem = data.trend[data.trend.length - 1];
      expect(lastItem.count).toBe(5);

      // The second to last should be yesterday with 3 users
      const secondLastItem = data.trend[data.trend.length - 2];
      expect(secondLastItem.count).toBe(3);
    });

    it("should handle database errors gracefully", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      (prisma.user.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should deduplicate admin IDs when user has multiple admin roles", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });

      // User with ID "multi-admin-1" is both org admin and club admin
      (prisma.user.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.isRoot === true) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });

      (prisma.membership.findMany as jest.Mock).mockResolvedValue([
        { userId: "multi-admin-1" },
        { userId: "org-admin-2" },
      ]);

      (prisma.clubMembership.findMany as jest.Mock).mockResolvedValue([
        { userId: "multi-admin-1" }, // Same user as org admin
        { userId: "club-admin-2" },
      ]);

      (prisma.user.count as jest.Mock).mockResolvedValue(46);

      await GET(mockRequest);

      // Verify that the excluded IDs contain unique values
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: {
          id: {
            // Should have 4 unique admin IDs, not 5
            notIn: expect.arrayContaining([
              "multi-admin-1",
              "org-admin-2",
              "club-admin-2",
            ]),
          },
        },
      });

      const callArgs = (prisma.user.count as jest.Mock).mock.calls[0][0];
      const notInArray = callArgs.where.id.notIn;
      expect(notInArray.length).toBe(3); // Only 3 unique IDs
    });
  });
});
