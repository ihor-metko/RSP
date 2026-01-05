import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface CourtTypesResponse {
  availableTypes: ("SINGLE" | "DOUBLE")[];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const clubId = resolvedParams.id;

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        courts: {
          where: {
            isPublished: true, // Only consider published courts
          },
          select: {
            courtFormat: true,
          },
        },
      },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Extract unique court formats (SINGLE/DOUBLE)
    const courtTypes = new Set<"SINGLE" | "DOUBLE">();
    
    for (const court of club.courts) {
      if (court.courtFormat === "SINGLE" || court.courtFormat === "DOUBLE") {
        courtTypes.add(court.courtFormat);
      }
    }

    const response: CourtTypesResponse = {
      availableTypes: Array.from(courtTypes).sort(), // Sort for consistency
    };

    return NextResponse.json(response);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court types:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
