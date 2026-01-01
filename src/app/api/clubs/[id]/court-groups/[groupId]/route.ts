import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/requireRole";

/**
 * GET /api/clubs/[clubId]/court-groups/[groupId]
 * 
 * Returns details of a specific court group
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id: clubId, groupId } = await context.params;

  // Check authorization for this club
  const authResult = await requireClubAdmin(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const group = await prisma.courtGroup.findFirst({
      where: {
        id: groupId,
        clubId,
      },
      include: {
        courts: {
          select: {
            id: true,
            name: true,
            isActive: true,
            useGroupPricing: true,
          },
        },
        groupPriceRules: {
          orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" },
          ],
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Court group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(group);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court group:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/clubs/[clubId]/court-groups/[groupId]
 * 
 * Updates a court group (name, default price, etc.)
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id: clubId, groupId } = await context.params;

  // Check authorization for this club
  const authResult = await requireClubAdmin(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const { name, defaultPriceCents } = body;

    // Verify group exists and belongs to this club
    const existingGroup = await prisma.courtGroup.findFirst({
      where: {
        id: groupId,
        clubId,
      },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: "Court group not found" },
        { status: 404 }
      );
    }

    // Update the group
    const updatedGroup = await prisma.courtGroup.update({
      where: { id: groupId },
      data: {
        ...(name && { name: name.trim() }),
        ...(defaultPriceCents !== undefined && { defaultPriceCents }),
      },
      include: {
        courts: {
          select: {
            id: true,
            name: true,
            isActive: true,
            useGroupPricing: true,
          },
        },
        groupPriceRules: true,
      },
    });

    return NextResponse.json(updatedGroup);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating court group:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clubs/[clubId]/court-groups/[groupId]
 * 
 * Deletes a court group (sets all courts in group to individual pricing)
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id: clubId, groupId } = await context.params;

  // Check authorization for this club
  const authResult = await requireClubAdmin(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    // Verify group exists and belongs to this club
    const existingGroup = await prisma.courtGroup.findFirst({
      where: {
        id: groupId,
        clubId,
      },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: "Court group not found" },
        { status: 404 }
      );
    }

    // Update courts to use individual pricing before deleting group
    await prisma.court.updateMany({
      where: { groupId },
      data: {
        groupId: null,
        useGroupPricing: false,
      },
    });

    // Delete the group (price rules will cascade delete)
    await prisma.courtGroup.delete({
      where: { id: groupId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting court group:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
