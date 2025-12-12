/**
 * Entity Colors Constants
 * 
 * Centralized color definitions for all entities in the application.
 * These colors are used consistently across cards, badges, list items,
 * calendar blocks, and any other UI element representing an entity.
 * 
 * Color palette:
 * - organization: Blue (#3b82f6) - Professional, trustworthy
 * - club: Emerald (#10b981) - Growth, active community
 * - court: Amber (#f59e0b) - Action, energy
 * - booking: Red (#ef4444) - Important, attention-grabbing
 */

export const ENTITY_COLORS = {
  organization: "#3b82f6", // blue
  club: "#10b981",         // emerald
  court: "#f59e0b",        // amber
  booking: "#ef4444",      // red
} as const;

/**
 * CSS custom properties for entity colors
 * Use these in CSS files to reference entity colors
 */
export const ENTITY_COLOR_VARS = {
  organization: "var(--entity-color-organization)",
  club: "var(--entity-color-club)",
  court: "var(--entity-color-court)",
  booking: "var(--entity-color-booking)",
} as const;

/**
 * Helper function to get entity color by entity type
 */
export function getEntityColor(entityType: keyof typeof ENTITY_COLORS): string {
  return ENTITY_COLORS[entityType];
}

/**
 * Entity color variants for different UI states
 * Light and dark mode optimized
 */
export const ENTITY_COLOR_VARIANTS = {
  organization: {
    base: "#3b82f6",
    light: "#dbeafe",
    dark: "rgba(59, 130, 246, 0.15)",
    text: "#1e40af",
    textDark: "#93c5fd",
  },
  club: {
    base: "#10b981",
    light: "#d1fae5",
    dark: "rgba(16, 185, 129, 0.15)",
    text: "#065f46",
    textDark: "#6ee7b7",
  },
  court: {
    base: "#f59e0b",
    light: "#fef3c7",
    dark: "rgba(251, 191, 36, 0.15)",
    text: "#92400e",
    textDark: "#fde68a",
  },
  booking: {
    base: "#ef4444",
    light: "#fee2e2",
    dark: "rgba(239, 68, 68, 0.15)",
    text: "#991b1b",
    textDark: "#fca5a5",
  },
} as const;

/**
 * Type definitions for entity colors
 */
export type EntityType = keyof typeof ENTITY_COLORS;
export type EntityColorVariant = keyof typeof ENTITY_COLOR_VARIANTS["organization"];
