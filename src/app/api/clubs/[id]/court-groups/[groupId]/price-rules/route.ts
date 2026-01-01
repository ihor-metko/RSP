import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/requireRole";

/**
 * GET /api/clubs/[clubId]/court-groups/[groupId]/price-rules
 * 
 * Returns all price rules for a court group
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
    // Verify group belongs to this club
    const group = await prisma.courtGroup.findFirst({
      where: {
        id: groupId,
        clubId,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Court group not found" },
        { status: 404 }
      );
    }

    const rules = await prisma.courtGroupPriceRule.findMany({
      where: { groupId },
      orderBy: [
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching group price rules:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clubs/[clubId]/court-groups/[groupId]/price-rules
 * 
 * Creates a new price rule for a court group
 */
export async function POST(
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
    const { dayOfWeek, date, startTime, endTime, priceCents } = body;

    // Verify group belongs to this club
    const group = await prisma.courtGroup.findFirst({
      where: {
        id: groupId,
        clubId,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Court group not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!startTime || !endTime || priceCents === undefined) {
      return NextResponse.json(
        { error: "startTime, endTime, and priceCents are required" },
        { status: 400 }
      );
    }

    // Create the price rule
    const rule = await prisma.courtGroupPriceRule.create({
      data: {
        groupId,
        dayOfWeek: dayOfWeek ?? null,
        date: date ? new Date(date) : null,
        startTime,
        endTime,
        priceCents,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating group price rule:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
