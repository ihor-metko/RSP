import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCourtManagement } from "@/lib/requireRole";
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
      ruleType: rule.ruleType,
      dayOfWeek: rule.dayOfWeek,
      date: rule.date ? rule.date.toISOString().split("T")[0] : null,
      holidayId: rule.holidayId,
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
  try {
    const resolvedParams = await params;
    const { courtId } = resolvedParams;

    // Check if user has permission to manage this court
    const authResult = await requireCourtManagement(courtId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const { ruleType, dayOfWeek, date, holidayId, startTime, endTime, priceCents } = body;

    // Validate required fields
    if (!ruleType || !startTime || !endTime || priceCents === undefined) {
      return NextResponse.json(
        { error: "ruleType, startTime, endTime, and priceCents are required" },
        { status: 400 }
      );
    }

    // Validate ruleType
    const validRuleTypes = ["SPECIFIC_DAY", "SPECIFIC_DATE", "WEEKDAYS", "WEEKENDS", "ALL_DAYS", "HOLIDAY"];
    if (!validRuleTypes.includes(ruleType)) {
      return NextResponse.json(
        { error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}` },
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

    // Validate fields based on ruleType
    let parsedDate: Date | null = null;
    
    if (ruleType === "SPECIFIC_DAY") {
      if (dayOfWeek === undefined || dayOfWeek === null) {
        return NextResponse.json(
          { error: "dayOfWeek is required for SPECIFIC_DAY rules" },
          { status: 400 }
        );
      }
      if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: "dayOfWeek must be a number between 0 (Sunday) and 6 (Saturday)" },
          { status: 400 }
        );
      }
    } else if (ruleType === "SPECIFIC_DATE") {
      if (!date) {
        return NextResponse.json(
          { error: "date is required for SPECIFIC_DATE rules" },
          { status: 400 }
        );
      }
      parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD format" },
          { status: 400 }
        );
      }
    } else if (ruleType === "HOLIDAY") {
      if (!holidayId) {
        return NextResponse.json(
          { error: "holidayId is required for HOLIDAY rules" },
          { status: 400 }
        );
      }
      // Verify holiday exists
      const holiday = await prisma.holidayDate.findUnique({
        where: { id: holidayId },
      });
      if (!holiday) {
        return NextResponse.json(
          { error: "Holiday not found" },
          { status: 404 }
        );
      }
    }

    // Check for overlapping rules
    const conflictingRule = await findConflictingRule(courtId, {
      ruleType,
      dayOfWeek: ruleType === "SPECIFIC_DAY" ? dayOfWeek : null,
      date: parsedDate,
      holidayId: ruleType === "HOLIDAY" ? holidayId : null,
      startTime: normalizedStartTime,
      endTime: normalizedEndTime,
    });

    if (conflictingRule) {
      return NextResponse.json(
        {
          error: `Time range conflicts with existing ${conflictingRule.ruleType} rule (${conflictingRule.startTime}-${conflictingRule.endTime})`,
        },
        { status: 409 }
      );
    }

    // Create the rule
    const rule = await prisma.courtPriceRule.create({
      data: {
        courtId,
        ruleType,
        dayOfWeek: ruleType === "SPECIFIC_DAY" ? dayOfWeek : null,
        date: parsedDate,
        holidayId: ruleType === "HOLIDAY" ? holidayId : null,
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        priceCents,
      },
    });

    return NextResponse.json(
      {
        id: rule.id,
        courtId: rule.courtId,
        ruleType: rule.ruleType,
        dayOfWeek: rule.dayOfWeek,
        date: rule.date ? rule.date.toISOString().split("T")[0] : null,
        holidayId: rule.holidayId,
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
