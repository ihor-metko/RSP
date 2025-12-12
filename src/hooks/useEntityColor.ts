import { useMemo } from "react";
import { ENTITY_COLOR_VARIANTS, type EntityType } from "@/constants/entityColors";

/**
 * Hook to get entity color and variants for a given entity type
 * 
 * @param entityType - The type of entity (organization, club, court, booking)
 * @returns Object containing base color and color variants for light/dark modes
 * 
 * @example
 * ```tsx
 * const { base, light, dark, text, textDark } = useEntityColor("club");
 * 
 * // Use in inline styles
 * <div style={{ borderColor: base }} />
 * 
 * // Use in class names (for CSS variables)
 * <div className="entity-badge-club" />
 * ```
 */
export function useEntityColor(entityType: EntityType) {
  return useMemo(() => {
    const variants = ENTITY_COLOR_VARIANTS[entityType];
    
    return {
      base: variants.base,
      light: variants.light,
      dark: variants.dark,
      text: variants.text,
      textDark: variants.textDark,
      // CSS variable references
      cssVar: `var(--entity-color-${entityType})`,
      cssVarLight: `var(--entity-color-${entityType}-light)`,
      cssVarText: `var(--entity-color-${entityType}-text)`,
      cssVarBorder: `var(--entity-color-${entityType}-border)`,
    };
  }, [entityType]);
}

/**
 * Hook to get CSS class names for entity-specific styling
 * 
 * @param entityType - The type of entity
 * @param variant - The variant type (badge, card, etc.)
 * @returns CSS class name for the entity
 * 
 * @example
 * ```tsx
 * const badgeClass = useEntityClassName("club", "badge");
 * <span className={badgeClass}>Club Badge</span>
 * 
 * const cardClass = useEntityClassName("organization", "card");
 * <div className={cardClass}>Organization Card</div>
 * ```
 */
export function useEntityClassName(
  entityType: EntityType,
  variant: "badge" | "card" = "badge"
): string {
  return useMemo(() => {
    return `entity-${variant}-${entityType}`;
  }, [entityType, variant]);
}

/**
 * Hook to get inline styles for entity colors
 * Useful for dynamic styling where CSS classes aren't available
 * 
 * @param entityType - The type of entity
 * @param mode - Light or dark mode (optional, defaults to system)
 * @returns CSS properties object for inline styles
 * 
 * @example
 * ```tsx
 * const styles = useEntityStyles("court");
 * <div style={styles.badge}>Court Badge</div>
 * ```
 */
export function useEntityStyles(entityType: EntityType) {
  const colors = useEntityColor(entityType);
  
  return useMemo(() => ({
    badge: {
      backgroundColor: colors.light,
      color: colors.text,
      border: `1px solid ${colors.base}`,
    },
    border: {
      borderColor: colors.base,
    },
    text: {
      color: colors.base,
    },
    background: {
      backgroundColor: colors.light,
    },
    accent: {
      borderLeftColor: colors.base,
      borderLeftWidth: "4px",
      borderLeftStyle: "solid",
    },
  }), [colors]);
}

/**
 * Get entity color directly (non-hook version for use outside React components)
 * Re-exported from entityColors.ts for convenience
 */
export { getEntityColor as getEntityColorValue } from "@/constants/entityColors";
