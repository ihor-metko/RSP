import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";
import { canAccessClub } from "@/lib/permissions/clubAccess";

interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

function validateBusinessHours(hours: BusinessHour[]): { valid: boolean; error?: string } {
  for (const hour of hours) {
    if (!hour.isClosed && hour.openTime && hour.closeTime) {
      if (hour.openTime >= hour.closeTime) {
        return {
          valid: false,
          error: `Invalid hours for day ${hour.dayOfWeek}: opening time must be before closing time`,
        };
      }
    }
  }
  return { valid: true };
}

/**
 * PATCH /api/admin/clubs/[id]/business-hours
 * Update club business hours
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
    const { businessHours } = body;

    if (!businessHours || !Array.isArray(businessHours)) {
      return NextResponse.json(
        { error: "businessHours array is required" },
        { status: 400 }
      );
    }

    // Validate business hours
    const validation = validateBusinessHours(businessHours);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.clubBusinessHours.deleteMany({ where: { clubId } });

      if (businessHours.length > 0) {
        await tx.clubBusinessHours.createMany({
          data: businessHours.map((hour) => ({
            clubId,
            dayOfWeek: hour.dayOfWeek,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating business hours:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
