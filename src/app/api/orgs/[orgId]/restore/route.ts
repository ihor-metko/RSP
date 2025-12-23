import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";

/**
 * POST /api/orgs/[orgId]/restore
 * Restore a soft-archived organization (clear archivedAt).
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireOrganizationAdmin(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }


    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if not archived
    if (!organization.archivedAt) {
      return NextResponse.json(
        { error: "Organization is not archived" },
        { status: 400 }
      );
    }

    // Restore the organization
    const restoredOrganization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        archivedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { clubs: true },
        },
      },
    });

    // Create audit log
    await auditLog(
      authResult.userId,
      AuditAction.ORG_RESTORE,
      TargetType.ORGANIZATION,
      orgId,
      {
        organizationName: organization.name,
        clubCount: organization._count.clubs,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Organization restored successfully",
      organization: {
        id: restoredOrganization.id,
        name: restoredOrganization.name,
        slug: restoredOrganization.slug,
        archivedAt: restoredOrganization.archivedAt,
        createdAt: restoredOrganization.createdAt,
        clubCount: restoredOrganization._count.clubs,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error restoring organization:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
