import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

interface SpecialHour {
  id?: string;
  date: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  reason?: string | null;
}

function validateSpecialHours(hours: SpecialHour[]): { valid: boolean; error?: string } {
  // Check for duplicates
  const dates = hours.map((h) => h.date);
  const uniqueDates = new Set(dates);
  if (dates.length !== uniqueDates.size) {
    return { valid: false, error: "Duplicate dates in special hours" };
  }

  // Check open/close times
  for (const hour of hours) {
    if (!hour.isClosed && hour.openTime && hour.closeTime) {
      if (hour.openTime >= hour.closeTime) {
        return {
          valid: false,
          error: `Invalid special hours for ${hour.date}: opening time must be before closing time`,
        };
      }
    }
  }
  return { valid: true };
}

/**
 * PATCH /api/admin/clubs/[id]/special-hours
 * Update club special hours
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
    const { specialHours } = body;

    if (!specialHours || !Array.isArray(specialHours)) {
      return NextResponse.json(
        { error: "specialHours array is required" },
        { status: 400 }
      );
    }

    // Validate special hours
    const validation = validateSpecialHours(specialHours);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Update in transaction
    const updatedSpecialHours = await prisma.$transaction(async (tx) => {
      await tx.clubSpecialHours.deleteMany({ where: { clubId } });

      if (specialHours.length > 0) {
        await tx.clubSpecialHours.createMany({
          data: specialHours.map((hour) => ({
            clubId,
            date: new Date(hour.date),
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            reason: hour.reason || null,
          })),
        });
      }

      return tx.clubSpecialHours.findMany({
        where: { clubId },
        orderBy: { date: 'asc' },
      });
    });

    return NextResponse.json({ specialHours: updatedSpecialHours });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating special hours:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
