/**
 * @jest-environment node
 */
import { GET } from "@/app/api/admin/notifications/route";
import { POST } from "@/app/api/admin/notifications/mark-all-read/route";
import { PATCH } from "@/app/api/admin/notifications/[id]/route";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    adminNotification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    coach: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock requireRole
jest.mock("@/lib/requireRole", () => ({
  requireRole: jest.fn(),
}));

import { requireRole } from "@/lib/requireRole";

describe("Admin Notifications API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  describe("GET /api/admin/notifications", () => {
    it("should return 401 if not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/admin/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if not admin", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/admin/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return notifications for authenticated admin", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-123",
        userRole: "super_admin",
      });

      const mockNotifications = [
        {
          id: "notif-1",
          type: "REQUESTED",
          playerId: "player-123",
          coachId: "coach-123",
          trainingRequestId: "training-1",
          bookingId: null,
          sessionDate: new Date("2024-01-15"),
          sessionTime: "10:00",
          courtInfo: "Court 1",
          read: false,
          createdAt: new Date("2024-01-10"),
        },
      ];

      (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
      (prisma.adminNotification.count as jest.Mock)
        .mockResolvedValueOnce(1) // totalCount
        .mockResolvedValueOnce(1); // unreadCount
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{
        id: "player-123",
        name: "John Player",
        email: "john@example.com",
      }]);
      (prisma.coach.findMany as jest.Mock).mockResolvedValue([{
        id: "coach-123",
        user: { name: "Coach Smith" },
      }]);

      const request = new Request("http://localhost:3000/api/admin/notifications");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
      expect(data.notifications[0].type).toBe("REQUESTED");
      expect(data.notifications[0].playerName).toBe("John Player");
      expect(data.notifications[0].coachName).toBe("Coach Smith");
      expect(data.unreadCount).toBe(1);
    });

    it("should filter by unreadOnly when provided", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-123",
        userRole: "super_admin",
      });

      (prisma.adminNotification.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.adminNotification.count as jest.Mock).mockResolvedValue(0);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.coach.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/admin/notifications?unreadOnly=true");
      await GET(request);

      expect(prisma.adminNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { read: false },
        })
      );
    });
  });

  describe("PATCH /api/admin/notifications/[id]", () => {
    it("should return 401 if not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/admin/notifications/notif-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      const response = await PATCH(request, createContext("notif-1"));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if read field is missing", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-123",
        userRole: "super_admin",
      });

      const request = new Request("http://localhost:3000/api/admin/notifications/notif-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await PATCH(request, createContext("notif-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Missing or invalid 'read' field");
    });

    it("should return 404 if notification not found", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-123",
        userRole: "super_admin",
      });

      (prisma.adminNotification.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/admin/notifications/notif-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      const response = await PATCH(request, createContext("notif-1"));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Notification not found");
    });

    it("should mark notification as read successfully", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-123",
        userRole: "super_admin",
      });

      (prisma.adminNotification.findUnique as jest.Mock).mockResolvedValue({
        id: "notif-1",
        read: false,
      });

      (prisma.adminNotification.update as jest.Mock).mockResolvedValue({
        id: "notif-1",
        read: true,
      });

      const request = new Request("http://localhost:3000/api/admin/notifications/notif-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      const response = await PATCH(request, createContext("notif-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.read).toBe(true);
      expect(data.message).toContain("marked as read");
    });
  });

  describe("POST /api/admin/notifications/mark-all-read", () => {
    it("should return 401 if not authenticated", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const request = new Request("http://localhost:3000/api/admin/notifications/mark-all-read", {
        method: "POST",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should mark all notifications as read", async () => {
      (requireRole as jest.Mock).mockResolvedValue({
        authorized: true,
        userId: "admin-123",
        userRole: "super_admin",
      });

      (prisma.adminNotification.updateMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const request = new Request("http://localhost:3000/api/admin/notifications/mark-all-read", {
        method: "POST",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBe(5);
      expect(data.message).toContain("5 notification(s) marked as read");
    });
  });
});
