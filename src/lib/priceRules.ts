import { prisma } from "@/lib/prisma";
import type { PriceSegment } from "@/types/court";

// Re-export PriceSegment for backward compatibility
export type { PriceSegment };

/**
 * Parses a time string in "HH:MM" format to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to "HH:MM" format.
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Check if two time ranges overlap.
 * Ranges are [startA, endA) and [startB, endB) - start inclusive, end exclusive.
 */
export function timeRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const startAMins = timeToMinutes(startA);
  const endAMins = timeToMinutes(endA);
  const startBMins = timeToMinutes(startB);
  const endBMins = timeToMinutes(endB);

  // Overlap exists if: startA < endB && startB < endA
  return startAMins < endBMins && startBMins < endAMins;
}

/**
 * Validates time string is in "HH:MM" format and within 00:00-23:59.
 */
export function isValidTimeFormat(time: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
}

/**
 * Normalizes time to "HH:MM" format with leading zeros.
 */
export function normalizeTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Get the day of week (0-6, Sunday=0) from a date string.
 */
function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getDay();
}

/**
 * Get resolved price for a slot based on court price rules.
 * 
 * Resolution order:
 * 1. Find any CourtPriceRule with exact date that contains the slot
 * 2. Otherwise find rules with dayOfWeek matching the date's weekday
 * 3. If no rule found → fallback to court.defaultPriceCents
 * 
 * For slots spanning multiple price segments, computes total price as sum of
 * overlapping minutes × price rate per minute.
 * 
 * @param courtId - The court ID
 * @param date - Date string in YYYY-MM-DD format
 * @param startTime - Start time in "HH:MM" format
 * @param durationMinutes - Duration in minutes
 * @returns Price in cents
 */
export async function getResolvedPriceForSlot(
  courtId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<number> {
  // Fetch court for default price
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { defaultPriceCents: true },
  });

  if (!court) {
    throw new Error("Court not found");
  }

  // Calculate end time in minutes
  const startMins = timeToMinutes(normalizeTime(startTime));
  const endMins = startMins + durationMinutes;

  // Get price timeline for the day
  const timeline = await getPriceTimelineForDay(courtId, date);

  if (timeline.length === 0) {
    // No rules, use default price
    // Calculate price based on hourly rate
    const pricePerMinute = court.defaultPriceCents / 60;
    return Math.round(pricePerMinute * durationMinutes);
  }

  // Calculate total price by summing overlapping segments
  let totalPriceCents = 0;
  let remainingStart = startMins;
  const slotEnd = endMins;

  for (const segment of timeline) {
    const segmentStartMins = timeToMinutes(segment.start);
    const segmentEndMins = timeToMinutes(segment.end);

    // Check if this segment overlaps with our remaining slot
    if (remainingStart >= slotEnd) break;
    if (segmentEndMins <= remainingStart) continue;
    if (segmentStartMins >= slotEnd) break;

    // Calculate overlap
    const overlapStart = Math.max(remainingStart, segmentStartMins);
    const overlapEnd = Math.min(slotEnd, segmentEndMins);
    const overlapMinutes = overlapEnd - overlapStart;

    if (overlapMinutes > 0) {
      // Calculate price for this segment (hourly rate / 60 * minutes)
      const pricePerMinute = segment.priceCents / 60;
      totalPriceCents += pricePerMinute * overlapMinutes;
      remainingStart = overlapEnd;
    }
  }

  // If there's remaining time not covered by rules, use default price
  if (remainingStart < slotEnd) {
    const remainingMinutes = slotEnd - remainingStart;
    const pricePerMinute = court.defaultPriceCents / 60;
    totalPriceCents += pricePerMinute * remainingMinutes;
  }

  return Math.round(totalPriceCents);
}

/**
 * Helper to check if a rule applies to a given date.
 */
function ruleAppliesToDate(
  rule: {
    ruleType: string;
    dayOfWeek: number | null;
    date: Date | null;
    holidayId: string | null;
  },
  targetDate: Date,
  targetDayOfWeek: number,
  holidayDates: Set<string>
): boolean {
  const dateStr = targetDate.toISOString().split("T")[0];
  
  switch (rule.ruleType) {
    case "SPECIFIC_DATE":
      return rule.date !== null && rule.date.toISOString().split("T")[0] === dateStr;
    
    case "SPECIFIC_DAY":
      return rule.dayOfWeek === targetDayOfWeek;
    
    case "WEEKDAYS":
      // Monday (1) to Friday (5)
      return targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
    
    case "WEEKENDS":
      // Saturday (6) and Sunday (0)
      return targetDayOfWeek === 0 || targetDayOfWeek === 6;
    
    case "ALL_DAYS":
      return true;
    
    case "HOLIDAY":
      return holidayDates.has(dateStr);
    
    default:
      return false;
  }
}

/**
 * Get priority for a rule type (higher number = higher priority).
 */
