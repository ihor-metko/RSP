import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";

/**
 * POST /api/admin/notifications/mark-all-read
 * Mark all unread notifications as read
 * Only accessible by root admins
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireRootAdmin(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const result = await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });

    return NextResponse.json({
      count: result.count,
      message: `${result.count} notification(s) marked as read`,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error marking all notifications as read:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
