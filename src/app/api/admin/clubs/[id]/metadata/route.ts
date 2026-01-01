import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * Check if an admin has access to a specific club
 */
async function canAccessClub(
  adminType: "root_admin" | "organization_admin" | "club_owner" | "club_admin",
  managedIds: string[],
  clubId: string
): Promise<boolean> {
  if (adminType === "root_admin") {
    return true;
  }

  if (adminType === "club_owner") {
    return managedIds.includes(clubId);
  }

  if (adminType === "club_admin") {
    return managedIds.includes(clubId);
  }

  if (adminType === "organization_admin") {
    // Check if club belongs to one of the managed organizations
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { organizationId: true },
    });
    return club?.organizationId ? managedIds.includes(club.organizationId) : false;
  }

  return false;
}

/**
 * PATCH /api/admin/clubs/[id]/metadata
 * Update club metadata
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Only root admins and organization admins can edit clubs
  if (authResult.adminType === "club_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check access permission for organization admins
    if (authResult.adminType === "organization_admin") {
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
    const { metadata } = body;

    if (metadata === undefined) {
      return NextResponse.json(
        { error: "metadata is required" },
        { status: 400 }
      );
    }

    const updatedClub = await prisma.club.update({
      where: { id: clubId },
      data: {
        metadata: JSON.stringify(metadata),
      },
      include: {
        courts: true,
        coaches: { include: { user: true } },
        gallery: { orderBy: { sortOrder: "asc" } },
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        specialHours: { orderBy: { date: "asc" } },
      },
    });

    return NextResponse.json(updatedClub);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club metadata:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
