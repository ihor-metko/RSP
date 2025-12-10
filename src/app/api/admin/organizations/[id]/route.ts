import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRootAdmin } from "@/lib/requireRole";
import { auditLog, AuditAction, TargetType } from "@/lib/auditLog";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";

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
 * PATCH /api/admin/organizations/[id]
 * Updates an organization's name and/or slug (root admin only)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, supportedSports } = body;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const { mockUpdateOrganizationHandler } = await import("@/services/mockApiHandlers");
      try {
        const result = await mockUpdateOrganizationHandler({
          orgId: id,
          name,
          slug,
          supportedSports,
          userId: authResult.userId,
        });
        return NextResponse.json(result);
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        return NextResponse.json(
          { error: err.message || "Internal server error" },
          { status: err.status || 500 }
        );
      }
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
    // - If slug is undefined, keep the current slug (unless name changes)
    // - If slug is an empty string, auto-generate from the name
    // - Otherwise, use the provided slug
    let finalSlug = organization.slug;
    if (slug !== undefined) {
      // Empty string means auto-generate, otherwise use provided value
      finalSlug = slug.trim() || generateSlug(name?.trim() || organization.name);
    } else if (name !== undefined && name.trim() !== organization.name) {
      // Auto-generate slug from new name if slug wasn't explicitly provided
      finalSlug = generateSlug(name);
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

    // Update the organization
    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        slug: finalSlug,
        ...(supportedSports !== undefined && { supportedSports }),
      },
      include: {
        _count: {
          select: { clubs: true },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        memberships: {
          where: {
            role: "ORGANIZATION_ADMIN",
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
          orderBy: [
            { isPrimaryOwner: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    const superAdmins = updatedOrganization.memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      isPrimaryOwner: m.isPrimaryOwner,
    }));

    return NextResponse.json({
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      slug: updatedOrganization.slug,
      createdAt: updatedOrganization.createdAt,
      clubCount: updatedOrganization._count.clubs,
      createdBy: updatedOrganization.createdBy,
      superAdmins,
      superAdmin: superAdmins.find((a) => a.isPrimaryOwner) || superAdmins[0] || null,
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

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const { mockDeleteOrganizationHandler } = await import("@/services/mockApiHandlers");
      try {
        const result = await mockDeleteOrganizationHandler({
          orgId: id,
          userId: authResult.userId,
          confirmOrgSlug,
        });
        return NextResponse.json(result);
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string; clubCount?: number; activeBookingsCount?: number; requiresConfirmation?: boolean; hint?: string };
        return NextResponse.json(
          { 
            error: err.message || "Internal server error",
            ...(err.clubCount !== undefined && { clubCount: err.clubCount }),
            ...(err.activeBookingsCount !== undefined && { activeBookingsCount: err.activeBookingsCount }),
            ...(err.requiresConfirmation !== undefined && { requiresConfirmation: err.requiresConfirmation }),
            ...(err.hint && { hint: err.hint }),
          },
          { status: err.status || 500 }
        );
      }
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
