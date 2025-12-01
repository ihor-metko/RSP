import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/**
 * GET /api/admin/notifications
 * Get all admin notifications with optional filtering and pagination
 * Only accessible by admins
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Build where clause
    const whereClause: { read?: boolean } = {};
    if (unreadOnly) {
      whereClause.read = false;
    }

    // Get notifications with enriched data
    const notifications = await prisma.adminNotification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
    });

    // Enrich notifications with player, coach, and court names
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const [player, coach] = await Promise.all([
          prisma.user.findUnique({
            where: { id: notification.playerId },
            select: { id: true, name: true, email: true },
          }),
          prisma.coach.findUnique({
            where: { id: notification.coachId },
            include: { user: { select: { name: true } } },
          }),
        ]);

        return {
          id: notification.id,
          type: notification.type,
          playerId: notification.playerId,
          playerName: player?.name || "Unknown Player",
          playerEmail: player?.email || null,
          coachId: notification.coachId,
          coachName: coach?.user?.name || "Unknown Coach",
          trainingRequestId: notification.trainingRequestId,
          bookingId: notification.bookingId,
          sessionDate: notification.sessionDate?.toISOString().split("T")[0] || null,
          sessionTime: notification.sessionTime,
          courtInfo: notification.courtInfo,
          read: notification.read,
          createdAt: notification.createdAt.toISOString(),
        };
      })
    );

    // Get total count and unread count
    const [totalCount, unreadCount] = await Promise.all([
      prisma.adminNotification.count({ where: whereClause }),
      prisma.adminNotification.count({ where: { read: false } }),
    ]);

    return NextResponse.json({
      notifications: enrichedNotifications,
      totalCount,
      unreadCount,
      hasMore: offset + notifications.length < totalCount,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching admin notifications:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
