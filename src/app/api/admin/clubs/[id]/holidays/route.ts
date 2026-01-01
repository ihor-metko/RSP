import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClubManagement } from "@/lib/requireRole";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: clubId } = resolvedParams;

    const holidays = await prisma.holidayDate.findMany({
      where: { clubId },
      orderBy: { date: "asc" },
    });

    const formattedHolidays = holidays.map((holiday) => ({
      id: holiday.id,
      clubId: holiday.clubId,
      name: holiday.name,
      date: holiday.date.toISOString().split("T")[0],
      recurring: holiday.recurring,
      description: holiday.description,
      createdAt: holiday.createdAt.toISOString(),
      updatedAt: holiday.updatedAt.toISOString(),
    }));

    return NextResponse.json({ holidays: formattedHolidays });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching holidays:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: clubId } = resolvedParams;

    // Check if user has permission to manage this club
    const authResult = await requireClubManagement(clubId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { name, date, recurring, description } = body;

    // Validate required fields
    if (!name || !date) {
      return NextResponse.json(
        { error: "name and date are required" },
        { status: 400 }
      );
    }

    // Parse and validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // Create the holiday
    const holiday = await prisma.holidayDate.create({
      data: {
        clubId,
        name,
        date: parsedDate,
        recurring: recurring ?? false,
        description: description ?? null,
      },
    });

    return NextResponse.json(
      {
        id: holiday.id,
        clubId: holiday.clubId,
        name: holiday.name,
        date: holiday.date.toISOString().split("T")[0],
        recurring: holiday.recurring,
        description: holiday.description,
        createdAt: holiday.createdAt.toISOString(),
        updatedAt: holiday.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating holiday:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
