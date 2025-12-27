import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * PUT /api/admin/statistics/monthly/[id]
 * Update monthly statistics by ID
 * Body: { averageOccupancy?, previousMonthOccupancy? }
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
    const { id } = await params;
    const body = await request.json();
    const { averageOccupancy, previousMonthOccupancy } = body;

    // Fetch the existing statistics to verify ownership
    const existingStats = await prisma.clubMonthlyStatistics.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!existingStats) {
      return NextResponse.json(
        { error: "Statistics not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to manage this club's statistics
    if (authResult.adminType === "club_owner" || authResult.adminType === "club_admin") {
      if (!authResult.managedIds.includes(existingStats.clubId)) {
        return NextResponse.json(
          { error: "You do not have permission to manage this club" },
          { status: 403 }
        );
      }
    } else if (authResult.adminType === "organization_admin") {
      if (!existingStats.club.organizationId || !authResult.managedIds.includes(existingStats.club.organizationId)) {
        return NextResponse.json(
          { error: "You do not have permission to manage this club" },
          { status: 403 }
        );
      }
    }

    // Build update data
    interface UpdateData {
      averageOccupancy?: number;
      previousMonthOccupancy?: number | null;
      occupancyChangePercent?: number | null;
    }
    const updateData: UpdateData = {};
    
    if (averageOccupancy !== undefined) {
      if (averageOccupancy < 0 || averageOccupancy > 100) {
        return NextResponse.json(
          { error: "averageOccupancy must be between 0 and 100" },
          { status: 400 }
        );
      }
      updateData.averageOccupancy = averageOccupancy;
    }

    if (previousMonthOccupancy !== undefined) {
      updateData.previousMonthOccupancy = previousMonthOccupancy;
    }

    // Recalculate occupancy change percentage if needed
    const finalAverageOccupancy = averageOccupancy !== undefined ? averageOccupancy : existingStats.averageOccupancy;
    const finalPreviousMonthOccupancy = previousMonthOccupancy !== undefined 
      ? previousMonthOccupancy 
      : existingStats.previousMonthOccupancy;

    if (finalPreviousMonthOccupancy !== null) {
      if (finalPreviousMonthOccupancy > 0) {
        updateData.occupancyChangePercent = ((finalAverageOccupancy - finalPreviousMonthOccupancy) / finalPreviousMonthOccupancy) * 100;
      } else if (finalAverageOccupancy > 0) {
        updateData.occupancyChangePercent = 100;
      } else {
        updateData.occupancyChangePercent = 0;
      }
    } else {
      updateData.occupancyChangePercent = null;
    }

    const updatedStats = await prisma.clubMonthlyStatistics.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedStats);
  } catch (error) {
    console.error("Error updating monthly statistics:", error);
    return NextResponse.json(
      { error: "Failed to update monthly statistics" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/statistics/monthly/[id]
 * Delete monthly statistics by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { id } = await params;

    // Fetch the existing statistics to verify ownership
    const existingStats = await prisma.clubMonthlyStatistics.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (!existingStats) {
      return NextResponse.json(
        { error: "Statistics not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to manage this club's statistics
    if (authResult.adminType === "club_owner" || authResult.adminType === "club_admin") {
      if (!authResult.managedIds.includes(existingStats.clubId)) {
        return NextResponse.json(
          { error: "You do not have permission to manage this club" },
          { status: 403 }
        );
      }
    } else if (authResult.adminType === "organization_admin") {
      if (!existingStats.club.organizationId || !authResult.managedIds.includes(existingStats.club.organizationId)) {
        return NextResponse.json(
          { error: "You do not have permission to manage this club" },
          { status: 403 }
        );
      }
    }

    await prisma.clubMonthlyStatistics.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting monthly statistics:", error);
    return NextResponse.json(
      { error: "Failed to delete monthly statistics" },
      { status: 500 }
    );
  }
}
