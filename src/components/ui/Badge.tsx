import "./Badge.css";

interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Badge variant */
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "outline";
  /** Badge size */
  size?: "small" | "medium";
  /** Show a status dot indicator */
  dot?: boolean;
  /** Dot color (uses variant color by default) */
  dotColor?: "success" | "warning" | "danger" | "info" | "neutral";
  /** Icon to display before the text */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge Component
 *
 * A reusable badge/tag component for displaying status, roles, labels, etc.
 * Supports multiple variants, sizes, and optional status dot indicators.
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
 * // With status dot
 * <Badge variant="success" dot>Online</Badge>
 *
 * @example
 * // With icon
 * <Badge variant="primary" icon={<UserIcon />}>Admin</Badge>
 */
export function Badge({
  children,
  variant = "default",
  size = "medium",
  dot = false,
  dotColor,
  icon,
  className = "",
}: BadgeProps) {
  const variantClass = `im-badge--${variant}`;
  const sizeClass = size === "small" ? "im-badge--small" : "";
  const actualDotColor = dotColor || (variant !== "default" && variant !== "outline" ? variant : "neutral");

  return (
    <span className={`im-badge ${variantClass} ${sizeClass} ${className}`.trim()}>
      {dot && (
        <span
          className={`im-badge-dot im-badge-dot--${actualDotColor}`}
          aria-hidden="true"
        />
      )}
      {icon && (
        <span className="im-badge-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="im-badge-text">{children}</span>
    </span>
  );
}
