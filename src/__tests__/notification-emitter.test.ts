/**
 * @jest-environment node
 */
import { notificationEmitter, NotificationPayload } from "@/lib/notificationEmitter";

describe("NotificationEmitter", () => {
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
});
