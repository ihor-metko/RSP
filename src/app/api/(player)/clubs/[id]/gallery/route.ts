import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check if club exists and is public
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        isPublic: true,
        organization: {
          select: {
            isPublic: true,
          },
        },
      },
    });

    if (!club || !club.isPublic || !club.organization?.isPublic) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Fetch gallery images
    const gallery = await prisma.clubGallery.findMany({
      where: { clubId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        imageUrl: true,
        altText: true,
        sortOrder: true,
      },
    });

    return NextResponse.json({ gallery });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching club gallery:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
