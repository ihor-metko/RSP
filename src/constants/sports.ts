/**
 * Sport configurations for the platform.
 * Defines sport-specific settings like slot durations, player limits, and booking rules.
 */

/**
 * Available sport types
 */
export enum SportType {
  PADEL = "PADEL",
  TENNIS = "TENNIS",
  PICKLEBALL = "PICKLEBALL",
  SQUASH = "SQUASH",
  BADMINTON = "BADMINTON",
}

/**
 * Configuration for a specific sport
 */
export interface SportConfig {
  /** Sport type identifier */
  type: SportType;
  /** Display name for the sport */
  name: string;
  /** Default slot duration in minutes */
  defaultSlotDuration: number;
  /** Available slot durations in minutes */
  availableSlotDurations: number[];
  /** Minimum number of players */
  minPlayers: number;
  /** Maximum number of players */
  maxPlayers: number;
  /** Typical number of players (for display) */
  typicalPlayers: number;
  /** Whether advance booking is required */
  requiresAdvanceBooking: boolean;
  /** Maximum days in advance that bookings can be made */
  maxAdvanceBookingDays: number;
  /** Minimum booking duration in minutes */
  minBookingDuration: number;
  /** Maximum booking duration in minutes */
  maxBookingDuration: number;
  /** Whether coaching is available for this sport */
  coachingAvailable: boolean;
  /** Default court surface types */
  defaultSurfaceTypes: string[];
}

/**
 * Padel configuration - current default sport
 */
export const PADEL_CONFIG: SportConfig = {
  type: SportType.PADEL,
  name: "Padel",
  defaultSlotDuration: 90, // 1.5 hours
  availableSlotDurations: [60, 90, 120], // 1h, 1.5h, 2h
  minPlayers: 2,
  maxPlayers: 4,
  typicalPlayers: 4, // Doubles is typical
  requiresAdvanceBooking: false,
  maxAdvanceBookingDays: 30,
  minBookingDuration: 60,
  maxBookingDuration: 180,
  coachingAvailable: true,
  defaultSurfaceTypes: ["Glass", "Concrete", "Artificial Grass"],
};

/**
 * Tennis configuration - skeleton for future implementation
 */
export const TENNIS_CONFIG: SportConfig = {
  type: SportType.TENNIS,
  name: "Tennis",
  defaultSlotDuration: 60,
  availableSlotDurations: [60, 90, 120],
  minPlayers: 2,
  maxPlayers: 4,
  typicalPlayers: 2, // Singles is typical
  requiresAdvanceBooking: false,
  maxAdvanceBookingDays: 30,
  minBookingDuration: 60,
  maxBookingDuration: 180,
  coachingAvailable: true,
  defaultSurfaceTypes: ["Hard", "Clay", "Grass", "Carpet"],
};

/**
 * Pickleball configuration - skeleton for future implementation
 */
export const PICKLEBALL_CONFIG: SportConfig = {
  type: SportType.PICKLEBALL,
  name: "Pickleball",
  defaultSlotDuration: 60,
  availableSlotDurations: [60, 90, 120],
  minPlayers: 2,
  maxPlayers: 4,
  typicalPlayers: 4, // Doubles is typical
  requiresAdvanceBooking: false,
  maxAdvanceBookingDays: 30,
  minBookingDuration: 60,
  maxBookingDuration: 120,
  coachingAvailable: true,
  defaultSurfaceTypes: ["Hard", "Composite"],
};

/**
 * Squash configuration - skeleton for future implementation
 */
export const SQUASH_CONFIG: SportConfig = {
  type: SportType.SQUASH,
  name: "Squash",
  defaultSlotDuration: 45,
  availableSlotDurations: [45, 60, 90],
  minPlayers: 2,
  maxPlayers: 2,
  typicalPlayers: 2, // Singles only
  requiresAdvanceBooking: false,
  maxAdvanceBookingDays: 30,
  minBookingDuration: 45,
  maxBookingDuration: 90,
  coachingAvailable: true,
  defaultSurfaceTypes: ["Standard"],
};

/**
 * Badminton configuration - skeleton for future implementation
 */
export const BADMINTON_CONFIG: SportConfig = {
  type: SportType.BADMINTON,
  name: "Badminton",
  defaultSlotDuration: 60,
  availableSlotDurations: [60, 90, 120],
  minPlayers: 2,
  maxPlayers: 4,
  typicalPlayers: 2, // Singles is typical
  requiresAdvanceBooking: false,
  maxAdvanceBookingDays: 30,
  minBookingDuration: 60,
  maxBookingDuration: 120,
  coachingAvailable: true,
  defaultSurfaceTypes: ["Synthetic", "Wood"],
};

/**
 * Map of all sport configurations
 */
export const SPORT_CONFIGS: Record<SportType, SportConfig> = {
  [SportType.PADEL]: PADEL_CONFIG,
  [SportType.TENNIS]: TENNIS_CONFIG,
  [SportType.PICKLEBALL]: PICKLEBALL_CONFIG,
  [SportType.SQUASH]: SQUASH_CONFIG,
  [SportType.BADMINTON]: BADMINTON_CONFIG,
};

/**
 * Get configuration for a specific sport
 */
export function getSportConfig(sportType: SportType): SportConfig {
  return SPORT_CONFIGS[sportType];
}

/**
 * Get all available sports
 */
export function getAllSports(): SportConfig[] {
  return Object.values(SPORT_CONFIGS);
}

/**
 * Get sport name by type
 */
export function getSportName(sportType: SportType): string {
  return SPORT_CONFIGS[sportType]?.name || sportType;
}

/**
 * Validate if a sport type is supported
 */
export function isSupportedSport(sportType: string): sportType is SportType {
  return Object.values(SportType).includes(sportType as SportType);
}

/**
 * Default sport type for the platform
 */
export const DEFAULT_SPORT_TYPE = SportType.PADEL;

/**
 * List of all sport types for select dropdowns
 */
export const SPORT_TYPE_OPTIONS = Object.values(SportType).map((type) => ({
  value: type,
  label: getSportName(type),
}));
