import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockUpdateAdminNotification } from "@/services/mockApiHandlers";

/**
 * PATCH /api/admin/notifications/[id]
 * Mark a notification as read/unread
 * Only accessible by root admins
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRootAdmin(request);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const resolvedParams = await params;
    const notificationId = resolvedParams.id;

    const body = await request.json();
    if (typeof body.read !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid 'read' field (must be boolean)" },
        { status: 400 }
      );
    }

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      try {
        const updated = await mockUpdateAdminNotification(notificationId, { read: body.read });
        if (!updated) {
          return NextResponse.json(
            { error: "Notification not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({
          id: updated.id,
          read: updated.read,
          message: body.read ? "Notification marked as read" : "Notification marked as unread",
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Notification not found" },
          { status: 404 }
        );
      }
    }

    // Find and update notification
    const notification = await prisma.adminNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    const updatedNotification = await prisma.adminNotification.update({
      where: { id: notificationId },
      data: { read: body.read },
    });

    return NextResponse.json({
      id: updatedNotification.id,
      read: updatedNotification.read,
      message: body.read ? "Notification marked as read" : "Notification marked as unread",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating admin notification:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
