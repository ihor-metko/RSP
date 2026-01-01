import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCourtManagement } from "@/lib/requireRole";
import {
  isValidTimeFormat,
  normalizeTime,
  findConflictingRule,
} from "@/lib/priceRules";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courtId: string; ruleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courtId, ruleId } = resolvedParams;

    // Check if user has permission to manage this court
    const authResult = await requireCourtManagement(courtId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Check if rule exists and belongs to the court
    const existingRule = await prisma.courtPriceRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Price rule not found" }, { status: 404 });
    }

    if (existingRule.courtId !== courtId) {
      return NextResponse.json(
        { error: "Price rule does not belong to this court" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { ruleType, dayOfWeek, date, holidayId, startTime, endTime, priceCents } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Handle ruleType
    if (ruleType !== undefined) {
      const validRuleTypes = ["SPECIFIC_DAY", "SPECIFIC_DATE", "WEEKDAYS", "WEEKENDS", "ALL_DAYS", "HOLIDAY"];
      if (!validRuleTypes.includes(ruleType)) {
        return NextResponse.json(
          { error: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.ruleType = ruleType;
    }

    const effectiveRuleType = (updateData.ruleType as string) || existingRule.ruleType;

    // Handle time fields
    if (startTime !== undefined) {
      if (!isValidTimeFormat(startTime)) {
        return NextResponse.json(
          { error: "Invalid startTime format. Use HH:MM format (00:00-23:59)" },
          { status: 400 }
        );
      }
      updateData.startTime = normalizeTime(startTime);
    }

    if (endTime !== undefined) {
      if (!isValidTimeFormat(endTime)) {
        return NextResponse.json(
          { error: "Invalid endTime format. Use HH:MM format (00:00-23:59)" },
          { status: 400 }
        );
      }
      updateData.endTime = normalizeTime(endTime);
    }

    // Get effective times for validation
    const effectiveStartTime = (updateData.startTime as string) || existingRule.startTime;
    const effectiveEndTime = (updateData.endTime as string) || existingRule.endTime;

    // Validate startTime < endTime
    if (effectiveStartTime >= effectiveEndTime) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 }
      );
    }

    // Handle priceCents
    if (priceCents !== undefined) {
      if (typeof priceCents !== "number" || priceCents < 0) {
        return NextResponse.json(
          { error: "priceCents must be a non-negative number" },
          { status: 400 }
        );
      }
      updateData.priceCents = priceCents;
    }

    // Handle fields based on ruleType
    let effectiveDayOfWeek = existingRule.dayOfWeek;
    let effectiveDate = existingRule.date;
    let effectiveHolidayId = existingRule.holidayId;

    if (effectiveRuleType === "SPECIFIC_DAY") {
      if (dayOfWeek !== undefined) {
        if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
          return NextResponse.json(
            { error: "dayOfWeek must be a number between 0 (Sunday) and 6 (Saturday)" },
            { status: 400 }
          );
        }
        updateData.dayOfWeek = dayOfWeek;
        effectiveDayOfWeek = dayOfWeek;
      }
      updateData.date = null;
      updateData.holidayId = null;
    } else if (effectiveRuleType === "SPECIFIC_DATE") {
      if (date !== undefined) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format. Use YYYY-MM-DD format" },
            { status: 400 }
          );
        }
        updateData.date = parsedDate;
        effectiveDate = parsedDate;
      }
      updateData.dayOfWeek = null;
      updateData.holidayId = null;
    } else if (effectiveRuleType === "HOLIDAY") {
      if (holidayId !== undefined) {
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
        updateData.holidayId = holidayId;
        effectiveHolidayId = holidayId;
      }
      updateData.dayOfWeek = null;
      updateData.date = null;
    } else {
      // WEEKDAYS, WEEKENDS, ALL_DAYS
      updateData.dayOfWeek = null;
      updateData.date = null;
      updateData.holidayId = null;
    }

    // Check for overlapping rules (excluding current rule)
    const conflictingRule = await findConflictingRule(
      courtId,
      {
        ruleType: effectiveRuleType,
        dayOfWeek: effectiveDayOfWeek,
        date: effectiveDate,
        holidayId: effectiveHolidayId,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
      },
      ruleId
    );

    if (conflictingRule) {
      return NextResponse.json(
        {
          error: `Time range conflicts with existing ${conflictingRule.ruleType} rule (${conflictingRule.startTime}-${conflictingRule.endTime})`,
        },
        { status: 409 }
      );
    }

    // Update the rule
    const updatedRule = await prisma.courtPriceRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedRule.id,
      courtId: updatedRule.courtId,
      ruleType: updatedRule.ruleType,
      dayOfWeek: updatedRule.dayOfWeek,
      date: updatedRule.date ? updatedRule.date.toISOString().split("T")[0] : null,
      holidayId: updatedRule.holidayId,
      startTime: updatedRule.startTime,
      endTime: updatedRule.endTime,
      priceCents: updatedRule.priceCents,
      createdAt: updatedRule.createdAt.toISOString(),
      updatedAt: updatedRule.updatedAt.toISOString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error updating price rule:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courtId: string; ruleId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courtId, ruleId } = resolvedParams;

    // Check if user has permission to manage this court
    const authResult = await requireCourtManagement(courtId);
    if (!authResult.authorized) {
      return authResult.response;
    }

    // Check if rule exists and belongs to the court
    const existingRule = await prisma.courtPriceRule.findUnique({
      where: { id: ruleId },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Price rule not found" }, { status: 404 });
    }

    if (existingRule.courtId !== courtId) {
      return NextResponse.json(
        { error: "Price rule does not belong to this court" },
        { status: 404 }
      );
    }

    await prisma.courtPriceRule.delete({
      where: { id: ruleId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error deleting price rule:", error);
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
