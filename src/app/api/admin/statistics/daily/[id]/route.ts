import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * PUT /api/admin/statistics/daily/[id]
 * Update daily statistics by ID
 * Body: { bookedSlots?, totalSlots? }
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
    const { bookedSlots, totalSlots } = body;

    // Fetch the existing statistics to verify ownership
    const existingStats = await prisma.clubDailyStatistics.findUnique({
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
      bookedSlots?: number;
      totalSlots?: number;
      occupancyPercentage?: number;
    }
    const updateData: UpdateData = {};
    
    if (bookedSlots !== undefined) {
      if (bookedSlots < 0) {
        return NextResponse.json(
          { error: "bookedSlots must be non-negative" },
          { status: 400 }
        );
      }
      updateData.bookedSlots = bookedSlots;
    }

    if (totalSlots !== undefined) {
      if (totalSlots <= 0) {
        return NextResponse.json(
          { error: "totalSlots must be greater than zero" },
          { status: 400 }
        );
      }
      updateData.totalSlots = totalSlots;
    }

    // Recalculate occupancy percentage
    const finalBookedSlots = bookedSlots !== undefined ? bookedSlots : existingStats.bookedSlots;
    const finalTotalSlots = totalSlots !== undefined ? totalSlots : existingStats.totalSlots;
    
    // Validate that bookedSlots does not exceed totalSlots
    if (finalBookedSlots > finalTotalSlots) {
      return NextResponse.json(
        { error: "bookedSlots cannot exceed totalSlots" },
        { status: 400 }
      );
    }
    
    updateData.occupancyPercentage = (finalBookedSlots / finalTotalSlots) * 100;

    const updatedStats = await prisma.clubDailyStatistics.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedStats);
  } catch (error) {
    console.error("Error updating daily statistics:", error);
    return NextResponse.json(
      { error: "Failed to update daily statistics" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/statistics/daily/[id]
 * Delete daily statistics by ID
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
    const existingStats = await prisma.clubDailyStatistics.findUnique({
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

    await prisma.clubDailyStatistics.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting daily statistics:", error);
    return NextResponse.json(
      { error: "Failed to delete daily statistics" },
      { status: 500 }
    );
  }
}
