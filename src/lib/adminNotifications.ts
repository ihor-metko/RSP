import { prisma } from "@/lib/prisma";

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
 * Create an admin notification for tracking training request events
 */
export async function createAdminNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await prisma.adminNotification.create({
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
  } catch (error) {
    // Log error in development but don't throw - notifications are non-critical
    if (process.env.NODE_ENV === "development") {
      console.error("Failed to create admin notification:", error);
    }
  }
}
