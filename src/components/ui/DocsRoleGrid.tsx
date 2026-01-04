import { DocsRoleCard, DocsRoleCardProps } from "./DocsRoleCard";

export interface DocsRoleGridProps {
  /** Array of role cards to display */
  roles: DocsRoleCardProps[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsRoleGrid Component
 *
 * A responsive grid container for displaying multiple DocsRoleCard components.
 * Automatically wraps cards based on available space.
 * Uses im-docs-role-grid semantic class.
 *
 * @example
 * <DocsRoleGrid
 *   roles={[
 *     {
 *       name: "Root Admin",
 *       description: "Manage the entire system",
 *       href: "/docs/pre-sales/root-admin/overview",
 *       icon: "👑"
 *     },
 *     {
 *       name: "Club Owner",
 *       description: "Manage your club",
 *       href: "/docs/pre-sales/club-owner/crud-courts",
 *       icon: "🎾"
 *     }
 *   ]}
 * />
 */
export function DocsRoleGrid({ roles, className = "" }: DocsRoleGridProps) {
  return (
    <div className={`im-docs-role-grid ${className}`.trim()}>
      {roles.map((role) => (
        <DocsRoleCard key={role.href} {...role} />
      ))}
    </div>
  );
}
