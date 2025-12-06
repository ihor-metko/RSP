import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canBlockUser } from "@/lib/userPermissions";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockUnblockUser } from "@/services/mockApiHandlers";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST /api/admin/users/[userId]/unblock
 * Unblock a user with role-scoped authorization.
 *
 * Authorization:
 * - RootAdmin: Can unblock globally
 * - OrganizationAdmin: Can unblock for their org scope only
 * - ClubAdmin: Cannot unblock (returns 403)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const result = await mockUnblockUser(userId);
      if (!result) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: "User unblocked successfully",
      });
    }

    // Check permission to unblock this user (same as block permission)
    const unblockPermission = await canBlockUser(userId);

    if (!unblockPermission.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isRoot: true, blocked: true, email: true, name: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Already unblocked
    if (!existingUser.blocked) {
      return NextResponse.json({ 
        message: "User is already active",
        blocked: false,
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { blocked: false },
      select: {
        id: true,
        name: true,
        email: true,
        blocked: true,
      },
    });

    // Create audit log entry
    await auditLog(
      unblockPermission.callerId!,
      AuditAction.USER_UNBLOCK,
      TargetType.USER,
      userId,
      {
        scope: unblockPermission.scope,
        organizationId: unblockPermission.organizationId,
        targetEmail: existingUser.email,
        targetName: existingUser.name,
      }
    );

    return NextResponse.json({
      success: true,
      message: "User unblocked successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error unblocking user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
