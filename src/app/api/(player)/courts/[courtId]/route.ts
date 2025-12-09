import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
import { isMockMode } from "@/services/mockDb";
import { mockGetCourtById } from "@/services/mockApiHandlers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  try {
    const resolvedParams = await params;
    const courtId = resolvedParams.courtId;

    // TEMPORARY MOCK MODE — REMOVE WHEN DB IS FIXED
    if (isMockMode()) {
      const court = await mockGetCourtById(courtId);
      if (!court) {
        return NextResponse.json({ error: "Court not found" }, { status: 404 });
      }
      return NextResponse.json(court);
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        surface: true,
        indoor: true,
        defaultPriceCents: true,
        clubId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    return NextResponse.json(court);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching court:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
