import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

/**
 * PATCH /api/admin/clubs/[id]/location
 * Update club location details
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
    const { location, city, country, latitude, longitude } = body;

    // Validate required field
    if (location !== undefined && !location?.trim()) {
      return NextResponse.json(
        { error: "Address is required" },
        { status: 400 }
      );
    }

    // Build update data object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (location !== undefined) updateData.location = location.trim();
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (country !== undefined) updateData.country = country?.trim() || null;
    if (latitude !== undefined) updateData.latitude = latitude || null;
    if (longitude !== undefined) updateData.longitude = longitude || null;

    await prisma.club.update({
      where: { id: clubId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club location:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
