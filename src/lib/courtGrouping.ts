import { prisma } from "@/lib/prisma";
import type { SportType } from "@prisma/client";

/**
 * Generate a human-readable name for a court group based on its attributes
 */
export function generateGroupName(
  surface: string | null,
  color: string | null,
  gameType: string | null,
  sportType: SportType
): string {
  const parts: string[] = [];
  
  if (surface) parts.push(surface);
  if (color) parts.push(color);
  if (gameType) parts.push(gameType);
  parts.push(sportType);
  
  return parts.join(" ");
}

/**
 * Find or create a court group for the given attributes
 * Returns the group ID
 */
export async function findOrCreateCourtGroup(
  clubId: string,
  surface: string | null,
  color: string | null,
  gameType: string | null,
  sportType: SportType,
  defaultPriceCents?: number
): Promise<string> {
  // Try to find existing group with matching attributes
  const existingGroup = await prisma.courtGroup.findUnique({
    where: {
      clubId_surface_color_gameType_sportType: {
        clubId,
        surface: surface || null,
        color: color || null,
        gameType: gameType || null,
        sportType,
      },
    },
  });

  if (existingGroup) {
    return existingGroup.id;
  }

  // Create new group if none exists
  const groupName = generateGroupName(surface, color, gameType, sportType);
  const newGroup = await prisma.courtGroup.create({
    data: {
      clubId,
      name: groupName,
      surface,
      color,
      gameType,
      sportType,
      defaultPriceCents: defaultPriceCents ?? 0,
    },
  });

  return newGroup.id;
}

/**
 * Assign a court to its appropriate group based on its attributes
 * If useGroupPricing is false, the court will not be assigned to a group
 */
export async function assignCourtToGroup(
  courtId: string,
  clubId: string,
  surface: string | null,
  color: string | null,
  gameType: string | null,
  sportType: SportType,
  useGroupPricing: boolean = true,
  defaultPriceCents?: number
): Promise<void> {
  if (!useGroupPricing) {
    // If not using group pricing, ensure court is not assigned to any group
    await prisma.court.update({
      where: { id: courtId },
      data: { groupId: null, useGroupPricing: false },
    });
    return;
  }

  // Find or create appropriate group
  const groupId = await findOrCreateCourtGroup(
    clubId,
    surface,
    color,
    gameType,
    sportType,
    defaultPriceCents
  );

  // Assign court to group
  await prisma.court.update({
    where: { id: courtId },
    data: { groupId, useGroupPricing: true },
  });
}

/**
 * Migrate existing courts to groups based on their attributes
 * This should be run once after deploying the grouping feature
 */
export async function migrateExistingCourtsToGroups(clubId?: string): Promise<void> {
  const whereClause = clubId ? { clubId } : {};
  
  const courts = await prisma.court.findMany({
    where: {
      ...whereClause,
      groupId: null, // Only migrate courts not yet in a group
    },
    select: {
      id: true,
      clubId: true,
      type: true,
      surface: true,
      gameType: true,
      sportType: true,
      defaultPriceCents: true,
    },
  });

  for (const court of courts) {
    await assignCourtToGroup(
      court.id,
      court.clubId,
      court.surface,
      court.type, // Using 'type' as color/type
      court.gameType,
      court.sportType,
      true,
      court.defaultPriceCents
    );
  }
}
