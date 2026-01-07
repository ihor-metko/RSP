/**
 * Slot blocking utility for WeeklyAvailabilityTimeline
 * 
 * @deprecated This function is currently used for testing the blocking logic only.
 * The actual blocking implementation in WeeklyAvailabilityTimeline is done inline
 * with timezone conversion to properly handle club timezones.
 * 
 * BLOCKING RULES (client-side):
 * - Past days: Any day before the current local date is blocked
 * - Today: Slots with slotStartHour < currentLocalHour are blocked
 * - Ongoing slots: If slotStartHour === currentLocalHour, the slot is ALLOWED (not blocked)
 *   This allows users to book slots that are currently in progress (e.g., 20:00 slot at 20:05)
 * 
 * NOTE: These rules are UI-only. Server-side booking endpoints MUST enforce the same
 * blocking logic independently. Do not rely on client-side blocking alone.
 * 
 * TODO: Backend developers - ensure booking API validates same blocking rules server-side
 */

export type BlockReason = "past_day" | "past_hour" | null;

export interface SlotBlockStatus {
  isBlocked: boolean;
  reason: BlockReason;
}

/**
 * Parse a YYYY-MM-DD date string into year, month, day components
 * This avoids timezone issues by not using Date constructor with string
 */
function parseDateComponents(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month: month - 1, day }; // month is 0-indexed for Date constructor
}

/**
 * Determine if a slot is blocked based on current time.
 * 
 * @param slotDate - The date string (YYYY-MM-DD) of the slot
 * @param slotHour - The start hour of the slot (0-23)
 * @param now - Current Date object (client browser time)
 * @returns Object with isBlocked boolean and reason ('past_day' | 'past_hour' | null)
 * 
 * Blocking logic:
 * - Past day: slot date < current date → blocked
 * - Same day, past hour: slotHour < currentHour → blocked  
 * - Same day, current hour: slotHour === currentHour → NOT blocked (ongoing slot allowed)
 * - Future hours/days: NOT blocked
 */
export function isSlotBlocked(
  slotDate: string,
  slotHour: number,
  now: Date
): SlotBlockStatus {
  // Parse slot date components to avoid timezone issues
  const { year: slotYear, month: slotMonth, day: slotDay } = parseDateComponents(slotDate);
  
  // Create date objects using explicit year/month/day (local timezone)
  const slotDateOnly = new Date(slotYear, slotMonth, slotDay);
  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Past day check
  if (slotDateOnly.getTime() < nowDateOnly.getTime()) {
    return { isBlocked: true, reason: "past_day" };
  }
  
  // Same day check - block only if slotHour < currentHour (strictly less)
  if (slotDateOnly.getTime() === nowDateOnly.getTime()) {
    const currentHour = now.getHours();
    if (slotHour < currentHour) {
      return { isBlocked: true, reason: "past_hour" };
    }
  }
  
  return { isBlocked: false, reason: null };
}
