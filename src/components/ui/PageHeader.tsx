import "./PageHeader.css";

export interface PageHeaderProps {
  /** Main page title (required) */
  title: string;
  /** Short subtitle or description (optional) */
  description?: string;
  /** Buttons or other interactive elements (optional) */
  actions?: React.ReactNode;
  /** Additional CSS classes for the container (optional) */
  className?: string;
}

/**
 * PageHeader Component
 *
 * A universal page header component for both player and admin pages.
 * Renders the page title, optional description, and optional action buttons.
 *
 * Features:
 * - Adapts to light and dark themes using CSS variables
 * - Responsive design for mobile and desktop layouts
 * - Uses semantic im-* CSS classes
 *
 * @example
 * // Basic usage with title only
 * <PageHeader title="Clubs" />
 *
 * @example
 * // With title and description
 * <PageHeader
 *   title="Admin - Clubs"
 *   description="Manage all padel clubs"
 * />
 *
 * @example
 * // With actions (buttons, links)
 * <PageHeader
 *   title="Bookings"
 *   description="View and manage your bookings"
 *   actions={
 *     <>
 *       <Button variant="outline">Export</Button>
 *       <Button>New Booking</Button>
 *     </>
 *   }
 * />
 */
export function PageHeader({
  title,
  description,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`im-page-header ${className}`.trim()}>
      <div className="im-page-header-content">
        <h1 className="im-title">{title}</h1>
        {description && <p className="im-description">{description}</p>}
      </div>
      {actions && <div className="im-actions">{actions}</div>}
    </header>
  );
}
