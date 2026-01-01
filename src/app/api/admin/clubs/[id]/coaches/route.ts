import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

/**
 * PATCH /api/admin/clubs/[id]/coaches
 * Update club coach assignments
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  // Only root admins, organization admins, and club owners can edit clubs
  // Club admins have read-only access to club data
  if (authResult.adminType === "club_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check access permission for organization admins and club owners
    if (authResult.adminType === "organization_admin" || authResult.adminType === "club_owner") {
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
    const { coachIds } = body;

    if (!coachIds || !Array.isArray(coachIds)) {
      return NextResponse.json(
        { error: "coachIds array is required" },
        { status: 400 }
      );
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // First, unlink all existing coaches from this club
      await tx.coach.updateMany({
        where: { clubId },
        data: { clubId: null },
      });

      // Link selected coaches to this club
      if (coachIds.length > 0) {
        await tx.coach.updateMany({
          where: { id: { in: coachIds } },
          data: { clubId },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating club coaches:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
