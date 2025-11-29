import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import {
  isValidTimeFormat,
  normalizeTime,
  findConflictingRule,
} from "@/lib/priceRules";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;

    // Check if court exists
    const court = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    const rules = await prisma.courtPriceRule.findMany({
      where: { courtId },
      orderBy: [{ date: "desc" }, { dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    // Format response
    const formattedRules = rules.map((rule) => ({
      id: rule.id,
      courtId: rule.courtId,
      dayOfWeek: rule.dayOfWeek,
      date: rule.date ? rule.date.toISOString().split("T")[0] : null,
      startTime: rule.startTime,
      endTime: rule.endTime,
      priceCents: rule.priceCents,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    }));

    return NextResponse.json({ rules: formattedRules });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching price rules:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courtId: string }> }
) {
  // Require admin role
  const authResult = await requireRole(request, ["admin"]);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;

    // Check if court exists
    const court = await prisma.court.findUnique({
      where: { id: courtId },
    });

    if (!court) {
      return NextResponse.json({ error: "Court not found" }, { status: 404 });
    }

    const body = await request.json();
    const { dayOfWeek, date, startTime, endTime, priceCents } = body;

    // Validate required fields
    if (!startTime || !endTime || priceCents === undefined) {
      return NextResponse.json(
        { error: "startTime, endTime, and priceCents are required" },
        { status: 400 }
      );
    }

    // Validate time format
    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM format (00:00-23:59)" },
        { status: 400 }
      );
    }

    const normalizedStartTime = normalizeTime(startTime);
    const normalizedEndTime = normalizeTime(endTime);

    // Validate startTime < endTime
    if (normalizedStartTime >= normalizedEndTime) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 }
      );
    }

    // Validate priceCents
    if (typeof priceCents !== "number" || priceCents < 0) {
      return NextResponse.json(
        { error: "priceCents must be a non-negative number" },
        { status: 400 }
      );
    }

    // Validate dayOfWeek XOR date (mutually exclusive)
    if (dayOfWeek !== undefined && dayOfWeek !== null && date) {
      return NextResponse.json(
        { error: "dayOfWeek and date are mutually exclusive. Provide only one." },
        { status: 400 }
      );
    }

    // Validate dayOfWeek range
    if (dayOfWeek !== undefined && dayOfWeek !== null) {
      if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: "dayOfWeek must be a number between 0 (Sunday) and 6 (Saturday)" },
          { status: 400 }
        );
      }
    }

    // Parse and validate date
    let parsedDate: Date | null = null;
    if (date) {
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD format" },
          { status: 400 }
        );
      }
    }

    // Check for overlapping rules
    const conflictingRule = await findConflictingRule(courtId, {
      dayOfWeek: dayOfWeek ?? null,
      date: parsedDate,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
    });

    if (conflictingRule) {
      return NextResponse.json(
        {
          error: `Time range conflicts with existing rule (${conflictingRule.startTime}-${conflictingRule.endTime})`,
        },
        { status: 409 }
      );
    }

    // Create the rule
    const rule = await prisma.courtPriceRule.create({
      data: {
        courtId,
        dayOfWeek: dayOfWeek ?? null,
        date: parsedDate,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        priceCents,
      },
    });

    return NextResponse.json(
      {
        id: rule.id,
        courtId: rule.courtId,
        dayOfWeek: rule.dayOfWeek,
        date: rule.date ? rule.date.toISOString().split("T")[0] : null,
        startTime: rule.startTime,
        endTime: rule.endTime,
        priceCents: rule.priceCents,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error creating price rule:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
