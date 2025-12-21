import { prisma } from "@/lib/prisma";
import { notificationEmitter, NotificationPayload } from "@/lib/notificationEmitter";
import type { TypedServer } from "@/types/socket";

export type NotificationType = "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED";

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
 * Create an admin notification for tracking training request events
 * Also emits the notification to:
 * - Real-time SSE listeners (via notificationEmitter)
 * - Socket.IO clients (via global io instance)
 */
export async function createAdminNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
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

    // Create notification payload
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
        notification.sessionDate || undefined,
        notification.sessionTime || undefined
      ),
      createdAt: notification.createdAt.toISOString(),
    };

    // Emit to real-time SSE listeners
    notificationEmitter.emit(payload);

    // Emit to Socket.IO clients
    if (global.io) {
      const io = global.io as TypedServer;
      // Create socket event payload with read status
      const socketPayload: typeof payload & { read: boolean } = {
        ...payload,
        read: notification.read,
      };
      io.emit('admin_notification', socketPayload);
      console.log('[AdminNotifications] Socket.IO event emitted:', payload.id);
    }
  } catch (error) {
    // Log error in development but don't throw - notifications are non-critical
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to create admin notification:", error);
    }
  }
}
