import { IMLink } from "./IMLink";
import "./DocsRoleCard.css";

export interface DocsRoleCardProps {
  /** Role name to display */
  name: string;
  /** Role description */
  description: string;
  /** Link to the role documentation */
  href: string;
  /** Optional icon or emoji for the role */
  icon?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsRoleCard Component
 *
 * A card component for displaying user roles in the pre-sales documentation.
 * Used to navigate between different role-specific documentation sections.
 * Uses im-docs-role-card semantic classes.
 *
 * @example
 * <DocsRoleCard
 *   name="Root Admin"
 *   description="Manage organizations and system settings"
 *   href="/docs/pre-sales/root-admin/overview"
 *   icon="👑"
 * />
 */
export function DocsRoleCard({
  name,
  description,
  href,
  icon,
  className = "",
}: DocsRoleCardProps) {
  return (
    <IMLink
      href={href}
      className={`im-docs-role-card ${className}`.trim()}
    >
      {icon && <span className="im-docs-role-card-icon">{icon}</span>}
      <h3 className="im-docs-role-card-title">{name}</h3>
      <p className="im-docs-role-card-description">{description}</p>
    </IMLink>
  );
}
