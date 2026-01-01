import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin, requireRootAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check access permission
    const hasAccess = await canAccessClub(
      authResult.adminType,
      authResult.managedIds,
      clubId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        courts: {
          orderBy: { name: "asc" },
        },
        coaches: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        gallery: {
          orderBy: { sortOrder: "asc" },
        },
        businessHours: {
          orderBy: { dayOfWeek: "asc" },
        },
        specialHours: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Parse JSON fields
    const formattedClub = {
      ...club,
      logoData: club.logoData ? JSON.parse(club.logoData) : null,
      bannerData: club.bannerData ? JSON.parse(club.bannerData) : null,
    };

    return NextResponse.json(formattedClub);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/clubs/[id]
 * Update general club information (name, slug, description, isPublic, supportedSports)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check access permission for organization admins, club owners, and club admins
    if (authResult.adminType !== "root_admin") {
      const hasAccess = await canAccessClub(
        authResult.adminType,
        authResult.managedIds,
        clubId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug, shortDescription, isPublic, supportedSports } = body;

    // Validate required fields
    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        { error: "Club name is required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness if provided and changed
    if (slug && slug !== existingClub.slug) {
      const slugExists = await prisma.club.findFirst({
        where: {
          slug,
          id: { not: clubId },
        },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "A club with this slug already exists" },
          { status: 409 }
        );
      }
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slug.trim() || existingClub.slug;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (supportedSports !== undefined) updateData.supportedSports = supportedSports;

    await prisma.club.update({
      where: { id: clubId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * @deprecated Use PATCH instead for partial updates
 * PUT /api/admin/clubs/[id]
 * Update club (legacy - kept for backward compatibility)
 * 
 * This endpoint will be removed in a future version.
 * Please migrate to using PATCH /api/admin/clubs/[id] for general info updates
 * or the specific domain endpoints for other updates.
 * 
 * Migration Guide: See /docs/api/club-domain-endpoints.md
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check access permission for organization admins, club owners, and club admins
    if (authResult.adminType !== "root_admin") {
      const hasAccess = await canAccessClub(
        authResult.adminType,
        authResult.managedIds,
        clubId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, location, contactInfo, openingHours, logoData, bannerData } = body;

    if (!name || !location) {
      return NextResponse.json(
        { error: "Name and location are required" },
        { status: 400 }
      );
    }

    await prisma.club.update({
      where: { id: clubId },
      data: {
        name,
        location,
        contactInfo: contactInfo || null,
        openingHours: openingHours || null,
        logoData: logoData ? JSON.stringify(logoData) : null,
        bannerData: bannerData ? JSON.stringify(bannerData) : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRootAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    const existingClub = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!existingClub) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    await prisma.club.delete({
      where: { id: clubId },
    });

    return NextResponse.json({ message: "Club deleted successfully" });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
