/**
 * Statistics Service
 * 
 * Provides functions for calculating and managing club statistics:
 * - Daily occupancy statistics
 * - Monthly aggregated statistics (lazy calculation)
 */

import { prisma } from "@/lib/prisma";

// Constants
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Calculate total available slots for a club on a given day
 * 
 * A slot is a 1-hour booking window. For each court, we calculate:
 * - Business hours for that day
 * - Number of 1-hour slots within those hours
 * 
 * @param clubId - The club ID
 * @param date - The date to calculate slots for
 * @returns Total number of available slots
 */
export async function calculateTotalSlots(
  clubId: string,
  date: Date
): Promise<number> {
  // Get all courts for the club
  const courts = await prisma.court.findMany({
    where: {
      clubId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (courts.length === 0) {
    return 0;
  }

  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = date.getDay();

  // Check for special hours first
  const specialHours = await prisma.clubSpecialHours.findUnique({
    where: {
      clubId_date: {
        clubId,
        date,
      },
    },
  });

  // If club is closed on this date
  if (specialHours?.isClosed) {
    return 0;
  }

  // Get business hours (special hours override regular hours)
  let openTime: string | null = null;
  let closeTime: string | null = null;

  if (specialHours && !specialHours.isClosed) {
    openTime = specialHours.openTime;
    closeTime = specialHours.closeTime;
  } else {
    // Get regular business hours for this day
    const businessHours = await prisma.clubBusinessHours.findUnique({
      where: {
        clubId_dayOfWeek: {
          clubId,
          dayOfWeek,
        },
      },
    });

    if (businessHours?.isClosed) {
      return 0;
    }

    openTime = businessHours?.openTime ?? null;
    closeTime = businessHours?.closeTime ?? null;
  }

  // If no hours defined or closed, return 0
  if (!openTime || !closeTime) {
    return 0;
  }

  // Calculate number of hours between open and close
  const [openHour, openMinute] = openTime.split(":").map(Number);
  const [closeHour, closeMinute] = closeTime.split(":").map(Number);

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  // Calculate total available hours (rounded down to full hours)
  const totalHours = Math.floor((closeMinutes - openMinutes) / 60);

  // Total slots = number of courts × number of hours
  const totalSlots = courts.length * totalHours;

  return totalSlots;
}

/**
 * Calculate booked slots for a club on a given day
 * 
 * Count all bookings that are not cancelled for the given date.
 * Each booking represents 1 slot per hour of duration.
 * 
 * @param clubId - The club ID
 * @param date - The date to count bookings for
 * @returns Number of booked slots
 */
export async function calculateBookedSlots(
  clubId: string,
  date: Date
): Promise<number> {
  // Set date range for the entire day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(0, 0, 0, 0);
  endOfDay.setDate(endOfDay.getDate() + 1); // Next day at midnight

  // Get all bookings for this club on this date
  const bookings = await prisma.booking.findMany({
    where: {
      court: {
        clubId,
      },
      start: {
        gte: startOfDay,
        lt: endOfDay, // Exclusive upper bound
      },
      // Don't count cancelled bookings
      bookingStatus: {
        not: "Cancelled",
      },
    },
    select: {
      start: true,
      end: true,
    },
  });

  // Calculate total booked hours
  let totalBookedHours = 0;
  for (const booking of bookings) {
    const durationMs = booking.end.getTime() - booking.start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    totalBookedHours += durationHours;
  }

  // Round to nearest whole number
  return Math.round(totalBookedHours);
}

/**
 * Calculate and store daily statistics for a specific club and date
 * 
 * This function:
 * 1. Calculates total available slots
 * 2. Calculates booked slots
 * 3. Calculates occupancy percentage
 * 4. Upserts the result to the database
 * 
 * @param clubId - The club ID
 * @param date - The date to calculate statistics for
 * @returns The created/updated daily statistics record
 */
export async function calculateAndStoreDailyStatistics(
  clubId: string,
  date: Date
) {
  const totalSlots = await calculateTotalSlots(clubId, date);
  const bookedSlots = await calculateBookedSlots(clubId, date);

  const occupancyPercentage =
    totalSlots > 0 ? (bookedSlots / totalSlots) * 100 : 0;

  // Normalize date to start of day
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  const statistics = await prisma.clubDailyStatistics.upsert({
    where: {
      clubId_date: {
        clubId,
        date: normalizedDate,
      },
    },
    update: {
      bookedSlots,
      totalSlots,
      occupancyPercentage,
    },
    create: {
      clubId,
      date: normalizedDate,
      bookedSlots,
      totalSlots,
      occupancyPercentage,
    },
  });

  return statistics;
}

/**
 * Calculate daily statistics for all clubs for a given date
 * 
 * This can be called from a cron job to update statistics daily.
 * 
 * @param date - The date to calculate statistics for (defaults to yesterday)
 * @returns Array of created/updated statistics
 */
export async function calculateDailyStatisticsForAllClubs(
  date: Date = new Date(Date.now() - MILLISECONDS_PER_DAY) // Default to yesterday
) {
  // Get all active clubs
  const clubs = await prisma.club.findMany({
    where: {
      status: "active",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const results = [];
  for (const club of clubs) {
    try {
      const stats = await calculateAndStoreDailyStatistics(club.id, date);
      results.push({
        clubId: club.id,
        clubName: club.name,
        success: true,
        statistics: stats,
      });
    } catch (error) {
      console.error(
        `Failed to calculate statistics for club ${club.id}:`,
        error
      );
      results.push({
        clubId: club.id,
        clubName: club.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Calculate average occupancy from daily statistics for a given month
 * 
 * @param clubId - The club ID
 * @param month - The month (1-12)
 * @param year - The year
 * @returns Average occupancy percentage for the month, or null if no data
 */
export async function calculateAverageOccupancyForMonth(
  clubId: string,
  month: number,
  year: number
): Promise<number | null> {
  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of the month

  const dailyStats = await prisma.clubDailyStatistics.findMany({
    where: {
      clubId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      occupancyPercentage: true,
    },
  });

  if (dailyStats.length === 0) {
    return null;
  }

  const sum = dailyStats.reduce(
    (acc, stat) => acc + stat.occupancyPercentage,
    0
  );
  return sum / dailyStats.length;
}

/**
 * Calculate and store monthly statistics with lazy calculation
 * 
 * This function implements the lazy calculation pattern:
 * 1. Check if monthly statistics already exist
 * 2. If yes, return existing data
 * 3. If no, calculate from daily statistics
 * 4. Store the result and return it
 * 
 * @param clubId - The club ID
 * @param month - The month (1-12)
 * @param year - The year
 * @returns Monthly statistics record
 */
export async function getOrCalculateMonthlyStatistics(
  clubId: string,
  month: number,
  year: number
) {
  // Check if statistics already exist
  const existingStats = await prisma.clubMonthlyStatistics.findUnique({
    where: {
      clubId_month_year: {
        clubId,
        month,
        year,
      },
    },
  });

  if (existingStats) {
    return existingStats;
  }

  // Calculate average occupancy for the current month
  const averageOccupancy = await calculateAverageOccupancyForMonth(
    clubId,
    month,
    year
  );

  if (averageOccupancy === null) {
    // No data available for this month
    return null;
  }

  // Calculate previous month's occupancy
  let previousMonth = month - 1;
  let previousYear = year;
  if (previousMonth === 0) {
    previousMonth = 12;
    previousYear = year - 1;
  }

  const previousMonthOccupancy = await calculateAverageOccupancyForMonth(
    clubId,
    previousMonth,
    previousYear
  );

  // Calculate occupancy change percentage
  let occupancyChangePercent: number | null = null;
  if (previousMonthOccupancy !== null) {
    if (previousMonthOccupancy > 0) {
      occupancyChangePercent =
        ((averageOccupancy - previousMonthOccupancy) / previousMonthOccupancy) *
        100;
    } else if (averageOccupancy > 0) {
      occupancyChangePercent = 100;
    } else {
      occupancyChangePercent = 0;
    }
  }

  // Store the calculated statistics
  const monthlyStats = await prisma.clubMonthlyStatistics.create({
    data: {
      clubId,
      month,
      year,
      averageOccupancy,
      previousMonthOccupancy,
      occupancyChangePercent,
    },
  });

  return monthlyStats;
}

/**
 * Get monthly statistics for all clubs in an organization (with lazy calculation)
 * 
 * @param organizationId - The organization ID
 * @param month - The month (1-12)
 * @param year - The year
 * @returns Array of monthly statistics for all clubs in the organization
 */
export async function getOrganizationMonthlyStatistics(
  organizationId: string,
  month: number,
  year: number
) {
  // Get all clubs in the organization
  const clubs = await prisma.club.findMany({
    where: {
      organizationId,
      status: "active",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const results = [];
  for (const club of clubs) {
    try {
      const stats = await getOrCalculateMonthlyStatistics(
        club.id,
        month,
        year
      );
      results.push({
        clubId: club.id,
        clubName: club.name,
        statistics: stats,
      });
    } catch (error) {
      console.error(
        `Failed to get monthly statistics for club ${club.id}:`,
        error
      );
      results.push({
        clubId: club.id,
        clubName: club.name,
        statistics: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}
