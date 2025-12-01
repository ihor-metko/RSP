/**
 * @jest-environment node
 */
import { notificationEmitter, notifyAdmin, NotificationPayload } from "@/lib/notificationEmitter";
import { prisma } from "@/lib/prisma";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    adminNotification: {
      create: jest.fn(),
    },
  },
}));

describe("NotificationEmitter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("notificationEmitter", () => {
    it("should allow subscribing and receiving events", () => {
      const listener = jest.fn();
      const unsubscribe = notificationEmitter.subscribe(listener);

      const payload: NotificationPayload = {
        id: "test-1",
        type: "REQUESTED",
        bookingId: null,
        coachId: "coach-1",
        playerId: "player-1",
        trainingRequestId: "training-1",
        sessionDate: "2024-01-15",
        sessionTime: "10:00",
        courtInfo: "Court 1",
        summary: "New training request",
        createdAt: new Date().toISOString(),
      };

      notificationEmitter.emit(payload);

      expect(listener).toHaveBeenCalledWith(payload);

      unsubscribe();
    });

    it("should stop receiving events after unsubscribe", () => {
      const listener = jest.fn();
      const unsubscribe = notificationEmitter.subscribe(listener);

      unsubscribe();

      const payload: NotificationPayload = {
        id: "test-2",
        type: "ACCEPTED",
        bookingId: "booking-1",
        coachId: "coach-1",
        playerId: "player-1",
        trainingRequestId: "training-1",
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        summary: "Training accepted",
        createdAt: new Date().toISOString(),
      };

      notificationEmitter.emit(payload);

      expect(listener).not.toHaveBeenCalled();
    });

    it("should handle multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const unsubscribe1 = notificationEmitter.subscribe(listener1);
      const unsubscribe2 = notificationEmitter.subscribe(listener2);

      const payload: NotificationPayload = {
        id: "test-3",
        type: "DECLINED",
        bookingId: null,
        coachId: "coach-1",
        playerId: "player-1",
        trainingRequestId: "training-1",
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        summary: "Training declined",
        createdAt: new Date().toISOString(),
      };

      notificationEmitter.emit(payload);

      expect(listener1).toHaveBeenCalledWith(payload);
      expect(listener2).toHaveBeenCalledWith(payload);

      unsubscribe1();
      unsubscribe2();
    });

    it("should handle errors in listeners gracefully", () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error("Listener error");
      });
      const normalListener = jest.fn();

      const unsubscribe1 = notificationEmitter.subscribe(errorListener);
      const unsubscribe2 = notificationEmitter.subscribe(normalListener);

      const payload: NotificationPayload = {
        id: "test-4",
        type: "CANCELED",
        bookingId: null,
        coachId: "coach-1",
        playerId: "player-1",
        trainingRequestId: null,
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        summary: "Training cancelled",
        createdAt: new Date().toISOString(),
      };

      // Should not throw
      expect(() => notificationEmitter.emit(payload)).not.toThrow();
      
      // Normal listener should still be called
      expect(normalListener).toHaveBeenCalledWith(payload);

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe("notifyAdmin", () => {
    it("should create notification and emit event", async () => {
      const mockNotification = {
        id: "notif-123",
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: "training-123",
        bookingId: null,
        sessionDate: new Date("2024-01-15"),
        sessionTime: "10:00",
        courtInfo: "Court 1",
        read: false,
        createdAt: new Date("2024-01-10T10:00:00Z"),
      };

      (prisma.adminNotification.create as jest.Mock).mockResolvedValue(mockNotification);

      const listener = jest.fn();
      const unsubscribe = notificationEmitter.subscribe(listener);

      await notifyAdmin({
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: "training-123",
        sessionDate: new Date("2024-01-15"),
        sessionTime: "10:00",
        courtInfo: "Court 1",
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: {
          type: "REQUESTED",
          playerId: "player-123",
          coachId: "coach-123",
          trainingRequestId: "training-123",
          bookingId: null,
          sessionDate: new Date("2024-01-15"),
          sessionTime: "10:00",
          courtInfo: "Court 1",
          read: false,
        },
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        id: "notif-123",
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
      }));

      unsubscribe();
    });

    it("should generate correct summary for REQUESTED type", async () => {
      const mockNotification = {
        id: "notif-124",
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: null,
        bookingId: null,
        sessionDate: new Date("2024-01-15"),
        sessionTime: "14:00",
        courtInfo: null,
        read: false,
        createdAt: new Date(),
      };

      (prisma.adminNotification.create as jest.Mock).mockResolvedValue(mockNotification);

      const listener = jest.fn();
      const unsubscribe = notificationEmitter.subscribe(listener);

      await notifyAdmin({
        type: "REQUESTED",
        playerId: "player-123",
        coachId: "coach-123",
        sessionDate: new Date("2024-01-15"),
        sessionTime: "14:00",
      });

      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        summary: expect.stringContaining("New training request"),
      }));

      unsubscribe();
    });

    it("should handle database errors gracefully", async () => {
      (prisma.adminNotification.create as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const listener = jest.fn();
      const unsubscribe = notificationEmitter.subscribe(listener);

      // Should not throw
      await expect(
        notifyAdmin({
          type: "REQUESTED",
          playerId: "player-123",
          coachId: "coach-123",
        })
      ).resolves.toBeUndefined();

      // Listener should not be called since DB failed
      expect(listener).not.toHaveBeenCalled();

      unsubscribe();
    });

    it("should handle optional fields correctly", async () => {
      const mockNotification = {
        id: "notif-125",
        type: "DECLINED",
        playerId: "player-123",
        coachId: "coach-123",
        trainingRequestId: null,
        bookingId: null,
        sessionDate: null,
        sessionTime: null,
        courtInfo: null,
        read: false,
        createdAt: new Date(),
      };

      (prisma.adminNotification.create as jest.Mock).mockResolvedValue(mockNotification);

      await notifyAdmin({
        type: "DECLINED",
        playerId: "player-123",
        coachId: "coach-123",
        // No optional fields
      });

      expect(prisma.adminNotification.create).toHaveBeenCalledWith({
        data: {
          type: "DECLINED",
          playerId: "player-123",
          coachId: "coach-123",
          trainingRequestId: null,
          bookingId: null,
          sessionDate: null,
          sessionTime: null,
          courtInfo: null,
          read: false,
        },
      });
    });
  });
});
