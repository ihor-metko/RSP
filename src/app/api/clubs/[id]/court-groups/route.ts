import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/requireRole";

/**
 * GET /api/clubs/[clubId]/court-groups
 * 
 * Returns all court groups for a specific club with their courts
 * 
 * Access: Club Admins for this club, Organization Admins for the parent org, Root Admins
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: clubId } = await context.params;

  // Check authorization for this club
  const authResult = await requireClubAdmin(clubId);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const groups = await prisma.courtGroup.findMany({
      where: { clubId },
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
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court groups:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
