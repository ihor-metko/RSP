import "./Badge.css";

export interface BadgeProps {
  /** Text content of the badge */
  children: React.ReactNode;
  /** Visual style variant */
  variant?: "default" | "success" | "warning" | "error" | "info" | "primary";
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
 */
export function Badge({
  children,
  variant = "default",
  size = "medium",
  icon,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`im-badge im-badge--${variant} im-badge--${size} ${className}`.trim()}
    >
      {icon && <span className="im-badge-icon">{icon}</span>}
      <span className="im-badge-text">{children}</span>
    </span>
  );
}
