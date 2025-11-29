import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: {
        courts: {
          select: {
            id: true,
            name: true,
            type: true,
            surface: true,
            indoor: true,
            defaultPriceCents: true,
          },
        },
        coaches: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Transform coaches to include name from user
    const coaches = club.coaches.map((coach) => ({
      id: coach.id,
      name: coach.user.name || "Unknown Coach",
    }));

    return NextResponse.json({
      id: club.id,
      name: club.name,
      location: club.location,
      courts: club.courts,
      coaches,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
