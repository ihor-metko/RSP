export type NotificationType = "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED";

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  bookingId: string | null;
  coachId: string;
  playerId: string;
  trainingRequestId: string | null;
  sessionDate: string | null;
  sessionTime: string | null;
  courtInfo: string | null;
  summary: string;
  createdAt: string;
}

// In-memory event emitter for SSE clients
type NotificationListener = (notification: NotificationPayload) => void;

class NotificationEventEmitter {
  private listeners: Set<NotificationListener> = new Set();

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(notification: NotificationPayload): void {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        // Silently ignore listener errors
        if (process.env.NODE_ENV === "development") {
          console.error("Notification listener error:", error);
        }
      }
    });
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Singleton instance for the notification emitter
export const notificationEmitter = new NotificationEventEmitter();
