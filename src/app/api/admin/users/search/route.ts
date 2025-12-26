import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyAdmin } from "@/lib/requireRole";

/**
 * GET /api/admin/users/search
 * Search for users by email
 * 
 * Required permissions:
 * - ROOT_ADMIN, ORGANIZATION_ADMIN, or CLUB_ADMIN
 * 
 * Query params:
 * - email: string (required) - Email to search for
 */
export async function GET(request: Request) {
  const authResult = await requireAnyAdmin(request);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    // Search for users with email containing the query (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: email.toLowerCase(),
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10, // Limit results to 10
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error searching users:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
