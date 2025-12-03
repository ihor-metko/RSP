import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/requireRole";
import { ADMIN_ROLES } from "@/constants/roles";
import {
  isValidTimeFormat,
  normalizeTime,
  findConflictingRule,
} from "@/lib/priceRules";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courtId: string; ruleId: string }> }
) {
  // Require admin role
  const authResult = await requireRole(request, ADMIN_ROLES);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { courtId, ruleId } = resolvedParams;

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
    const { dayOfWeek, date, startTime, endTime, priceCents } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

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

    // Handle dayOfWeek and date
    let effectiveDayOfWeek = existingRule.dayOfWeek;
    let effectiveDate = existingRule.date;

    if (dayOfWeek !== undefined || date !== undefined) {
      // Check for mutual exclusivity
      const newDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : existingRule.dayOfWeek;
      const newDate = date !== undefined ? date : (existingRule.date ? existingRule.date.toISOString().split("T")[0] : null);

      if (newDayOfWeek !== null && newDate) {
        return NextResponse.json(
          { error: "dayOfWeek and date are mutually exclusive. Provide only one." },
          { status: 400 }
        );
      }

      if (dayOfWeek !== undefined) {
        if (dayOfWeek !== null && (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6)) {
          return NextResponse.json(
            { error: "dayOfWeek must be null or a number between 0 (Sunday) and 6 (Saturday)" },
            { status: 400 }
          );
        }
        updateData.dayOfWeek = dayOfWeek;
        effectiveDayOfWeek = dayOfWeek;
      }

      if (date !== undefined) {
        if (date === null) {
          updateData.date = null;
          effectiveDate = null;
        } else {
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
      }
    }

    // Check for overlapping rules (excluding current rule)
    const conflictingRule = await findConflictingRule(
      courtId,
      {
        dayOfWeek: effectiveDayOfWeek,
        date: effectiveDate,
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
      },
      ruleId
    );

    if (conflictingRule) {
      return NextResponse.json(
        {
          error: `Time range conflicts with existing rule (${conflictingRule.startTime}-${conflictingRule.endTime})`,
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
      dayOfWeek: updatedRule.dayOfWeek,
      date: updatedRule.date ? updatedRule.date.toISOString().split("T")[0] : null,
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
  // Require admin role
  const authResult = await requireRole(request, ADMIN_ROLES);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const resolvedParams = await params;
    const { courtId, ruleId } = resolvedParams;

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
