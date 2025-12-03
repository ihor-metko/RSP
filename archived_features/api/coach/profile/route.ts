import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

/**
 * GET /api/coach/profile
 * Returns the coach profile for the authenticated user
 */
export async function GET(request: Request) {
  try {
    // Role check: Only coach and admin can access
    const authResult = await requireRole(request, ["coach", "super_admin"]);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Find the coach record for the authenticated user
    const coach = await prisma.coach.findFirst({
      where: { userId: authResult.userId },
      select: {
        id: true,
        userId: true,
        bio: true,
        phone: true,
        clubId: true,
        createdAt: true,
      },
    });

    if (!coach) {
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: coach.id,
      userId: coach.userId,
      bio: coach.bio,
      phone: coach.phone,
      clubId: coach.clubId,
      createdAt: coach.createdAt.toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching coach profile:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
