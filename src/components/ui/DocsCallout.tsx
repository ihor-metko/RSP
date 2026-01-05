import "./DocsCallout.css";

export interface DocsCalloutProps {
  /** Callout title */
  title?: string;
  /** Callout content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsCallout Component
 *
 * Highlighted callout box for emphasizing key points, benefits, or important information.
 * Uses im-docs-callout semantic classes.
 *
 * @example
 * <DocsCallout title="Key Benefit">
 *   This feature saves you hours of manual work every week.
 * </DocsCallout>
 *
 * @example
 * <DocsCallout>
 *   Important information without a title.
 * </DocsCallout>
 */
export function DocsCallout({
  title,
  children,
  className = "",
}: DocsCalloutProps) {
  return (
    <div className={`im-docs-callout ${className}`.trim()}>
      {title && <div className="im-docs-callout-title">{title}</div>}
      <div className="im-docs-callout-content">{children}</div>
    </div>
  );
}
