import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAdmin } from "@/lib/requireRole";
import { MembershipRole } from "@/constants/roles";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";

/**
 * GET /api/orgs/[orgId]
 * Returns full org detail payload including metrics, clubs preview, admins, and recent activity.
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireOrganizationAdmin(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Fetch organization with related data
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          where: {
            role: MembershipRole.ORGANIZATION_ADMIN,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: [{ isPrimaryOwner: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Fetch metrics in parallel
    const [clubCount, courtCount, activeBookingsCount, userCount, clubsPreview, recentActivity] =
      await Promise.all([
        // Total clubs
        prisma.club.count({
          where: { organizationId: orgId },
        }),
        // Total courts across all clubs
        prisma.court.count({
          where: {
            club: {
              organizationId: orgId,
            },
          },
        }),
        // Active bookings (pending or confirmed, future start date)
        prisma.booking.count({
          where: {
            court: {
              club: {
                organizationId: orgId,
              },
            },
            status: { in: ["pending", "paid"] },
            start: { gte: new Date() },
          },
        }),
        // Count of unique users with bookings in this org's clubs
        prisma.booking.groupBy({
          by: ["userId"],
          where: {
            court: {
              club: {
                organizationId: orgId,
              },
            },
          },
        }).then((groups) => groups.length),
        // Clubs preview (first 5)
        prisma.club.findMany({
          where: { organizationId: orgId },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                courts: true,
                clubMemberships: true,
              },
            },
          },
        }),
        // Recent activity (audit logs)
        prisma.auditLog.findMany({
          where: {
            targetType: TargetType.ORGANIZATION,
            targetId: orgId,
          },
          take: 10,
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Get club admins for preview
    const clubIds = clubsPreview.map((c) => c.id);
    const clubAdmins =
      clubIds.length > 0
        ? await prisma.clubMembership.findMany({
            where: {
              clubId: { in: clubIds },
              role: "CLUB_ADMIN",
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              club: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: 10,
          })
        : [];

    // Format super admins
    const superAdmins = organization.memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      isPrimaryOwner: m.isPrimaryOwner,
      membershipId: m.id,
    }));

    // Format clubs preview
    const formattedClubsPreview = clubsPreview.map((club) => ({
      id: club.id,
      name: club.name,
      slug: club.slug,
      city: club.city,
      isPublic: club.isPublic,
      courtCount: club._count.courts,
      adminCount: club._count.clubMemberships,
      createdAt: club.createdAt,
    }));

    // Format club admins
    const formattedClubAdmins = clubAdmins.map((ca) => ({
      id: ca.id,
      userId: ca.user.id,
      userName: ca.user.name,
      userEmail: ca.user.email,
      clubId: ca.club.id,
      clubName: ca.club.name,
    }));

    // Format activity
    const formattedActivity = recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      actorId: log.actorId,
      detail: log.detail ? JSON.parse(log.detail) : null,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      website: organization.website,
      address: organization.address,
      metadata: organization.metadata ? JSON.parse(organization.metadata) : null,
      archivedAt: organization.archivedAt,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      createdBy: organization.createdBy,
      superAdmins,
      primaryOwner: superAdmins.find((a) => a.isPrimaryOwner) || superAdmins[0] || null,
      metrics: {
        totalClubs: clubCount,
        totalCourts: courtCount,
        activeBookings: activeBookingsCount,
        activeUsers: userCount,
      },
      clubsPreview: formattedClubsPreview,
      clubAdmins: formattedClubAdmins,
      recentActivity: formattedActivity,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching organization detail:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orgs/[orgId]
 * Update org metadata (name, contact info, slug, metadata).
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    const authResult = await requireOrganizationAdmin(orgId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { name, slug, contactEmail, contactPhone, website, address, metadata } = body;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check if archived
    if (organization.archivedAt) {
      return NextResponse.json(
        { error: "Cannot update archived organization" },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Organization name cannot be empty" },
          { status: 400 }
        );
      }
    }

    // Determine the final slug
    let finalSlug = organization.slug;
    const trimmedName = name?.trim();
    if (slug !== undefined) {
      finalSlug = slug.trim() || generateSlug(trimmedName || organization.name);
    } else if (trimmedName && trimmedName !== organization.name) {
      finalSlug = generateSlug(trimmedName);
    }

    // Check if slug already exists for a different organization
    if (finalSlug !== organization.slug) {
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: finalSlug },
      });

      if (existingOrg && existingOrg.id !== orgId) {
        return NextResponse.json(
          { error: "An organization with this slug already exists" },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      slug?: string;
      contactEmail?: string | null;
      contactPhone?: string | null;
      website?: string | null;
      address?: string | null;
      metadata?: string | null;
    } = {};

    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined || name !== undefined) updateData.slug = finalSlug;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail?.trim() || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (metadata !== undefined) {
      updateData.metadata = metadata ? JSON.stringify(metadata) : null;
    }

    // Update the organization
    const updatedOrganization = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
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
      AuditAction.ORG_UPDATE,
      TargetType.ORGANIZATION,
      orgId,
      {
        changes: updateData,
        previousName: organization.name,
        previousSlug: organization.slug,
      }
    );

    return NextResponse.json({
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      contactEmail: updatedOrganization.contactEmail,
      contactPhone: updatedOrganization.contactPhone,
      website: updatedOrganization.website,
      address: updatedOrganization.address,
      metadata: updatedOrganization.metadata
        ? JSON.parse(updatedOrganization.metadata)
        : null,
      archivedAt: updatedOrganization.archivedAt,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
      createdBy: updatedOrganization.createdBy,
      clubCount: updatedOrganization._count.clubs,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating organization:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return `org-${Date.now()}`;
  }

  return slug;
}
