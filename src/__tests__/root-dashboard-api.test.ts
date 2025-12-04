/**
 * @jest-environment node
 */

jest.mock("@/lib/prisma", () => ({
  prisma: {
    club: {
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { GET } from "@/app/api/admin/root-dashboard/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

describe("Root Dashboard API", () => {
  const mockRequest = new NextRequest("http://localhost:3000/api/admin/root-dashboard");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/root-dashboard", () => {
    it("should return 401 when not authenticated", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 when user is a player", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "user-1", isRoot: false },
      });

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return statistics for root_admin user", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });
      (prisma.club.count as jest.Mock).mockResolvedValue(5);
      (prisma.user.count as jest.Mock).mockResolvedValue(100);
      (prisma.booking.count as jest.Mock).mockResolvedValue(25);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        totalClubs: 5,
        totalUsers: 100,
        activeBookings: 25,
      });
    });

    it("should only count pending and paid bookings as active", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });
      (prisma.club.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock).mockResolvedValue(10);

      await GET(mockRequest);

      expect(prisma.booking.count).toHaveBeenCalledWith({
        where: {
          status: {
            in: ["pending", "paid"],
          },
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });
      (prisma.club.count as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });

    it("should return zero values when no data exists", async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: "root-admin-1", isRoot: true },
      });
      (prisma.club.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.count as jest.Mock).mockResolvedValue(0);
      (prisma.booking.count as jest.Mock).mockResolvedValue(0);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        totalClubs: 0,
        totalUsers: 0,
        activeBookings: 0,
      });
    });
  });
});
