import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin, requireOrganizationAdmin } from "@/lib/requireRole";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";
import { SportType } from "@prisma/client";

/**
 * Generate a URL-friendly slug from a name
 * Falls back to a random string if the name contains only special characters
 */
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  // If slug is empty, generate a fallback using timestamp
  if (!slug) {
    return `org-${Date.now()}`;
  }
  
  return slug;
}

/**
 * GET /api/admin/organizations/[id]
 * Returns organization detail payload with metrics only.
 * Clubs are fetched separately via /api/admin/organizations/:id/clubs
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await requireOrganizationAdmin(id);
    if (!authResult.authorized) {
      return authResult.response;
    }


    // Fetch organization with related data
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
    const [clubCount, courtCount, activeBookingsCount] =
      await Promise.all([
        // Total clubs
        prisma.club.count({
          where: { organizationId: id },
        }),
        // Total courts across all clubs
        prisma.court.count({
          where: {
            club: {
              organizationId: id,
            },
          },
        }),
        // Active bookings (pending or confirmed, future start date)
        prisma.booking.count({
          where: {
            court: {
              club: {
                organizationId: id,
              },
            },
            status: { in: ["pending", "paid", "reserved", "confirmed"] },
            start: { gte: new Date() },
          },
        }),
      ]);

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      description: organization.description,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone,
      website: organization.website,
      address: organization.address,
      logoData: organization.logoData ? JSON.parse(organization.logoData) : null,
      bannerData: organization.bannerData ? JSON.parse(organization.bannerData) : null,
      metadata: organization.metadata ? JSON.parse(organization.metadata) : null,
      isPublic: organization.isPublic,
      archivedAt: organization.archivedAt,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
      createdBy: organization.createdBy,
      metrics: {
        totalClubs: clubCount,
        totalCourts: courtCount,
        activeBookings: activeBookingsCount,
      },
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
 * PATCH /api/admin/organizations/[id]
 * Updates an organization's metadata (name, contact info, slug, metadata, etc.)
 * Allowed: isRoot OR ORGANIZATION_ADMIN of this org
 * Note: Only root admins can update isPublic field
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authResult = await requireOrganizationAdmin(id);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { name, slug, description, contactEmail, contactPhone, website, address, logoData, bannerData, metadata, isPublic, supportedSports } = body;

    // Only root admins can change isPublic status
    if (isPublic !== undefined && !authResult.isRoot) {
      return NextResponse.json(
        { error: "Only root admins can publish/unpublish organizations" },
        { status: 403 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
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

      if (existingOrg && existingOrg.id !== id) {
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
      description?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      website?: string | null;
      address?: string | null;
      logoData?: string | null;
      bannerData?: string | null;
      metadata?: string | null;
      isPublic?: boolean;
      supportedSports?: SportType[];
    } = {};

    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined || name !== undefined) updateData.slug = finalSlug;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail?.trim() || null;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone?.trim() || null;
    if (website !== undefined) updateData.website = website?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (logoData !== undefined) {
      updateData.logoData = logoData ? JSON.stringify(logoData) : null;
    }
    if (bannerData !== undefined) {
      updateData.bannerData = bannerData ? JSON.stringify(bannerData) : null;
    }
    if (metadata !== undefined) {
      updateData.metadata = metadata ? JSON.stringify(metadata) : null;
    }
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (supportedSports !== undefined) updateData.supportedSports = supportedSports;

    // Update the organization
    const updatedOrganization = await prisma.organization.update({
      where: { id },
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
      id,
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
      description: updatedOrganization.description,
      contactEmail: updatedOrganization.contactEmail,
      contactPhone: updatedOrganization.contactPhone,
      website: updatedOrganization.website,
      address: updatedOrganization.address,
      logoData: updatedOrganization.logoData
        ? JSON.parse(updatedOrganization.logoData)
        : null,
      bannerData: updatedOrganization.bannerData
        ? JSON.parse(updatedOrganization.bannerData)
        : null,
      metadata: updatedOrganization.metadata
        ? JSON.parse(updatedOrganization.metadata)
        : null,
      isPublic: updatedOrganization.isPublic,
      archivedAt: updatedOrganization.archivedAt,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
      createdBy: updatedOrganization.createdBy,
      clubCount: updatedOrganization._count.clubs,
      supportedSports: updatedOrganization.supportedSports,
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
 * DELETE /api/admin/organizations/[id]
 * Deletes an organization (root admin only)
 * Will fail if the organization has active clubs without confirmation.
 * Requires confirmOrgSlug in body to match the organization slug for confirmation.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    
    // Parse body for confirmation token
    let confirmOrgSlug: string | undefined;
    try {
      const body = await request.json();
      confirmOrgSlug = body.confirmOrgSlug;
    } catch {
      // Body is optional if there are no clubs
    }


    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
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

    // Check for active clubs - require confirmation if any exist
    if (organization._count.clubs > 0) {
      // If no confirmation provided or it doesn't match, return 409
      if (!confirmOrgSlug || confirmOrgSlug !== organization.slug) {
        return NextResponse.json(
          { 
            error: "Cannot delete organization with active clubs",
            clubCount: organization._count.clubs,
            requiresConfirmation: true,
            hint: "Provide confirmOrgSlug matching the organization slug to confirm deletion",
          },
          { status: 409 }
        );
      }
    }

    // Check for active bookings in the org's clubs
    const activeBookingsCount = await prisma.booking.count({
      where: {
        court: {
          club: {
            organizationId: id,
          },
        },
        status: { in: ["pending", "paid", "reserved", "confirmed"] },
        start: { gte: new Date() },
      },
    });

    if (activeBookingsCount > 0) {
      if (!confirmOrgSlug || confirmOrgSlug !== organization.slug) {
        return NextResponse.json(
          { 
            error: "Cannot delete organization with active bookings",
            activeBookingsCount,
            requiresConfirmation: true,
            hint: "Provide confirmOrgSlug matching the organization slug to confirm deletion",
          },
          { status: 409 }
        );
      }
    }

    // Delete the organization and related memberships (cascading via schema)
    await prisma.organization.delete({
      where: { id },
    });

    // Create audit log
    await auditLog(
      authResult.userId,
      AuditAction.ORG_DELETE,
      TargetType.ORGANIZATION,
      id,
      {
        organizationName: organization.name,
        organizationSlug: organization.slug,
        clubCount: organization._count.clubs,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting organization:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
