"use client";

import "./Badge.css";

export type BadgeVariant = 
  | "default" 
  | "primary" 
  | "success" 
  | "warning" 
  | "danger" 
  | "info"
  | "root_admin"
  | "organization_admin"
  | "club_admin"
  | "user"
  | "active"
  | "blocked";

export interface BadgeProps {
  /** The variant/style of the badge */
  variant?: BadgeVariant;
  /** The content of the badge */
  children: React.ReactNode;
  /** Optional icon to display before the text */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for the badge */
  "aria-label"?: string;
}

/**
 * Badge Component
 * 
 * A reusable badge component for displaying status, roles, or labels.
 * Supports various variants for different semantic meanings.
 * 
 * @example
 * // Basic usage
 * <Badge variant="success">Active</Badge>
 * 
 * @example
 * // With icon
 * <Badge variant="danger" icon={<AlertIcon />}>Blocked</Badge>
 */
export function Badge({
  variant = "default",
  children,
  icon,
  className = "",
  "aria-label": ariaLabel,
}: BadgeProps) {
  return (
    <span
      className={`im-badge im-badge--${variant} ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
    >
      {icon && <span className="im-badge-icon" aria-hidden="true">{icon}</span>}
      <span className="im-badge-text">{children}</span>
    </span>
  );
}
