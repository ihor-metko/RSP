import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canBlockUser } from "@/lib/userPermissions";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockBlockUser } from "@/services/mockApiHandlers";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * POST /api/admin/users/[userId]/block
 * Block a user with role-scoped authorization.
 *
 * Authorization:
 * - RootAdmin: Can block globally
 * - OrganizationAdmin: Can block for their org scope only
 * - ClubAdmin: Cannot block (returns 403)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await params;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const result = await mockBlockUser(userId);
      if (!result) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: "User blocked successfully",
      });
    }

    // Check permission to block this user
    const blockPermission = await canBlockUser(userId);

    if (!blockPermission.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user exists and is not a root admin
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isRoot: true, blocked: true, email: true, name: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent blocking root admins
    if (existingUser.isRoot) {
      return NextResponse.json(
        { error: "Cannot block root admin" },
        { status: 403 }
      );
    }

    // Already blocked
    if (existingUser.blocked) {
      return NextResponse.json({ 
        message: "User is already blocked",
        blocked: true,
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { blocked: true },
      select: {
        id: true,
        name: true,
        email: true,
        blocked: true,
      },
    });

    // Create audit log entry
    await auditLog(
      blockPermission.callerId!,
      AuditAction.USER_BLOCK,
      TargetType.USER,
      userId,
      {
        scope: blockPermission.scope,
        organizationId: blockPermission.organizationId,
        targetEmail: existingUser.email,
        targetName: existingUser.name,
      }
    );

    return NextResponse.json({
      success: true,
      message: "User blocked successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error blocking user:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
