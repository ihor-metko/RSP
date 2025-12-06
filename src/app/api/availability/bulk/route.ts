import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/requireRole";
import { ClubMembershipRole } from "@/constants/roles";
import type { BulkAvailabilityUpdate } from "@/types/court";

/**
 * POST /api/availability/bulk
 * 
 * Bulk create/update/delete availability blocks for courts.
 * 
 * Authorization:
 * - Root Admin: Can edit any club
 * - Organization Admin: Can edit clubs in their organization
 * - Club Admin: Can edit their specific clubs only
 * 
 * Conflict handling:
 * - Returns 409 if any block conflicts with existing bookings
 */
export async function POST(request: Request) {
  // Check authentication
  const authResult = await requireAuth(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId, isRoot } = authResult;

  try {
    const body: BulkAvailabilityUpdate = await request.json();
    const { clubId, changes } = body;

    if (!clubId) {
      return NextResponse.json(
        { error: "clubId is required" },
        { status: 400 }
      );
    }

    // Verify club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          select: { id: true },
        },
        organization: {
          select: { id: true },
        },
      },
    });

    if (!club) {
      return NextResponse.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    // Authorization check
    let hasAccess = isRoot;

    if (!hasAccess && club.organizationId) {
      // Check if user is organization admin
      const orgMembership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: club.organizationId,
          },
        },
      });
      hasAccess = orgMembership?.role === "ORGANIZATION_ADMIN";
    }

    if (!hasAccess) {
      // Check if user is club admin
      const clubMembership = await prisma.clubMembership.findUnique({
        where: {
          userId_clubId: {
            userId,
            clubId,
          },
        },
      });
      hasAccess = clubMembership?.role === ClubMembershipRole.CLUB_ADMIN;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to edit this club's availability" },
        { status: 403 }
      );
    }

    const courtIds = club.courts.map((c) => c.id);

    // Validate all court IDs belong to this club
    const allCourtIds = [
      ...changes.created.map((c) => c.courtId),
      ...changes.updated.map((c) => c.courtId).filter((id): id is string => Boolean(id)),
    ];

    const invalidCourts = allCourtIds.filter((id) => !courtIds.includes(id));
    if (invalidCourts.length > 0) {
      return NextResponse.json(
        { error: "Some courts do not belong to this club" },
        { status: 400 }
      );
    }

    // Check for conflicts with existing bookings
    const conflicts: Array<{
      courtId: string;
      date: string;
      startTime: string;
      endTime: string;
      bookingIds: string[];
    }> = [];

    // Check created blocks
    for (const block of changes.created) {
      const blockConflicts = await checkBlockConflicts(
        block.courtId,
        block.date,
        block.startTime,
        block.endTime
      );
      if (blockConflicts.length > 0) {
        conflicts.push({
          courtId: block.courtId,
          date: block.date,
          startTime: block.startTime,
          endTime: block.endTime,
          bookingIds: blockConflicts,
        });
      }
    }

    // Check updated blocks
    for (const block of changes.updated) {
      if (block.date && block.startTime && block.endTime && block.courtId) {
        const blockConflicts = await checkBlockConflicts(
          block.courtId,
          block.date,
          block.startTime,
          block.endTime
        );
        if (blockConflicts.length > 0) {
          conflicts.push({
            courtId: block.courtId,
            date: block.date,
            startTime: block.startTime,
            endTime: block.endTime,
            bookingIds: blockConflicts,
          });
        }
      }
    }

    // If there are conflicts, return 409
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "Conflicts with existing bookings",
          conflicts,
        },
        { status: 409 }
      );
    }

    // Execute changes in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const created = [];
      const updated = [];
      const deleted = [];

      // Create new blocks
      for (const block of changes.created) {
        const newBlock = await tx.courtAvailabilityBlock.create({
          data: {
            courtId: block.courtId,
            date: new Date(block.date),
            startTime: block.startTime,
            endTime: block.endTime,
            reason: block.reason || null,
            createdBy: userId,
          },
        });
        created.push(newBlock);
      }

      // Update existing blocks
      for (const block of changes.updated) {
        const { id, ...updateData } = block;
        const updatedBlock = await tx.courtAvailabilityBlock.update({
          where: { id },
          data: {
            ...(updateData.courtId && { courtId: updateData.courtId }),
            ...(updateData.date && { date: new Date(updateData.date) }),
            ...(updateData.startTime && { startTime: updateData.startTime }),
            ...(updateData.endTime && { endTime: updateData.endTime }),
            ...(updateData.reason !== undefined && { reason: updateData.reason || null }),
          },
        });
        updated.push(updatedBlock);
      }

      // Delete blocks
      if (changes.deleted.length > 0) {
        const deleteResult = await tx.courtAvailabilityBlock.deleteMany({
          where: {
            id: { in: changes.deleted },
            courtId: { in: courtIds }, // Ensure blocks belong to this club
          },
        });
        deleted.push({ count: deleteResult.count });
      }

      return { created, updated, deleted };
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error in bulk availability update:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check if a time block conflicts with existing bookings
 * 
 * TODO: Implement excludeBlockId parameter to allow updating existing blocks
 * without triggering a conflict with their own booking overlap. This would
 * enable admins to modify block times without removing the block first.
 */
async function checkBlockConflicts(
  courtId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<string[]> {
  // Parse date and times
  const blockDate = new Date(date);
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  const blockStart = new Date(blockDate);
  blockStart.setUTCHours(startHour, startMin, 0, 0);

  const blockEnd = new Date(blockDate);
  blockEnd.setUTCHours(endHour, endMin, 0, 0);

  // Find overlapping bookings
  const overlappingBookings = await prisma.booking.findMany({
    where: {
      courtId,
      status: { in: ["reserved", "paid"] },
      start: { lt: blockEnd },
      end: { gt: blockStart },
    },
    select: { id: true },
  });

  return overlappingBookings.map((b) => b.id);
}
