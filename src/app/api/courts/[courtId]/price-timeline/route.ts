import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPriceTimelineForDay } from "@/lib/priceRules";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "date query parameter is required (YYYY-MM-DD format)" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Validate date is a valid date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    // Check if court exists
    const court = await prisma.court.findUnique({
      where: { id: courtId },
      select: { id: true, defaultPriceCents: true },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    // Get price timeline for the day
    const timeline = await getPriceTimelineForDay(courtId, date);

    return NextResponse.json({
      date,
      courtId,
      defaultPriceCents: court.defaultPriceCents,
      timeline,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching price timeline:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
