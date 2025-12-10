import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetAdminNotifications } from "@/services/mockApiHandlers";

/**
 * GET /api/admin/notifications
 * Get all admin notifications with optional filtering and pagination
 * Only accessible by root admins
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireRootAdmin(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const mockResult = await mockGetAdminNotifications({
        unreadOnly,
        limit,
        offset,
      });
      return NextResponse.json(mockResult);
    }

    // Build where clause
    const whereClause: { read?: boolean } = {};
    if (unreadOnly) {
      whereClause.read = false;
    }

    // Get notifications
    const notifications = await prisma.adminNotification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
      skip: offset,
    });

    // Batch fetch players and coaches to avoid N+1 queries
    const playerIds = [...new Set(notifications.map((n) => n.playerId))];
    const coachIds = [...new Set(notifications.map((n) => n.coachId))];

    const [players, coaches] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, name: true, email: true },
      }),
      prisma.coach.findMany({
        where: { id: { in: coachIds } },
        include: { user: { select: { name: true } } },
      }),
    ]);

    // Create lookup maps for fast access
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const coachMap = new Map(coaches.map((c) => [c.id, c]));

    // Enrich notifications with player and coach names
    const enrichedNotifications = notifications.map((notification) => {
      const player = playerMap.get(notification.playerId);
      const coach = coachMap.get(notification.coachId);

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
    });

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
