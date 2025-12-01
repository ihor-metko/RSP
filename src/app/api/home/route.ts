import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/home
 * Returns personalized home data for authenticated users:
 * - Upcoming bookings with court and coach info
 * - User notifications (admin notifications relevant to the user)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const now = new Date();

    // Fetch upcoming bookings with court and coach info
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        userId: userId,
        start: { gte: now },
        status: { in: ["reserved", "paid"] },
      },
      orderBy: { start: "asc" },
      take: 5,
      select: {
        id: true,
        start: true,
        end: true,
        status: true,
        price: true,
        court: {
          select: {
            id: true,
            name: true,
            club: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        coach: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Fetch notifications for the user (as player or coach)
    const notifications = await prisma.adminNotification.findMany({
      where: {
        OR: [
          { playerId: userId },
          { coachId: userId },
        ],
        read: false,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        sessionDate: true,
        sessionTime: true,
        courtInfo: true,
        createdAt: true,
      },
    });

    // Format the response
    const formattedBookings = upcomingBookings.map((booking) => ({
      id: booking.id,
      startTime: booking.start.toISOString(),
      endTime: booking.end.toISOString(),
      status: booking.status,
      priceCents: booking.price,
      court: {
        id: booking.court.id,
        name: booking.court.name,
      },
      club: booking.court.club ? {
        id: booking.court.club.id,
        name: booking.court.club.name,
      } : null,
      coach: booking.coach ? {
        id: booking.coach.id,
        name: booking.coach.user?.name || null,
      } : null,
    }));

    const formattedNotifications = notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      sessionDate: notification.sessionDate?.toISOString() || null,
      sessionTime: notification.sessionTime,
      courtInfo: notification.courtInfo,
      createdAt: notification.createdAt.toISOString(),
    }));

    return NextResponse.json({
      upcomingBookings: formattedBookings,
      notifications: formattedNotifications,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching home data:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
