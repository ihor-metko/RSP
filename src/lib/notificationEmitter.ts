import { prisma } from "@/lib/prisma";

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

export interface CreateNotificationParams {
  type: NotificationType;
  playerId: string;
  coachId: string;
  trainingRequestId?: string;
  bookingId?: string;
  sessionDate?: Date;
  sessionTime?: string;
  courtInfo?: string;
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

/**
 * Generate a summary message for the notification
 */
function generateSummary(type: NotificationType, sessionDate?: Date, sessionTime?: string): string {
  const dateStr = sessionDate
    ? sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const timeStr = sessionTime || "";
  const dateTimeInfo = dateStr && timeStr ? ` for ${dateStr} at ${timeStr}` : "";

  switch (type) {
    case "REQUESTED":
      return `New training request${dateTimeInfo}`;
    case "ACCEPTED":
      return `Training accepted${dateTimeInfo}`;
    case "DECLINED":
      return `Training declined${dateTimeInfo}`;
    case "CANCELED":
      return `Training cancelled${dateTimeInfo}`;
    default:
      return "Notification";
  }
}

/**
 * Create an admin notification and emit it to SSE listeners
 */
export async function notifyAdmin(params: CreateNotificationParams): Promise<void> {
  try {
    // Create notification in database
    const notification = await prisma.adminNotification.create({
      data: {
        type: params.type,
        playerId: params.playerId,
        coachId: params.coachId,
        trainingRequestId: params.trainingRequestId || null,
        bookingId: params.bookingId || null,
        sessionDate: params.sessionDate || null,
        sessionTime: params.sessionTime || null,
        courtInfo: params.courtInfo || null,
        read: false,
      },
    });

    // Construct the payload for real-time delivery
    const payload: NotificationPayload = {
      id: notification.id,
      type: notification.type as NotificationType,
      bookingId: notification.bookingId,
      coachId: notification.coachId,
      playerId: notification.playerId,
      trainingRequestId: notification.trainingRequestId,
      sessionDate: notification.sessionDate?.toISOString().split("T")[0] || null,
      sessionTime: notification.sessionTime,
      courtInfo: notification.courtInfo,
      summary: generateSummary(
        notification.type as NotificationType,
        params.sessionDate,
        params.sessionTime
      ),
      createdAt: notification.createdAt.toISOString(),
    };

    // Emit to SSE listeners
    notificationEmitter.emit(payload);
  } catch (error) {
    // Log error in development but don't throw - notifications are non-critical
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to create admin notification:", error);
    }
  }
}
