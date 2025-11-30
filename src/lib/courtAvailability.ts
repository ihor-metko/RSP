import { prisma } from "@/lib/prisma";

// Training session duration in minutes
const TRAINING_DURATION_MINUTES = 60;
// Number of suggestions to return
const MAX_SUGGESTIONS = 3;
// Business hours
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 22;

/**
 * Helper to convert time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper to convert minutes to HH:MM format
 * Only handles valid positive minutes values (0-1439 for 00:00-23:59)
 */
function minutesToTime(minutes: number): string {
  if (minutes < 0) {
    return "00:00";
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

export interface CourtAvailabilitySuggestion {
  date: string;
  time: string;
  courtId: string;
  courtName: string;
}

export interface AvailableCourtResult {
  courtId: string;
  courtName: string;
  defaultPriceCents: number;
}

/**
 * Find available courts for a given time slot at a club
 */
export async function findAvailableCourts(
  clubId: string,
  date: string,
  time: string,
  durationMinutes: number = TRAINING_DURATION_MINUTES
): Promise<AvailableCourtResult[]> {
  // Get all courts for this club
  const courts = await prisma.court.findMany({
    where: { clubId },
    select: { id: true, name: true, defaultPriceCents: true },
  });

  if (courts.length === 0) {
    return [];
  }

  // Calculate start and end times
  const startTime = new Date(`${date}T${time}:00.000Z`);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  // Find courts without overlapping bookings
  const availableCourts: AvailableCourtResult[] = [];

  for (const court of courts) {
    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        courtId: court.id,
        start: { lt: endTime },
        end: { gt: startTime },
        status: { in: ["reserved", "paid", "pending"] },
      },
    });

    if (!overlappingBooking) {
      availableCourts.push({
        courtId: court.id,
        courtName: court.name,
        defaultPriceCents: court.defaultPriceCents,
      });
    }
  }

  return availableCourts;
}

/**
 * Check if a court is available for a given time slot
 */
export async function isCourtAvailable(
  courtId: string,
  date: string,
  time: string,
  durationMinutes: number = TRAINING_DURATION_MINUTES,
  excludeBookingId?: string
): Promise<boolean> {
  const startTime = new Date(`${date}T${time}:00.000Z`);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  const whereClause: {
    courtId: string;
    start: { lt: Date };
    end: { gt: Date };
    status: { in: string[] };
    id?: { not: string };
  } = {
    courtId,
    start: { lt: endTime },
    end: { gt: startTime },
    status: { in: ["reserved", "paid", "pending"] },
  };

  if (excludeBookingId) {
    whereClause.id = { not: excludeBookingId };
  }

  const overlappingBooking = await prisma.booking.findFirst({
    where: whereClause,
  });

  return !overlappingBooking;
}

/**
 * Get alternative time slot suggestions when a requested slot is not available
 */
export async function getCourtAvailabilitySuggestions(
  clubId: string,
  trainerId: string,
  requestedDate: string,
  requestedTime: string,
  durationMinutes: number = TRAINING_DURATION_MINUTES
): Promise<CourtAvailabilitySuggestion[]> {
  const suggestions: CourtAvailabilitySuggestion[] = [];

  // Get trainer's weekly availability
  const trainer = await prisma.coach.findFirst({
    where: { id: trainerId },
    include: { weeklyAvailabilities: true },
  });

  if (!trainer) {
    return suggestions;
  }

  // Get all courts for this club
  const courts = await prisma.court.findMany({
    where: { clubId },
    select: { id: true, name: true },
  });

  if (courts.length === 0) {
    return suggestions;
  }

  // Check nearby time slots on the same day first
  const requestedDateObj = new Date(requestedDate);
  const requestedMinutes = timeToMinutes(requestedTime);
  const dayOfWeek = requestedDateObj.getDay();

  // Get trainer availability for this day
  const dayAvailability = trainer.weeklyAvailabilities.filter(
    (slot) => slot.dayOfWeek === dayOfWeek
  );

  if (dayAvailability.length > 0) {
    // Check slots before and after the requested time on the same day
    const timeOffsets = [30, -30, 60, -60, 90, -90, 120, -120]; // Check in 30-minute increments

    for (const offset of timeOffsets) {
      if (suggestions.length >= MAX_SUGGESTIONS) break;

      const newMinutes = requestedMinutes + offset;
      
      // Skip if newMinutes is negative or outside business hours
      if (newMinutes < 0) {
        continue;
      }
      
      const newTime = minutesToTime(newMinutes);
      
      // Skip if outside business hours
      const newEndMinutes = newMinutes + durationMinutes;
      if (newMinutes < BUSINESS_START_HOUR * 60 || newEndMinutes > BUSINESS_END_HOUR * 60) {
        continue;
      }

      // Check if trainer is available at this time
      const isTrainerAvailable = dayAvailability.some(
        (slot) => newTime >= slot.startTime && 
                  minutesToTime(newEndMinutes) <= slot.endTime
      );

      if (!isTrainerAvailable) {
        continue;
      }

      // Check if trainer has existing training at this time
      const existingTraining = await prisma.trainingRequest.findFirst({
        where: {
          trainerId,
          date: requestedDateObj,
          time: newTime,
          status: { in: ["pending", "confirmed"] },
        },
      });

      if (existingTraining) {
        continue;
      }

      // Check for available courts at this time
      const availableCourts = await findAvailableCourts(
        clubId,
        requestedDate,
        newTime,
        durationMinutes
      );

      if (availableCourts.length > 0) {
        suggestions.push({
          date: requestedDate,
          time: newTime,
          courtId: availableCourts[0].courtId,
          courtName: availableCourts[0].courtName,
        });
      }
    }
  }

  // If we still need more suggestions, check the next few days
  if (suggestions.length < MAX_SUGGESTIONS) {
    for (let dayOffset = 1; dayOffset <= 7 && suggestions.length < MAX_SUGGESTIONS; dayOffset++) {
      const nextDate = new Date(requestedDateObj);
      nextDate.setDate(nextDate.getDate() + dayOffset);
      const nextDateStr = nextDate.toISOString().split("T")[0];
      const nextDayOfWeek = nextDate.getDay();

      // Get trainer availability for this day
      const nextDayAvailability = trainer.weeklyAvailabilities.filter(
        (slot) => slot.dayOfWeek === nextDayOfWeek
      );

      if (nextDayAvailability.length === 0) {
        continue;
      }

      // Try the same time on this day, or find an available slot
      for (const slot of nextDayAvailability) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;

        // Try the requested time if it falls within this slot
        const slotStartMinutes = timeToMinutes(slot.startTime);
        const slotEndMinutes = timeToMinutes(slot.endTime);
        
        let timeToTry: string;
        if (requestedMinutes >= slotStartMinutes && 
            requestedMinutes + durationMinutes <= slotEndMinutes) {
          timeToTry = requestedTime;
        } else {
          timeToTry = slot.startTime;
        }

        // Check if trainer has existing training at this time
        const existingTraining = await prisma.trainingRequest.findFirst({
          where: {
            trainerId,
            date: nextDate,
            time: timeToTry,
            status: { in: ["pending", "confirmed"] },
          },
        });

        if (existingTraining) {
          continue;
        }

        // Check for available courts at this time
        const availableCourts = await findAvailableCourts(
          clubId,
          nextDateStr,
          timeToTry,
          durationMinutes
        );

        if (availableCourts.length > 0) {
          suggestions.push({
            date: nextDateStr,
            time: timeToTry,
            courtId: availableCourts[0].courtId,
            courtName: availableCourts[0].courtName,
          });
        }
      }
    }
  }

  return suggestions;
}