function getRulePriority(ruleType: string): number {
  const priorities: Record<string, number> = {
    SPECIFIC_DATE: 6,  // Highest priority
    HOLIDAY: 5,
    SPECIFIC_DAY: 4,
    WEEKDAYS: 3,
    WEEKENDS: 2,
    ALL_DAYS: 1,      // Lowest priority
  };
  return priorities[ruleType] || 0;
}

/**
 * Helper to check if a rule is a valid holiday rule.
 */
function isValidHolidayRule(
  rule: { ruleType: string; holidayId: string | null },
  validHolidayIds: Set<string>
): boolean {
  return rule.ruleType !== "HOLIDAY" || (rule.holidayId !== null && validHolidayIds.has(rule.holidayId));
}

/**
 * Get price timeline for a day - returns list of time segments with resolved price.
 * Used for court page and club today preview.
 * 
 * Priority order: SPECIFIC_DATE > HOLIDAY > SPECIFIC_DAY > WEEKDAYS > WEEKENDS > ALL_DAYS
 * 
 * @param courtId - The court ID
 * @param date - Date string in YYYY-MM-DD format
 * @returns Array of price segments with start, end, and priceCents
 */
export async function getPriceTimelineForDay(
  courtId: string,
  date: string
): Promise<PriceSegment[]> {
  const dayOfWeek = getDayOfWeek(date);
  const dateObj = new Date(date);

  // Get court to access club for holidays
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { clubId: true },
  });

  if (!court) {
    return [];
  }

  // Fetch holidays for the club
  const holidays = await prisma.holidayDate.findMany({
    where: {
      clubId: court.clubId,
    },
  });

  // Filter holidays that match this date
  const matchingHolidays = holidays.filter((h) => {
    if (!h.recurring) {
      // Non-recurring: exact date match
      return h.date.toISOString().split("T")[0] === dateObj.toISOString().split("T")[0];
    } else {
      // Recurring: match month and day regardless of year
      return h.date.getMonth() === dateObj.getMonth() && h.date.getDate() === dateObj.getDate();
    }
  });

  // For matching holidays, use the target date string (not the original holiday date)
  const holidayDates = new Set<string>();
  const holidayIds = new Set<string>();
  matchingHolidays.forEach((h) => {
    holidayDates.add(dateObj.toISOString().split("T")[0]); // Use target date
    holidayIds.add(h.id);
  });

  // Fetch all rules for this court
  const allRules = await prisma.courtPriceRule.findMany({
    where: { courtId },
    orderBy: [{ startTime: "asc" }],
  });

  // Filter rules that apply to this date
  const applicableRules = allRules.filter((rule) =>
    ruleAppliesToDate(
      {
        ruleType: rule.ruleType,
        dayOfWeek: rule.dayOfWeek,
        date: rule.date,
        holidayId: rule.holidayId,
      },
      dateObj,
      dayOfWeek,
      holidayDates
    ) && isValidHolidayRule(rule, holidayIds)
  );

  if (applicableRules.length === 0) {
    return [];
  }

  // Sort by priority (higher priority first)
  const rulesByPriority = applicableRules.sort(
    (a, b) => getRulePriority(b.ruleType) - getRulePriority(a.ruleType)
  );

  // Build a timeline by processing rules in priority order
  const timeline: PriceSegment[] = [];
  const coveredRanges: Array<{ start: number; end: number }> = [];

  for (const rule of rulesByPriority) {
    const ruleStart = timeToMinutes(rule.startTime);
    const ruleEnd = timeToMinutes(rule.endTime);

    // Find uncovered portions of this rule's time range
    const uncoveredSegments = getUncoveredSegments(ruleStart, ruleEnd, coveredRanges);

    for (const segment of uncoveredSegments) {
      timeline.push({
        start: minutesToTime(segment.start),
        end: minutesToTime(segment.end),
        priceCents: rule.priceCents,
      });
      coveredRanges.push(segment);
    }
  }

  // Sort timeline by start time
  timeline.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

  // Merge contiguous segments with same price
  return mergeContiguousSegments(timeline);
}

/**
 * Get uncovered segments of a time range given already covered ranges.
 */
function getUncoveredSegments(
  start: number,
  end: number,
  coveredRanges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  if (coveredRanges.length === 0) {
    return [{ start, end }];
  }

  // Sort covered ranges by start time
  const sorted = [...coveredRanges].sort((a, b) => a.start - b.start);

  const uncovered: Array<{ start: number; end: number }> = [];
  let current = start;

  for (const range of sorted) {
    if (current >= end) break;

    if (range.end <= current) {
      // This covered range is entirely before our current position
      continue;
    }

    if (range.start > current) {
      // There's a gap before this covered range
      uncovered.push({
        start: current,
        end: Math.min(range.start, end),
      });
    }

    // Move current position past this covered range
    current = Math.max(current, range.end);
  }

  // Add any remaining uncovered portion
  if (current < end) {
    uncovered.push({ start: current, end });
  }

  return uncovered;
}

