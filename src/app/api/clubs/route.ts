import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";

export async function GET(request: Request) {
  const authResult = await requireRole(request, ["player"]);

  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const clubs = await prisma.club.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        location: true,
        contactInfo: true,
        openingHours: true,
        logo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(clubs);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching clubs:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
