import type { EntityType } from "@/constants/entityColors";
import "./Badge.css";

export interface BadgeProps {
  /** Text content of the badge */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary";
  /** Entity type for entity-specific colors */
  entityType?: EntityType;
  /** Size of the badge */
  size?: "small" | "medium";
  /** Optional icon to display before the text */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge Component
 *
 * A reusable badge/tag component for displaying status, roles, or labels.
 * Supports dark theme and follows im-* class conventions.
 *
 * @example
 * // Basic usage
 * <Badge>Default</Badge>
 *
 * @example
 * // With variant
 * <Badge variant="success">Active</Badge>
 *
 * @example
 * // With icon
 * <Badge variant="warning" icon={<WarningIcon />}>Pending</Badge>
 * 
 * @example
 * // With entity color
 * <Badge entityType="club">Club Badge</Badge>
 * <Badge entityType="organization">Organization Badge</Badge>
 */
export function Badge({
  children,
  variant = "default",
  entityType,
  size = "medium",
  icon,
  className = "",
}: BadgeProps) {
  // Build class name based on entity type or variant
  // Note: We use a static class name pattern instead of the hook to avoid conditional hook calls
  const badgeClasses = entityType
    ? `im-badge entity-badge-${entityType} im-badge--${size} ${className}`.trim()
    : `im-badge im-badge--${variant} im-badge--${size} ${className}`.trim();
  
  return (
    <span className={badgeClasses}>
      {icon && <span className="im-badge-icon">{icon}</span>}
      <span className="im-badge-text">{children}</span>
    </span>
  );
}
