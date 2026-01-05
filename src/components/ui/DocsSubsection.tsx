import "./DocsSubsection.css";

export interface DocsSubsectionProps {
  /** The title of the subsection */
  title: string;
  /** Subsection content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DocsSubsection Component
 *
 * Represents a subsection within a DocsSection on a documentation page.
 * Provides consistent hierarchy with im-docs-subsection classes.
 *
 * @example
 * <DocsSection title="Main Topic">
 *   <p>Introduction to the topic...</p>
 *   
 *   <DocsSubsection title="Subtopic 1">
 *     <p>Details about subtopic 1...</p>
 *   </DocsSubsection>
 *   
 *   <DocsSubsection title="Subtopic 2">
 *     <p>Details about subtopic 2...</p>
 *   </DocsSubsection>
 * </DocsSection>
 */
export function DocsSubsection({
  title,
  children,
  className = "",
}: DocsSubsectionProps) {
  return (
    <div className={`im-docs-subsection ${className}`.trim()}>
      <h3 className="im-docs-subsection-title">{title}</h3>
      <div className="im-docs-subsection-content">{children}</div>
    </div>
  );
}
