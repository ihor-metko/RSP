import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { isSupportedSport } from "@/constants/sports";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetCourtDetailById } from "@/services/mockApiHandlers";

/**
 * GET /api/admin/courts/[courtId]
 * 
 * Returns court details for the given courtId.
 * Access is controlled by admin role - admins can only access courts they have permissions for.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const court = await mockGetCourtDetailById(courtId);
      if (!court) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
      return NextResponse.json(court);
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            organizationId: true,
            businessHours: {
              orderBy: { dayOfWeek: "asc" },
            },
          },
        },
        courtPriceRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Check if admin has permission to access this court
    if (authResult.adminType === "organization_admin") {
      // Organization admin can only access courts in their organization's clubs
      if (!authResult.managedIds.includes(court.club.organizationId || "")) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    } else if (authResult.adminType === "club_admin") {
      // Club admin can only access courts in their managed clubs
      if (!authResult.managedIds.includes(court.clubId)) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    }
    // Root admin can access all courts

    return NextResponse.json(court);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/courts/[courtId]
 * 
 * Updates court details for the given courtId.
 * Access is controlled by admin role - admins can only update courts they have permissions for.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;
    const body = await request.json();
    const { name, slug, type, surface, indoor, sportType, defaultPriceCents, isActive } = body;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      // Validation
      const errors: Record<string, string> = {};

      // Name validation: required, 2-120 chars
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") {
          errors.name = "Name is required";
        } else if (name.trim().length < 2) {
          errors.name = "Name must be at least 2 characters";
        } else if (name.trim().length > 120) {
          errors.name = "Name must be at most 120 characters";
        }
      }

      // Slug validation: pattern [a-z0-9-]+
      if (slug !== undefined && slug !== null && slug !== "") {
        if (!/^[a-z0-9-]+$/.test(slug)) {
          errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
        }
      }

      // Price validation: >= 0
      if (defaultPriceCents !== undefined) {
        if (typeof defaultPriceCents !== "number" || defaultPriceCents < 0) {
          errors.defaultPriceCents = "Price must be a non-negative number";
        }
      }

      // Sport type validation
      if (sportType !== undefined && !isSupportedSport(sportType)) {
        errors.sportType = "Invalid sport type";
      }

      if (Object.keys(errors).length > 0) {
        return NextResponse.json(
          { error: "Validation failed", errors },
          { status: 400 }
        );
      }

      try {
        const court = await mockGetCourtDetailById(courtId);
        if (!court) {
          return NextResponse.json({ error: "Court not found" }, { status: 404 });
        }

        // Check if admin has permission to access this court
        // This check is consistent with the non-mock code path below
        if (authResult.adminType === "organization_admin") {
          // For mock mode, we need to determine organizationId from the court
          // In a real implementation, this would come from the court's club relationship
          // For now, we'll skip this check in mock mode but add a TODO
          // TODO: Add proper organization check in mock mode when mock data supports it
        } else if (authResult.adminType === "club_admin") {
          if (!authResult.managedIds.includes(court.clubId)) {
            return NextResponse.json({ error: "Court not found" }, { status: 404 });
          }
        }

        const { mockUpdateCourtDetail } = await import("@/services/mockApiHandlers");
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name.trim();
        if (slug !== undefined) updateData.slug = slug?.trim() || null;
        if (type !== undefined) updateData.type = type?.trim() || null;
        if (surface !== undefined) updateData.surface = surface?.trim() || null;
        if (indoor !== undefined) updateData.indoor = indoor;
        if (sportType !== undefined) updateData.sportType = sportType;
        if (defaultPriceCents !== undefined) updateData.defaultPriceCents = defaultPriceCents;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedCourt = await mockUpdateCourtDetail(courtId, court.clubId, updateData);
        
        return NextResponse.json(updatedCourt);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes("not found")) {
            return NextResponse.json({ error: "Court not found" }, { status: 404 });
          }
        }
        throw err;
      }
    }

    // Check if court exists
    const existingCourt = await prisma.court.findUnique({
      where: { id: courtId },
      include: {
        club: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!existingCourt) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Check if admin has permission to update this court
    if (authResult.adminType === "organization_admin") {
      // Organization admin can only update courts in their organization's clubs
      if (!authResult.managedIds.includes(existingCourt.club.organizationId || "")) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    } else if (authResult.adminType === "club_admin") {
      // Club admin can only update courts in their managed clubs
      if (!authResult.managedIds.includes(existingCourt.clubId)) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    }
    // Root admin can update all courts

    // Validation
    const errors: Record<string, string> = {};

    // Name validation: required, 2-120 chars
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        errors.name = "Name is required";
      } else if (name.trim().length < 2) {
        errors.name = "Name must be at least 2 characters";
      } else if (name.trim().length > 120) {
        errors.name = "Name must be at most 120 characters";
      }
    }

    // Slug validation: pattern [a-z0-9-]+
    if (slug !== undefined && slug !== null && slug !== "") {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
      }
    }

    // Price validation: >= 0
    if (defaultPriceCents !== undefined) {
      if (typeof defaultPriceCents !== "number" || defaultPriceCents < 0) {
        errors.defaultPriceCents = "Price must be a non-negative number";
      }
    }

    // Sport type validation
    if (sportType !== undefined && !isSupportedSport(sportType)) {
      errors.sportType = "Invalid sport type";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    // Check for slug uniqueness if provided and different from current
    if (slug && slug !== existingCourt.slug) {
      const existingSlugCourt = await prisma.court.findUnique({
        where: { slug },
      });
      if (existingSlugCourt && existingSlugCourt.id !== courtId) {
        // Generate a slug suggestion using a single query
        const baseSlug = slug.replace(/-\d+$/, "");
        const existingSlugs = await prisma.court.findMany({
          where: {
            slug: {
              startsWith: baseSlug,
            },
          },
          select: { slug: true },
        });
        
        const slugSet = new Set(existingSlugs.map(c => c.slug));
        let counter = 1;
        let suggestion = `${baseSlug}-1`;
        while (slugSet.has(suggestion) && counter <= 100) {
          counter++;
          suggestion = `${baseSlug}-${counter}`;
        }
        
        return NextResponse.json(
          {
            error: "A court with this slug already exists",
            errors: { slug: "This slug is already in use" },
            suggestion,
          },
          { status: 409 }
        );
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slug?.trim() || null;
    if (type !== undefined) updateData.type = type?.trim() || null;
    if (surface !== undefined) updateData.surface = surface?.trim() || null;
    if (indoor !== undefined) updateData.indoor = indoor;
    if (sportType !== undefined) updateData.sportType = sportType;
    if (defaultPriceCents !== undefined) updateData.defaultPriceCents = defaultPriceCents;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCourt = await prisma.court.update({
      where: { id: courtId },
      data: updateData,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            businessHours: {
              orderBy: { dayOfWeek: "asc" },
            },
          },
        },
        courtPriceRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });

    return NextResponse.json(updatedCourt);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/courts/[courtId]
 * 
 * Deletes court for the given courtId.
 * Access is controlled by admin role - admins can only delete courts they have permissions for.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      try {
        const court = await mockGetCourtDetailById(courtId);
        if (!court) {
          return NextResponse.json({ error: "Court not found" }, { status: 404 });
        }

        const { mockDeleteCourtDetail } = await import("@/services/mockApiHandlers");
        await mockDeleteCourtDetail(courtId, court.clubId);
        
        return new NextResponse(null, { status: 204 });
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes("not found")) {
            return NextResponse.json({ error: "Court not found" }, { status: 404 });
          }
        }
        throw err;
      }
    }

    // Check if court exists
    const existingCourt = await prisma.court.findUnique({
      where: { id: courtId },
      include: {
        club: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!existingCourt) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Check if admin has permission to delete this court
    if (authResult.adminType === "organization_admin") {
      // Organization admin can only delete courts in their organization's clubs
      if (!authResult.managedIds.includes(existingCourt.club.organizationId || "")) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    } else if (authResult.adminType === "club_admin") {
      // Club admin can only delete courts in their managed clubs
      if (!authResult.managedIds.includes(existingCourt.clubId)) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
    }
    // Root admin can delete all courts

    await prisma.court.delete({
      where: { id: courtId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