/**
 * Merge contiguous segments with the same price.
 */
function mergeContiguousSegments(segments: PriceSegment[]): PriceSegment[] {
  if (segments.length === 0) return [];

  const merged: PriceSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    if (
      current.priceCents === segment.priceCents &&
      current.end === segment.start
    ) {
      // Extend current segment
      current.end = segment.end;
    } else {
      merged.push(current);
      current = { ...segment };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Check if a new rule would conflict with existing rules for the same court/day/date.
 * 
 * @param courtId - The court ID
 * @param newRule - The new rule to check
 * @param excludeRuleId - Optional rule ID to exclude (for updates)
 * @returns Conflicting rule if found, null otherwise
 */
export async function findConflictingRule(
  courtId: string,
  newRule: {
    ruleType: string;
    dayOfWeek?: number | null;
    date?: Date | null;
    holidayId?: string | null;
    startTime: string;
    endTime: string;
  },
  excludeRuleId?: string
): Promise<{ id: string; startTime: string; endTime: string; ruleType: string } | null> {
  const whereClause: Record<string, unknown> = {
    courtId,
    ...(excludeRuleId && { NOT: { id: excludeRuleId } }),
  };

  // Match rules based on ruleType
  switch (newRule.ruleType) {
    case "SPECIFIC_DATE":
      whereClause.ruleType = "SPECIFIC_DATE";
      whereClause.date = newRule.date;
      break;
    
    case "SPECIFIC_DAY":
      whereClause.ruleType = "SPECIFIC_DAY";
      whereClause.dayOfWeek = newRule.dayOfWeek;
      break;
    
    case "WEEKDAYS":
      whereClause.ruleType = "WEEKDAYS";
      break;
    
    case "WEEKENDS":
      whereClause.ruleType = "WEEKENDS";
      break;
    
    case "ALL_DAYS":
      whereClause.ruleType = "ALL_DAYS";
      break;
    
    case "HOLIDAY":
      whereClause.ruleType = "HOLIDAY";
      whereClause.holidayId = newRule.holidayId;
      break;
    
    default:
      // Unknown rule type, check all rules
      break;
  }

  const existingRules = await prisma.courtPriceRule.findMany({
    where: whereClause,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      ruleType: true,
    },
  });

  for (const rule of existingRules) {
    if (timeRangesOverlap(newRule.startTime, newRule.endTime, rule.startTime, rule.endTime)) {
      return rule;
    }
  }

  return null;
}

/**
 * Get price breakdown for a slot spanning multiple price segments.
 * Returns detailed breakdown for display in UI.
 */
export async function getPriceBreakdown(
  courtId: string,
  date: string,
  startTime: string,
  durationMinutes: number
): Promise<{
  totalPriceCents: number;
  breakdown: Array<{ start: string; end: string; minutes: number; priceCents: number }>;
}> {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: { defaultPriceCents: true },
  });

  if (!court) {
    throw new Error("Court not found");
  }

  const startMins = timeToMinutes(normalizeTime(startTime));
  const endMins = startMins + durationMinutes;
  const timeline = await getPriceTimelineForDay(courtId, date);

  const breakdown: Array<{ start: string; end: string; minutes: number; priceCents: number }> = [];
  let totalPriceCents = 0;
  let remainingStart = startMins;
  const slotEnd = endMins;

  for (const segment of timeline) {
    const segmentStartMins = timeToMinutes(segment.start);
    const segmentEndMins = timeToMinutes(segment.end);

    if (remainingStart >= slotEnd) break;
    if (segmentEndMins <= remainingStart) continue;
    if (segmentStartMins >= slotEnd) break;

    const overlapStart = Math.max(remainingStart, segmentStartMins);
    const overlapEnd = Math.min(slotEnd, segmentEndMins);
    const overlapMinutes = overlapEnd - overlapStart;

    if (overlapMinutes > 0) {
      const pricePerMinute = segment.priceCents / 60;
      const segmentPrice = Math.round(pricePerMinute * overlapMinutes);
      
      breakdown.push({
        start: minutesToTime(overlapStart),
        end: minutesToTime(overlapEnd),
        minutes: overlapMinutes,
        priceCents: segmentPrice,
      });
      
      totalPriceCents += segmentPrice;
      remainingStart = overlapEnd;
    }
  }

  // Handle remaining time not covered by rules
  if (remainingStart < slotEnd) {
    const remainingMinutes = slotEnd - remainingStart;
    const pricePerMinute = court.defaultPriceCents / 60;
    const segmentPrice = Math.round(pricePerMinute * remainingMinutes);
    
    breakdown.push({
      start: minutesToTime(remainingStart),
      end: minutesToTime(slotEnd),
      minutes: remainingMinutes,
      priceCents: segmentPrice,
    });
    
    totalPriceCents += segmentPrice;
  }

  return { totalPriceCents, breakdown };
}
