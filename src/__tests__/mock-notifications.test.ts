/**
 * @jest-environment node
 */
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import {
  initializeMockData,
  getMockAdminNotifications,
  findAdminNotificationById,
  updateMockNotification,
  markAllMockNotificationsAsRead,
  createMockAdminNotification,
} from "@/services/mockDb";
import {
  mockGetAdminNotifications,
  mockGetAdminNotificationById,
  mockUpdateAdminNotification,
  mockMarkAllNotificationsAsRead,
} from "@/services/mockApiHandlers";

describe("Mock Notifications", () => {
  beforeEach(() => {
    // Reset mock data before each test
    initializeMockData();
  });

  describe("Mock Data Initialization", () => {
    it("should initialize admin notifications", () => {
      const notifications = getMockAdminNotifications();
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0]).toHaveProperty("id");
      expect(notifications[0]).toHaveProperty("type");
      expect(notifications[0]).toHaveProperty("playerId");
      expect(notifications[0]).toHaveProperty("coachId");
      expect(notifications[0]).toHaveProperty("read");
      expect(notifications[0]).toHaveProperty("createdAt");
    });

    it("should have notifications with different types", () => {
      const notifications = getMockAdminNotifications();
      const types = new Set(notifications.map((n) => n.type));
      expect(types.size).toBeGreaterThan(1);
      expect(
        types.has("REQUESTED") ||
          types.has("ACCEPTED") ||
          types.has("DECLINED") ||
          types.has("CANCELED")
      ).toBe(true);
    });

    it("should have both read and unread notifications", () => {
      const notifications = getMockAdminNotifications();
      const hasRead = notifications.some((n) => n.read);
      const hasUnread = notifications.some((n) => !n.read);
      expect(hasRead).toBe(true);
      expect(hasUnread).toBe(true);
    });
  });

  describe("CRUD Helpers", () => {
    it("should find notification by id", () => {
      const notifications = getMockAdminNotifications();
      const notification = findAdminNotificationById(notifications[0].id);
      expect(notification).toBeDefined();
      expect(notification?.id).toBe(notifications[0].id);
    });

    it("should return undefined for non-existent notification", () => {
      const notification = findAdminNotificationById("non-existent-id");
      expect(notification).toBeUndefined();
    });

    it("should update notification read status", () => {
      const notifications = getMockAdminNotifications();
      const unreadNotif = notifications.find((n) => !n.read);
      expect(unreadNotif).toBeDefined();

      const updated = updateMockNotification(unreadNotif!.id, { read: true });
      expect(updated).toBeDefined();
      expect(updated?.read).toBe(true);
    });

    it("should mark all notifications as read", () => {
      const notifications = getMockAdminNotifications();
      const unreadCount = notifications.filter((n) => !n.read).length;
      expect(unreadCount).toBeGreaterThan(0);

      const count = markAllMockNotificationsAsRead();
      expect(count).toBe(unreadCount);

      const updatedNotifications = getMockAdminNotifications();
      const remainingUnread = updatedNotifications.filter((n) => !n.read).length;
      expect(remainingUnread).toBe(0);
    });

    it("should create a new notification", () => {
      const initialNotifications = getMockAdminNotifications();

      const newNotification = createMockAdminNotification({
        type: "REQUESTED",
        playerId: "user-4",
        coachId: "coach-1",
        trainingRequestId: "tr-test",
        bookingId: null,
        sessionDate: new Date(),
        sessionTime: "10:00",
        courtInfo: "Test Court",
      });

      expect(newNotification).toBeDefined();
      expect(newNotification.id).toBeTruthy();
      expect(newNotification.type).toBe("REQUESTED");
      expect(newNotification.read).toBe(false);

      const updatedNotifications = getMockAdminNotifications();
      expect(updatedNotifications.length).toBe(initialNotifications.length + 1);
    });
  });

  describe("Mock API Handlers", () => {
    it("should get all notifications", async () => {
      const result = await mockGetAdminNotifications({
        unreadOnly: false,
        limit: 50,
        offset: 0,
      });

      expect(result).toHaveProperty("notifications");
      expect(result).toHaveProperty("totalCount");
      expect(result).toHaveProperty("unreadCount");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.notifications)).toBe(true);
      expect(result.totalCount).toBeGreaterThan(0);
    });

    it("should filter unread notifications only", async () => {
      const result = await mockGetAdminNotifications({
        unreadOnly: true,
        limit: 50,
        offset: 0,
      });

      expect(result.notifications.every((n) => !n.read)).toBe(true);
    });

    it("should enrich notifications with player and coach names", async () => {
      const result = await mockGetAdminNotifications({
        unreadOnly: false,
        limit: 50,
        offset: 0,
      });

      const notification = result.notifications[0];
      expect(notification).toHaveProperty("playerName");
      expect(notification).toHaveProperty("coachName");
      expect(notification.playerName).not.toBe("Unknown Player");
      expect(notification.coachName).not.toBe("Unknown Coach");
    });

    it("should get notification by id", async () => {
      const notifications = getMockAdminNotifications();
      const result = await mockGetAdminNotificationById(notifications[0].id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(notifications[0].id);
      expect(result).toHaveProperty("playerName");
      expect(result).toHaveProperty("coachName");
    });

    it("should update notification through handler", async () => {
      const notifications = getMockAdminNotifications();
      const unreadNotif = notifications.find((n) => !n.read);
      expect(unreadNotif).toBeDefined();

      const result = await mockUpdateAdminNotification(unreadNotif!.id, { read: true });
      expect(result).toBeDefined();
      expect(result.read).toBe(true);
    });

    it("should throw error when updating non-existent notification", async () => {
      await expect(
        mockUpdateAdminNotification("non-existent-id", { read: true })
      ).rejects.toThrow("Notification not found");
    });

    it("should mark all as read through handler", async () => {
      const result = await mockMarkAllNotificationsAsRead();
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("count");
      expect(result.count).toBeGreaterThan(0);
    });

    it("should support pagination", async () => {
      const page1 = await mockGetAdminNotifications({
        unreadOnly: false,
        limit: 2,
        offset: 0,
      });
      const page2 = await mockGetAdminNotifications({
        unreadOnly: false,
        limit: 2,
        offset: 2,
      });

      expect(page1.notifications.length).toBeLessThanOrEqual(2);
      expect(page2.notifications.length).toBeLessThanOrEqual(2);

      if (page1.notifications.length > 0 && page2.notifications.length > 0) {
        expect(page1.notifications[0].id).not.toBe(page2.notifications[0].id);
      }
    });

    it("should sort notifications by creation date descending", async () => {
      const result = await mockGetAdminNotifications({
        unreadOnly: false,
        limit: 50,
        offset: 0,
      });

      for (let i = 0; i < result.notifications.length - 1; i++) {
        const current = new Date(result.notifications[i].createdAt);
        const next = new Date(result.notifications[i + 1].createdAt);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    });
  });
});
