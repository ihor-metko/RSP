import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { Roles } from "@/constants/roles";

export async function GET(request: Request) {
  const authResult = await requireRole(request, [Roles.SuperAdmin]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const coaches = await prisma.coach.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    return NextResponse.json(coaches);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching coaches:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
