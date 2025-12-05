import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";

/**
 * POST /api/orgs/[orgId]/archive
 * Soft-archive the organization (set archivedAt).
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

    // Check if already archived
    if (organization.archivedAt) {
      return NextResponse.json(
        { error: "Organization is already archived" },
        { status: 400 }
      );
    }

    // Archive the organization
    const archivedOrganization = await prisma.organization.update({
      where: { id: orgId },
      data: {
        archivedAt: new Date(),
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
      AuditAction.ORG_ARCHIVE,
      TargetType.ORGANIZATION,
      orgId,
      {
        organizationName: organization.name,
        clubCount: organization._count.clubs,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Organization archived successfully",
      organization: {
        id: archivedOrganization.id,
        name: archivedOrganization.name,
        slug: archivedOrganization.slug,
        archivedAt: archivedOrganization.archivedAt,
        createdAt: archivedOrganization.createdAt,
        clubCount: archivedOrganization._count.clubs,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error archiving organization:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
