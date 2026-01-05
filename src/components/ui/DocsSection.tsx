import "./DocsSection.css";

export interface DocsSectionProps {
  /** The title of the section */
  title: string;
  /** Section content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsSection Component
 *
 * Represents a section on a documentation page.
 * Adds proper spacing and typography with im-docs-section classes.
 *
 * @example
 * <DocsSection title="Overview">
 *   <p>This section covers the basics...</p>
 * </DocsSection>
 */
export function DocsSection({
  title,
  children,
  className = "",
}: DocsSectionProps) {
  return (
    <section className={`im-docs-section ${className}`.trim()}>
      <h2 className="im-docs-section-title">{title}</h2>
      <div className="im-docs-section-content">{children}</div>
    </section>
  );
}
