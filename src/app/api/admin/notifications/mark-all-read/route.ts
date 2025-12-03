import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";

/**
 * POST /api/admin/notifications/mark-all-read
 * Mark all unread notifications as read
 * Only accessible by admins
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireRole(request, ADMIN_ROLES);
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
